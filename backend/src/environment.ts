import { existsSync } from 'fs';
import { resolve } from 'path';

const profile = process.env.NODE_ENV || 'development';
const envFile = `.env.${profile}`;
for (const candidate of [resolve(process.cwd(), envFile), resolve(process.cwd(), '..', envFile)]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

if (profile === 'development' && !process.env.MONGODB_URI && process.env.MONGO_APP_USERNAME && process.env.MONGO_APP_PASSWORD) {
  const username = encodeURIComponent(process.env.MONGO_APP_USERNAME);
  const password = encodeURIComponent(process.env.MONGO_APP_PASSWORD);
  process.env.MONGODB_URI = `mongodb://${username}:${password}@localhost:27017/clinic?authSource=clinic&replicaSet=rs0`;
}

if (profile === 'production') {
  const required = [
    'MONGODB_URI', 'JWT_SECRET', 'STAFF_USERS', 'TOTP_SECRETS',
    'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER',
  ];
  const missing = required.filter(name => !process.env[name]);
  if (process.env.OTP_DELIVERY !== 'twilio') missing.push('OTP_DELIVERY=twilio');
  if ((process.env.JWT_SECRET || '').length < 32) missing.push('JWT_SECRET (at least 32 characters)');
  if (missing.length) throw new Error(`Production configuration is incomplete: ${[...new Set(missing)].join(', ')}`);
}
