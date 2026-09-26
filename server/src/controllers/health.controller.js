const HealthService = require('../services/health.service');
const { sendSuccess } = require('../utils/response');

class HealthController {
  static async getHealth(_req, res) {
    return sendSuccess(res, await HealthService.getHealth());
  }
}

module.exports = HealthController;
