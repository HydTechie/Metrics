const { createHmac } = require('crypto');
const { performance } = require('perf_hooks');
const mongoose = require('mongoose');
const Redis = require('ioredis');

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error('Set MONGODB_URI and JWT_SECRET before benchmarking');
const term = process.argv[2] || 'Aarav';
const iterations = Number(process.argv[3] || 10);
const schema = new mongoose.Schema({ firstName: String, lastName: String }, { collection: 'patients' });
const Patient = mongoose.model('BenchmarkPatient', schema);
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tokenPart = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const head = tokenPart({ alg: 'HS256', typ: 'JWT' });
const body = tokenPart({ sub: 'benchmark-user', role: 'ADMIN', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600 });
const token = `${head}.${body}.${createHmac('sha256', process.env.JWT_SECRET).update(`${head}.${body}`).digest('base64url')}`;
const filter = { $or: ['firstName', 'lastName'].map(field => ({ [field]: { $regex: escape(term), $options: 'i' } })) };

async function timed(fn, count) {
  const samples = [];
  for (let index = 0; index < count; index += 1) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }
  return samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const total = await Patient.countDocuments({ patientId: { $regex: /^P-LOAD-/ } });
  const mongoAverageMs = await timed(() => Patient.find(filter).sort({ lastName: 1, firstName: 1 }).limit(10).lean(), iterations);
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  await redis.del('patients:recent:v1');
  const request = async () => {
    const response = await fetch('http://127.0.0.1:3000/graphql', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ query: `query { patients(search: ${JSON.stringify(term)}, page: 1, limit: 10) { total items { patientId } } }` }) });
    if (!response.ok) throw new Error(`GraphQL returned ${response.status}`);
    const payload = await response.json();
    if (payload.errors) throw new Error(JSON.stringify(payload.errors));
    return payload.data.patients;
  };
  const coldStart = performance.now();
  const coldResult = await request();
  const coldMs = performance.now() - coldStart;
  const warmAverageMs = await timed(request, iterations);
  console.log(JSON.stringify({ term, loadedSyntheticPatients: total, mongoAverageMs: Number(mongoAverageMs.toFixed(2)), graphqlColdMs: Number(coldMs.toFixed(2)), graphqlWarmAverageMs: Number(warmAverageMs.toFixed(2)), graphqlResultCount: coldResult.total, redisRecentCacheEntries: await redis.zcard('patients:recent:v1') }, null, 2));
  await redis.quit();
  await mongoose.disconnect();
})().catch(async error => { console.error(error); process.exitCode = 1; });
