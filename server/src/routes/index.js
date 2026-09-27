const express = require('express');

const UserController = require('../controllers/user.controller');
const HealthController = require('../controllers/health.controller');
const { validateQuery } = require('../middleware/validation.middleware');
const { filterQuerySchema, userListQuerySchema } = require('../validation/user.validation');
const { methodNotAllowed } = require('../middleware/method.middleware');

const { requireAuth } = require('../middleware/auth.middleware');
const router = express.Router();
router.use('/auth', require('./auth.routes'));
router.use(['/users', '/filters', '/hobbies', '/nationalities'], requireAuth);

const validateFilters = validateQuery(filterQuerySchema);

router.get('/health', HealthController.getHealth);
router.get('/users', validateQuery(userListQuerySchema), UserController.getUsers);
router.get('/filters', validateFilters, UserController.getFilters);
router.get('/hobbies', validateFilters, UserController.getHobbies);
router.get('/nationalities', validateFilters, UserController.getNationalities);

// The directory is read-only: any other verb on a known path is a 405, not a 404.
const READ_ONLY_PATHS = ['/health', '/users', '/filters', '/hobbies', '/nationalities'];

for (const path of READ_ONLY_PATHS) {
  router.all(path, methodNotAllowed);
}

module.exports = router;
