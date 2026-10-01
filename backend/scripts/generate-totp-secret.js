const { randomBytes } = require('crypto');

const phone = process.argv[2];
if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
  throw new Error('Usage: node scripts/generate-totp-secret.js +15555550123');
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const bytes = randomBytes(20);
let bits = '';
for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
let secret = '';
for (let offset = 0; offset < bits.length; offset += 5) {
  secret += alphabet[parseInt(bits.slice(offset, offset + 5).padEnd(5, '0'), 2)];
}

const issuer = 'Clinic Desk';
const label = encodeURIComponent(`${issuer}:${phone}`);
const uri = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
console.log(`TOTP_SECRETS entry: ${phone}:${secret}`);
console.log(`Authenticator setup URI: ${uri}`);
