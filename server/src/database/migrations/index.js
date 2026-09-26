const { getDbConnection } = require('../connection');

/**
 * Initializes the SQLite database schema with optimal tables, constraints, and indexes.
 */
async function runMigrations() {
  console.log('Running database migrations...');
  const db = await getDbConnection();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avatar TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      age INTEGER NOT NULL CHECK (age >= 0 AND age <= 150),
      nationality TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS hobbies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_hobbies (
      user_id INTEGER NOT NULL,
      hobby_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, hobby_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
    CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);
    CREATE INDEX IF NOT EXISTS idx_users_nationality ON users(nationality);
    CREATE INDEX IF NOT EXISTS idx_users_age ON users(age);
    CREATE INDEX IF NOT EXISTS idx_hobbies_name ON hobbies(name);
    CREATE INDEX IF NOT EXISTS idx_user_hobbies_hobby_id ON user_hobbies(hobby_id);

    -- Covers the name search: a contains-match cannot seek, but SQLite can scan
    -- this index instead of the wider users table.
    CREATE INDEX IF NOT EXISTS idx_users_name_search
      ON users(first_name COLLATE NOCASE, last_name COLLATE NOCASE, id);
  `);

  console.log('Database migrations completed successfully.');
}

module.exports = { runMigrations };

if (require.main === module) {
  runMigrations().catch(console.error);
}
