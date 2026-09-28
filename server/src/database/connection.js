const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DB_DIR = path.join(__dirname, '../../data');
// DB_PATH remains supported for existing local configurations.
const DATABASE_PATH = process.env.DATABASE_PATH || process.env.DB_PATH || path.join(DB_DIR, 'users.db');
if (DATABASE_PATH !== ':memory:') {
  fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
}

let dbPromise = null;

/**
 * Returns an asynchronous connection instance to SQLite.
 */
function getDbConnection() {
  if (!dbPromise) {
    dbPromise = open({
      filename: DATABASE_PATH,
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
