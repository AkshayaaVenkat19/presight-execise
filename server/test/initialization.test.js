const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'presight-init-'));
process.env.DATABASE_PATH = path.join(directory, 'nested', 'users.db');
const { getDbConnection } = require('../src/database/connection');
const { seedDatabase } = require('../src/database/seeds');

after(async () => {
  await (await getDbConnection()).close();
  fs.rmSync(directory, { recursive: true, force: true });
});

test('fresh startup creates and seeds the database; repeated startup preserves it', async () => {
  await seedDatabase(undefined, { onlyIfEmpty: true });
  assert.ok(fs.existsSync(process.env.DATABASE_PATH));
  const db = await getDbConnection();
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM users')).count, 1000);
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM hobbies')).count, 30);
  assert.deepEqual(await db.all('PRAGMA foreign_key_check'), []);
  const users = await db.all('SELECT * FROM users ORDER BY id');
  const hobbies = await db.all('SELECT * FROM user_hobbies ORDER BY user_id, hobby_id');
  const account = await db.get('SELECT * FROM accounts');
  await db.run('INSERT INTO sessions VALUES (?, ?, ?)', 'test-token', account.id, Date.now() + 60000);
  await seedDatabase(undefined, { onlyIfEmpty: true });
  assert.deepEqual(await db.all('SELECT * FROM users ORDER BY id'), users);
  assert.deepEqual(await db.all('SELECT * FROM user_hobbies ORDER BY user_id, hobby_id'), hobbies);
  assert.deepEqual(await db.get('SELECT * FROM accounts'), account);
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM sessions')).count, 1);
});

test('a failed replacement seed rolls back cleanup and allows retry', async () => {
  const db = await getDbConnection();
  const users = await db.all('SELECT * FROM users ORDER BY id');
  const hobbies = await db.all('SELECT * FROM hobbies ORDER BY id');
  const assignments = await db.all('SELECT * FROM user_hobbies ORDER BY user_id, hobby_id');
  await db.exec(`CREATE TRIGGER reject_seed BEFORE INSERT ON users
    BEGIN SELECT RAISE(ABORT, 'test seed failure'); END;`);
  try {
    await assert.rejects(seedDatabase(5), /test seed failure/);
    assert.deepEqual(await db.all('SELECT * FROM users ORDER BY id'), users);
    assert.deepEqual(await db.all('SELECT * FROM hobbies ORDER BY id'), hobbies);
    assert.deepEqual(await db.all('SELECT * FROM user_hobbies ORDER BY user_id, hobby_id'), assignments);
  } finally {
    await db.exec('DROP TRIGGER reject_seed');
  }
  await seedDatabase(5);
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM users')).count, 5);
  await seedDatabase(undefined, { onlyIfEmpty: true });
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM users')).count, 5);
});
