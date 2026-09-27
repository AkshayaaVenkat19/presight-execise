const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'users.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

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
