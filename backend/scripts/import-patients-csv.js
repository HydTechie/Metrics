const fs = require('fs');
const mongoose = require('mongoose');

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/import-patients-csv.js <csv-file>');
if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI before importing');

function parseLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { values.push(value); value = ''; }
    else value += char;
  }
  values.push(value);
  return values;
}

const [header, ...lines] = fs.readFileSync(input, 'utf8').trim().split(/\r?\n/);
const columns = parseLine(header);
const rows = lines.filter(Boolean).map(line => Object.fromEntries(parseLine(line).map((value, index) => [columns[index], value])));
const schema = new mongoose.Schema({ patientId: String, firstName: String, lastName: String, dateOfBirth: Date, email: String, phone: String, createdAt: Date, updatedAt: Date }, { collection: 'patients' });
const Patient = mongoose.model('SyntheticPatient', schema);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const operations = rows.map(row => ({
    updateOne: {
      filter: { patientId: row.patientId },
      update: { $set: { firstName: row.firstName, lastName: row.lastName, dateOfBirth: new Date(row.dateOfBirth), email: row.email.toLowerCase(), phone: row.phone, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) } },
      upsert: true,
    },
  }));
  let imported = 0;
  for (let index = 0; index < operations.length; index += 500) {
    const result = await Patient.bulkWrite(operations.slice(index, index + 500), { ordered: false });
    imported += result.upsertedCount + result.modifiedCount;
  }
  console.log(`Imported or refreshed ${imported} synthetic patients from ${input}`);
  await mongoose.disconnect();
})().catch(async error => { console.error(error); await mongoose.disconnect(); process.exitCode = 1; });
