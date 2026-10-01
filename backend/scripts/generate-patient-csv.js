const fs = require('fs');
const path = require('path');

const count = Number(process.argv[2] || 10000);
const output = path.resolve(process.argv[3] || path.join(__dirname, '..', 'data', `patients-${count}.csv`));
const firstNames = ['Aarav', 'Aisha', 'Arjun', 'Diya', 'Ethan', 'Fatima', 'Ishaan', 'Kavya', 'Maya', 'Noah', 'Olivia', 'Rohan', 'Sara', 'Vihaan', 'Zoya'];
const lastNames = ['Shah', 'Mehta', 'Patel', 'Iyer', 'Khan', 'Singh', 'Nair', 'Rao', 'Kapoor', 'Joshi', 'Desai', 'Thomas'];
const pad = value => String(value).padStart(2, '0');
const csv = value => `"${String(value).replaceAll('"', '""')}"`;
const now = Date.now();
const minAge = 18 * 365.25 * 24 * 60 * 60 * 1000;
const maxAge = 85 * 365.25 * 24 * 60 * 60 * 1000;
const lines = ['patientId,firstName,lastName,dateOfBirth,email,phone,createdAt,updatedAt'];

for (let index = 1; index <= count; index += 1) {
  const firstName = firstNames[(index * 17) % firstNames.length];
  const lastName = lastNames[(index * 31) % lastNames.length];
  const createdAt = new Date(now - (30 * 24 * 60 * 60 * 1000) - ((index * 7919) % (60 * 24 * 60 * 60 * 1000)));
  const dateOfBirth = new Date(now - minAge - ((index * 104729) % (maxAge - minAge)));
  const patientId = `P-LOAD-${String(index).padStart(5, '0')}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${index}@example.test`;
  const phone = `+1555${pad(Math.floor(index / 10000))}${String(index % 10000).padStart(4, '0')}`;
  const values = [patientId, firstName, lastName, dateOfBirth.toISOString(), email, phone, createdAt.toISOString(), createdAt.toISOString()];
  lines.push(values.map(csv).join(','));
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${lines.join('\n')}\n`);
console.log(`Wrote ${count} synthetic patients to ${output}`);
