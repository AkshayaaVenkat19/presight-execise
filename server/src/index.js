require('dotenv').config();
const app = require('./app');
const UserService = require('./services/user.service');
const { seedDatabase } = require('./database/seeds');
const { logger, serializeError } = require('./utils/logger');
const PORT = process.env.PORT || 3001;

async function start() {
  await seedDatabase(1000, { onlyIfEmpty: true });
  await UserService.loadFilterVocabulary();
  app.listen(PORT, () => logger.info('server.listening', { port: Number(PORT) }));
}

start().catch((error) => {
  logger.error('server.startup_failed', serializeError(error));
  process.exitCode = 1;
});
