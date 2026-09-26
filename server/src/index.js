require('dotenv').config();
const app = require('./app');
const UserService = require('./services/user.service');

const PORT = process.env.PORT || 3001;

UserService.loadFilterVocabulary()
  .catch((error) => {
    // Without the vocabulary the filters stay unvalidated rather than unavailable.
    console.error('[server] could not load filter vocabulary', error);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
    });
  });
