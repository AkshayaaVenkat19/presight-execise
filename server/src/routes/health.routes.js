const express = require('express');
const HealthController = require('../controllers/health.controller');
const { methodNotAllowed } = require('../middleware/method.middleware');

const router = express.Router();
router.route('/').get(HealthController.getHealth).all(methodNotAllowed);

module.exports = router;
