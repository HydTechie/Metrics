const appUser = process.env.MONGO_APP_USERNAME;
const appPassword = process.env.MONGO_APP_PASSWORD;
if (!appUser || !appPassword) throw new Error('Mongo application user credentials are required.');

db.getSiblingDB('clinic').createUser({
  user: appUser,
  pwd: appPassword,
  roles: [{ role: 'readWrite', db: 'clinic' }],
});
