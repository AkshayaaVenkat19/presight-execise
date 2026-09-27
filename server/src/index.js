require('dotenv').config();
const app = require('./app');
const UserService = require('./services/user.service');
const { seedDatabase } = require('./database/seeds');
const PORT = process.env.PORT || 3001;

async function start() {
  await seedDatabase(1000, { onlyIfEmpty: true });
  await UserService.loadFilterVocabulary();
  app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
}

start().catch((error) => {
  console.error('[server] startup failed', error);
  process.exitCode = 1;
});
