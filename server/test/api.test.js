const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = ':memory:';
const app = require('../src/app');
const { getDbConnection } = require('../src/database/connection');
const { runMigrations } = require('../src/database/migrations');
const UserService = require('../src/services/user.service');
const HealthRepository = require('../src/repositories/health.repository');

let server;
let baseUrl;
let db;

before(async () => {
  await runMigrations();
  db = await getDbConnection();
  await db.exec(`
    INSERT INTO users (id, avatar, first_name, last_name, age, nationality) VALUES
      (1, 'avatar', 'Alex', 'Smith', 30, 'Canada'),
      (2, 'avatar', 'Alex', 'Smith', 30, 'Japan'),
      (3, 'avatar', 'Beth', 'Jones', 25, 'Canada');
    INSERT INTO hobbies (id, name) VALUES (1, 'Reading'), (2, 'Hiking');
    INSERT INTO user_hobbies (user_id, hobby_id) VALUES (1, 1), (1, 2), (2, 1);
  `);
  await UserService.loadFilterVocabulary();
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  if (db) await db.close();
});

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { status: response.status, headers: response.headers, body: await response.json() };
}

test('user pages preserve deterministic sort and pagination metadata', async () => {
  const first = await request('/api/users?sortBy=age&sortOrder=desc&limit=1');
  const second = await request('/api/users?sortBy=age&sortOrder=desc&limit=1&page=2');
  assert.equal(first.status, 200);
  assert.deepEqual(first.body.data.map((user) => user.id), [1]);
  assert.deepEqual(second.body.data.map((user) => user.id), [2]);
  assert.deepEqual(first.body.pagination, { page: 1, limit: 1, total: 3, totalPages: 3, hasMore: true });
});

test('text, nationality OR, and hobby AND filters also constrain sidebar counts', async () => {
  const query = '?q=Alex&nationality=Canada,Japan&hobby=Reading,Hiking';
  const users = await request(`/api/users${query}`);
  const filters = await request(`/api/filters${query}`);
  assert.deepEqual(users.body.data.map((user) => user.id), [1]);
  assert.deepEqual(filters.body.data, {
    hobbies: [{ value: 'Hiking', count: 1 }, { value: 'Reading', count: 1 }],
    nationalities: [{ value: 'Canada', count: 1 }],
  });
});

test('invalid input, unknown routes and unsupported methods use centralized errors', async () => {
  const invalid = await request('/api/users?page=0');
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, 'INVALID_PARAMETER');
  const missing = await request('/api/missing');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, 'NOT_FOUND');
  for (const path of ['/api/users', '/api/health', '/health']) {
    const unsupported = await request(path, { method: 'POST' });
    assert.equal(unsupported.status, 405);
    assert.equal(unsupported.headers.get('allow'), 'GET, HEAD');
    assert.equal(unsupported.body.error.code, 'METHOD_NOT_ALLOWED');
  }
});

test('both health endpoints use the service and repository', async () => {
  for (const path of ['/health', '/api/health']) {
    const result = await request(path);
    assert.equal(result.status, 200);
    assert.equal(result.body.data.database, 'connected');
  }
});

test('async repository failures reach the centralized error handler', async (t) => {
  t.mock.method(HealthRepository, 'ping', async () => { throw new Error('private database detail'); });
  t.mock.method(console, 'error', () => {});
  const result = await request('/api/health');
  assert.equal(result.status, 503);
  assert.equal(result.body.error.code, 'SERVICE_UNAVAILABLE');
  assert.equal(JSON.stringify(result.body).includes('private database detail'), false);
});

test('malformed JSON returns a safe 400 without logging a server failure', async (t) => {
  const logger = t.mock.method(console, 'error', () => {});
  const result = await request('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"private_input":',
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.error.code, 'INVALID_JSON');
  assert.equal(result.body.error.message, 'Request body must contain valid JSON');
  assert.equal(JSON.stringify(result.body).includes('private_input'), false);
  assert.equal(logger.mock.callCount(), 0);
});

test('oversized JSON returns 413 without exposing the body', async (t) => {
  const logger = t.mock.method(console, 'error', () => {});
  const result = await request('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ private_input: 'x'.repeat(110 * 1024) }),
  });

  assert.equal(result.status, 413);
  assert.equal(result.body.error.code, 'PAYLOAD_TOO_LARGE');
  assert.equal(result.body.error.message, 'Request body exceeds the allowed size');
  assert.equal(JSON.stringify(result.body).includes('private_input'), false);
  assert.equal(logger.mock.callCount(), 0);
});

test('SQLite failures return a generic 500 and log the original error', async (t) => {
  const logger = t.mock.method(console, 'error', () => {});
  // Trigger a real SQLite error without modifying the fixture schema or data.
  t.mock.method(db, 'all', () => db.get('SELECT * FROM missing_error_test_table'));
  const result = await request('/api/users');

  assert.equal(result.status, 500);
  assert.equal(result.body.error.code, 'DATABASE_ERROR');
  assert.equal(result.body.error.message, 'Database query failed');
  assert.equal(result.body.error.path, '/api/users');
  assert.ok(Number.isFinite(Date.parse(result.body.error.timestamp)));
  assert.equal(JSON.stringify(result.body).includes('missing_error_test_table'), false);
  assert.equal(result.body.error.stack, undefined);
  assert.equal(result.body.error.details, undefined);
  assert.equal(logger.mock.callCount(), 1);
  const [context, originalError] = logger.mock.calls[0].arguments;
  assert.match(context, /GET \/api\/users -> DATABASE_ERROR/);
  assert.equal(originalError.code, 'SQLITE_ERROR');
  assert.match(originalError.message, /missing_error_test_table/);
});

test('unexpected failures return a generic 500 and log the original error', async (t) => {
  const originalError = new Error('private implementation detail');
  const logger = t.mock.method(console, 'error', () => {});
  t.mock.method(UserService, 'getUsers', async () => { throw originalError; });
  const result = await request('/api/users');

  assert.equal(result.status, 500);
  assert.equal(result.body.error.code, 'INTERNAL_ERROR');
  assert.equal(result.body.error.message, 'An unexpected error occurred');
  assert.equal(JSON.stringify(result.body).includes(originalError.message), false);
  assert.equal(result.body.error.stack, undefined);
  assert.equal(result.body.error.details, undefined);
  assert.equal(logger.mock.callCount(), 1);
  assert.match(logger.mock.calls[0].arguments[0], /GET \/api\/users -> INTERNAL_ERROR/);
  assert.equal(logger.mock.calls[0].arguments[1], originalError);
});
