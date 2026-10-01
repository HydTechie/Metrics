// Local demonstration only. Production access tokens must come from the configured OIDC issuer.
const { createHmac } = require('crypto');
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 24) throw new Error('Set JWT_SECRET to at least 24 characters');
const role = process.argv[2] || 'RECEPTIONIST';
if (!['RECEPTIONIST', 'ADMIN'].includes(role)) throw new Error('Role must be RECEPTIONIST or ADMIN');
const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const head = enc({ alg: 'HS256', typ: 'JWT' });
const body = enc({ sub: 'local-demo-user', role, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 });
console.log(`${head}.${body}.${createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')}`);
