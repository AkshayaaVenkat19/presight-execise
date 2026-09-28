const { getDbConnection } = require('../database/connection');

class HealthRepository {
  static async ping() {
    const db = await getDbConnection();
    await db.get('SELECT 1');
  }
}

module.exports = HealthRepository;
