const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'users.db');

let dbPromise = null;

/**
 * Returns an asynchronous connection instance to SQLite.
 */
function getDbConnection() {
  if (!dbPromise) {
    dbPromise = open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    }).then(async (db) => {
      await db.exec('PRAGMA foreign_keys = ON;');
      await db.exec('PRAGMA journal_mode = WAL;');
      return db;
    });
  }
  return dbPromise;
}

module.exports = { getDbConnection };
