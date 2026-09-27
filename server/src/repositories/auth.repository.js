const { getDbConnection } = require('../database/connection');

class AuthRepository {
  static async findAccount(username) {
    const db = await getDbConnection();
    return db.get('SELECT id, username, password_hash FROM accounts WHERE username = ?', username);
  }

  static async createSession(tokenHash, accountId, expiresAt) {
    const db = await getDbConnection();
    await db.run('DELETE FROM sessions WHERE expires_at <= ?', Date.now());
    await db.run('INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)',
      tokenHash, accountId, expiresAt);
  }

  static async findSession(tokenHash) {
    const db = await getDbConnection();
    return db.get(`SELECT a.id, a.username FROM sessions s
      JOIN accounts a ON a.id = s.account_id
      WHERE s.token_hash = ? AND s.expires_at > ?`, tokenHash, Date.now());
  }

  static async deleteSession(tokenHash) {
    const db = await getDbConnection();
    await db.run('DELETE FROM sessions WHERE token_hash = ?', tokenHash);
  }
}

module.exports = AuthRepository;
