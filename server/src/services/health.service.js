const HealthRepository = require('../repositories/health.repository');
const { ServiceUnavailableError } = require('../errors/custom.error');

class HealthService {
  static async getHealth() {
    try {
      await HealthRepository.ping();
    } catch {
      throw new ServiceUnavailableError('Database connection is not available');
    }

    return { status: 'ok', database: 'connected', uptime: process.uptime() };
  }
}

module.exports = HealthService;
