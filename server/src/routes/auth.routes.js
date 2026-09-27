const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { validateLogin } = require('../validation/auth.validation');
const { requireAuth, requireJson } = require('../middleware/auth.middleware');
const { MethodNotAllowedError } = require('../errors/custom.error');
const router = express.Router();

router.post('/login', requireJson, validateLogin, AuthController.login);
router.get('/me', requireAuth, AuthController.me);
router.post('/logout', requireJson, AuthController.logout);
for (const [path, allowed] of [['/login', 'POST'], ['/me', 'GET, HEAD'], ['/logout', 'POST']]) {
  router.all(path, (_req, res, next) => {
    res.set('Allow', allowed);
    next(new MethodNotAllowedError());
  });
}
module.exports = router;
