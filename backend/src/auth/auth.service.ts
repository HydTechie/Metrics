import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { Model } from 'mongoose';
import { OtpChallenge } from './otp-challenge.schema';
import { TotpUse } from './totp-use.schema';
import { Role } from './auth.guard';

const CODE_TTL_MS = 5 * 60_000;
const RESEND_INTERVAL_MS = 60_000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(OtpChallenge.name) private readonly challenges: Model<OtpChallenge>,
    @InjectModel(TotpUse.name) private readonly totpUses: Model<TotpUse>,
  ) {}

  async requestCode(rawPhone: string) {
    const phone = this.normalizePhone(rawPhone);
    const role = this.staffUsers().get(phone);
    const devMode = process.env.NODE_ENV !== 'production' && (process.env.OTP_DELIVERY || 'mock') === 'mock';

    if (!role) return { message: 'If the number is registered, a sign-in code has been sent.' };

    const now = new Date();
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const secret = this.secret();
    const challenge = {
      codeHash: this.hashCode(phone, code, secret),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      attempts: 0,
      consumed: false,
      mfaTokenHash: null,
      mfaExpiresAt: null,
      mfaAttempts: 0,
      mfaConsumed: false,
    };

    try {
      await this.challenges.findOneAndUpdate(
        { phone, $or: [{ updatedAt: { $lte: new Date(now.getTime() - RESEND_INTERVAL_MS) } }, { updatedAt: { $exists: false } }] },
        { $set: challenge },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) throw new HttpException('Please wait before requesting another code.', HttpStatus.TOO_MANY_REQUESTS);
      throw error;
    }

    if (devMode) {
      console.info(`[mock-sms] sign-in code for ${phone}: ${code}`);
    } else {
      try {
        await this.sendSms(phone, `Your Clinic Desk sign-in code is ${code}. It expires in 5 minutes.`);
      } catch {
        await this.challenges.updateOne({ phone, codeHash: challenge.codeHash }, { $set: { consumed: true } });
        throw new BadRequestException('Could not send the sign-in code. Please try again later.');
      }
    }

    return { message: 'If the number is registered, a sign-in code has been sent.', ...(devMode ? { devCode: code } : {}) };
  }

  async verifyCode(rawPhone: string, rawCode: string) {
    const phone = this.normalizePhone(rawPhone);
    const role = this.staffUsers().get(phone);
    const devMode = process.env.NODE_ENV !== 'production' && (process.env.OTP_DELIVERY || 'mock') === 'mock';
    const code = rawCode.trim();
    if (!role || !/^\d{6}$/.test(code)) throw new UnauthorizedException('Invalid or expired sign-in code.');
    if (!devMode && !this.totpSecrets().has(phone)) throw new UnauthorizedException('Invalid or expired sign-in code.');

    const now = new Date();
    const secret = this.secret();
    const codeHash = this.hashCode(phone, code, secret);
    const challenge = await this.challenges.findOneAndUpdate(
      { phone, codeHash, consumed: false, expiresAt: { $gt: now }, attempts: { $lt: MAX_ATTEMPTS } },
      { $set: { consumed: true } },
      { new: true },
    ).lean();

    if (!challenge) {
      await this.challenges.updateOne(
        { phone, consumed: false, expiresAt: { $gt: now }, attempts: { $lt: MAX_ATTEMPTS } },
        { $inc: { attempts: 1 } },
      );
      throw new UnauthorizedException('Invalid or expired sign-in code.');
    }

    if (!devMode) {
      const mfaToken = randomBytes(32).toString('base64url');
      await this.challenges.updateOne({ phone, codeHash, consumed: true }, {
        $set: {
          mfaTokenHash: this.hashMfaToken(mfaToken, secret),
          mfaExpiresAt: new Date(Date.now() + CODE_TTL_MS),
          mfaAttempts: 0,
          mfaConsumed: false,
        },
      });
      return { mfaRequired: true, mfaToken };
    }

    return this.issueAccessToken(phone, role, secret);
  }

  async verifyAuthenticatorCode(mfaToken: string, rawCode: string) {
    const secret = this.secret();
    const tokenHash = this.hashMfaToken(mfaToken, secret);
    const pending = await this.challenges.findOne({
      mfaTokenHash: tokenHash,
      mfaConsumed: false,
      mfaExpiresAt: { $gt: new Date() },
      mfaAttempts: { $lt: MAX_ATTEMPTS },
    }).lean();
    const role = pending && this.staffUsers().get(pending.phone);
    const totpSecret = pending && this.totpSecrets().get(pending.phone);
    const matchedCounter = pending && totpSecret ? this.matchTotp(rawCode.trim(), totpSecret) : null;
    if (!pending || !role || !totpSecret || matchedCounter === null) {
      if (pending) await this.challenges.updateOne({ _id: pending._id, mfaConsumed: false, mfaAttempts: { $lt: MAX_ATTEMPTS } }, { $inc: { mfaAttempts: 1 } });
      throw new UnauthorizedException('Invalid or expired authenticator code.');
    }

    try {
      await this.totpUses.findOneAndUpdate(
        { phone: pending.phone, lastCounter: { $lt: matchedCounter } },
        { $set: { lastCounter: matchedCounter } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) {
        await this.challenges.updateOne({ _id: pending._id, mfaConsumed: false, mfaAttempts: { $lt: MAX_ATTEMPTS } }, { $inc: { mfaAttempts: 1 } });
        throw new UnauthorizedException('Authenticator code has already been used.');
      }
      throw error;
    }

    const consumed = await this.challenges.findOneAndUpdate(
      { _id: pending._id, mfaTokenHash: tokenHash, mfaConsumed: false, mfaExpiresAt: { $gt: new Date() }, mfaAttempts: { $lt: MAX_ATTEMPTS } },
      { $set: { mfaConsumed: true } },
      { new: true },
    ).lean();
    if (!consumed) throw new UnauthorizedException('Invalid or expired authenticator code.');
    return this.issueAccessToken(pending.phone, role, secret);
  }

  private issueAccessToken(phone: string, role: Role, secret: string) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ sub: phone, role, iat: nowSeconds, exp: nowSeconds + 3600 })).toString('base64url');
    const signature = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
    return { accessToken: `${head}.${body}.${signature}`, role, mfaRequired: false };
  }

  private normalizePhone(value: string) {
    const phone = value.trim().replace(/[\s()-]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new BadRequestException('Enter a phone number in international format, such as +14155550123.');
    return phone;
  }

  private staffUsers(): Map<string, Role> {
    const entries = (process.env.STAFF_USERS || '').split(',').filter(Boolean);
    return new Map(entries.map(entry => {
      const splitAt = entry.lastIndexOf(':');
      const phone = entry.slice(0, splitAt).trim();
      const role = entry.slice(splitAt + 1).trim();
      if (splitAt < 0 || !/^\+[1-9]\d{7,14}$/.test(phone) || !['RECEPTIONIST', 'ADMIN'].includes(role)) {
        throw new Error('STAFF_USERS entries must use +15555550123:RECEPTIONIST or +15555550123:ADMIN format.');
      }
      return [phone, role as Role] as const;
    }));
  }

  private secret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 24) throw new Error('JWT_SECRET must contain at least 24 characters.');
    return secret;
  }

  private hashCode(phone: string, code: string, secret: string) {
    return createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
  }

  private hashMfaToken(token: string, secret: string) {
    return createHmac('sha256', secret).update(token).digest('hex');
  }

  private totpSecrets() {
    return new Map((process.env.TOTP_SECRETS || '').split(',').filter(Boolean).map(entry => {
      const splitAt = entry.lastIndexOf(':');
      const phone = entry.slice(0, splitAt).trim();
      const seed = entry.slice(splitAt + 1).trim().replace(/\s+/g, '').toUpperCase();
      if (splitAt < 0 || !/^\+[1-9]\d{7,14}$/.test(phone) || !/^[A-Z2-7]+=*$/.test(seed) || this.decodeBase32(seed).length < 20) {
        throw new Error('TOTP_SECRETS entries must use +15555550123:BASE32_SECRET format with at least 160 bits of secret.');
      }
      return [phone, seed] as const;
    }));
  }

  private decodeBase32(value: string) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const char of value.replace(/=+$/, '')) {
      const index = alphabet.indexOf(char);
      if (index < 0) throw new Error('Invalid Base32 TOTP secret.');
      bits += index.toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let offset = 0; offset + 8 <= bits.length; offset += 8) bytes.push(parseInt(bits.slice(offset, offset + 8), 2));
    return Buffer.from(bytes);
  }

  private matchTotp(code: string, encodedSecret: string) {
    if (!/^\d{6}$/.test(code)) return null;
    const key = this.decodeBase32(encodedSecret);
    const currentCounter = Math.floor(Date.now() / 30_000);
    for (const counter of [currentCounter, currentCounter - 1, currentCounter + 1]) {
      const message = Buffer.alloc(8);
      message.writeBigUInt64BE(BigInt(counter));
      const digest = createHmac('sha1', key).update(message).digest();
      const offset = digest[digest.length - 1] & 0x0f;
      const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
      const expected = Buffer.from(String(binary).padStart(6, '0'));
      if (timingSafeEqual(expected, Buffer.from(code))) return counter;
    }
    return null;
  }

  private async sendSms(phone: string, message: string) {
    if (process.env.OTP_DELIVERY !== 'twilio') throw new Error('Production OTP_DELIVERY must be configured as twilio.');
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!accountSid || !authToken || !from) throw new Error('Twilio SMS credentials are not configured.');

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, From: from, Body: message }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`SMS delivery failed with status ${response.status}.`);
  }
}
