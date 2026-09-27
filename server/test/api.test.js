const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_PATH = ':memory:';
const app = require('../src/app');
const { getDbConnection } = require('../src/database/connection');
const { runMigrations } = require('../src/database/migrations');
const UserService = require('../src/services/user.service');
const HealthRepository = require('../src/repositories/health.repository');
const UserRepository = require('../src/repositories/user.repository');

let server;
let baseUrl;
let db;
let sessionCookie;

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
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  });
  assert.equal(login.status, 200);
  sessionCookie = login.headers.get('set-cookie').split(';')[0];
});

after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  if (db) await db.close();
});

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { Cookie: sessionCookie, ...options?.headers } });
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

test('page limits are enforced and responses contain only directory fields', async () => {
  for (const limit of ['101', '0', '-1', '1.5', '1e3']) {
    assert.equal((await request(`/api/users?limit=${limit}`)).status, 400);
  }
  const result = await request('/api/users?limit=100');
  assert.equal(result.status, 200);
  assert.equal(result.body.pagination.limit, 100);
  assert.deepEqual(Object.keys(result.body.data[0]).sort(),
    ['age', 'avatar', 'first_name', 'hobbies', 'id', 'last_name', 'nationality']);
  assert.deepEqual(result.body.data[0].hobbies, ['Hiking', 'Reading']);
  assert.deepEqual(result.body.data[2].hobbies, []);
  assert.equal((await request('/api/users')).body.pagination.limit, 20);
  const pastEnd = await request('/api/users?page=9007199254740991&limit=100');
  assert.equal(pastEnd.status, 200);
  assert.deepEqual(pastEnd.body.data, []);
});

test('search treats SQL and LIKE metacharacters literally and rejects unsafe sorting', async () => {
  for (const text of ["' OR 1=1 --", '%', '_', '\\']) {
    const result = await request(`/api/users?q=${encodeURIComponent(text)}`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data, []);
  }
  assert.equal((await request('/api/users?sortBy=first_name%3BDROP%20TABLE%20users')).status, 400);
});

test('directory query count stays constant as the requested page grows', async (t) => {
  const get = t.mock.method(db, 'get');
  const all = t.mock.method(db, 'all');
  for (const limit of [1, 100]) {
    get.mock.resetCalls();
    all.mock.resetCalls();
    const result = await UserRepository.findUsers({
      page: 1, limit, sortBy: 'first_name', sortOrder: 'asc',
    });
    assert.equal(result.users.length, Math.min(limit, 3));
    assert.equal(get.mock.callCount(), 1);
    assert.equal(all.mock.callCount(), 1);
    assert.match(all.mock.calls[0].arguments[0], /LIMIT \? OFFSET \?/);
    assert.deepEqual(all.mock.calls[0].arguments[1], [limit, 0]);
  }
});

test('ascending text sorts and hobby lookups use matching indexes', async () => {
  for (const field of ['first_name', 'last_name', 'nationality']) {
    const plan = await db.all(`EXPLAIN QUERY PLAN
      SELECT id, avatar, first_name, last_name, age, nationality FROM users
      ORDER BY ${field} COLLATE NOCASE ASC, id ASC LIMIT 20`);
    const details = plan.map((row) => row.detail).join('\n');
    assert.match(details, new RegExp(`USING INDEX idx_users_${field}_nocase`));
    assert.doesNotMatch(details, /TEMP B-TREE/);
  }
  const plan = await db.all('EXPLAIN QUERY PLAN SELECT user_id FROM user_hobbies WHERE hobby_id = ?', 1);
  assert.match(plan.map((row) => row.detail).join('\n'),
    /USING COVERING INDEX idx_user_hobbies_hobby_user/);
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
  const entries = logger.mock.calls.map((call) => JSON.parse(call.arguments[0]));
  const failure = entries.find((entry) => entry.message === 'database.error');
  assert.equal(failure.method, 'GET');
  assert.equal(failure.endpoint, '/api/users');
  assert.equal(failure.code, 'DATABASE_ERROR');
  assert.equal(failure.error.code, 'SQLITE_ERROR');
  assert.match(failure.error.message, /missing_error_test_table/);
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
  const entries = logger.mock.calls.map((call) => JSON.parse(call.arguments[0]));
  const failure = entries.find((entry) => entry.message === 'server.error');
  assert.equal(failure.method, 'GET');
  assert.equal(failure.endpoint, '/api/users');
  assert.equal(failure.code, 'INTERNAL_ERROR');
  assert.equal(failure.error.message, originalError.message);
});

test('completed requests are logged without credentials or query values', async (t) => {
  const logger = t.mock.method(console, 'log', () => {});
  const result = await request('/api/users?search=Alex&token=super-secret');

  assert.equal(result.status, 200);
  const entry = logger.mock.calls
    .map((call) => JSON.parse(call.arguments[0]))
    .find((line) => line.message === 'request.completed');
  assert.equal(entry.method, 'GET');
  assert.equal(entry.endpoint, '/api/users?search=Alex&token=[REDACTED]');
  assert.equal(entry.statusCode, 200);
  assert.ok(Number.isFinite(entry.responseTimeMs));
  assert.ok(Number.isFinite(Date.parse(entry.timestamp)));
  assert.equal(JSON.stringify(entry).includes('super-secret'), false);
});

test('login requests never log credentials', async (t) => {
  const logged = [];
  t.mock.method(console, 'log', (line) => logged.push(line));
  t.mock.method(console, 'warn', (line) => logged.push(line));
  const result = await request('/api/auth/login', loginOptions({ username: 'admin', password: 'admin' }));

  assert.equal(result.status, 200);
  const output = logged.join('\n');
  assert.equal(output.includes('password'), false);
  assert.ok(output.includes('/api/auth/login'));
});

const loginOptions = (body) => ({
  method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: '' },
  body: JSON.stringify(body),
});

test('default admin is hashed and migrations preserve existing credentials', async () => {
  const original = await db.get("SELECT * FROM accounts WHERE username = 'admin'");
  assert.notEqual(original.password_hash, 'admin');
  await runMigrations();
  assert.deepEqual(await db.get("SELECT * FROM accounts WHERE username = 'admin'"), original);
});

test('login validates input and rejects incorrect credentials without account disclosure', async () => {
  for (const body of [{}, { username: [], password: 'admin' }, { username: 'admin', password: '' }]) {
    assert.equal((await request('/api/auth/login', loginOptions(body))).status, 400);
  }
  for (const username of ['admin', 'missing']) {
    const result = await request('/api/auth/login', loginOptions({ username, password: 'wrong' }));
    assert.equal(result.status, 401);
    assert.equal(result.body.error.message, 'Invalid username or password');
    assert.equal(result.headers.get('set-cookie'), null);
  }
});

test('directory endpoints require a valid session, while health stays public', async () => {
  for (const path of ['/users', '/filters', '/hobbies', '/nationalities']) {
    assert.equal((await request(`/api${path}`, { headers: { Cookie: '' } })).status, 401);
  }
  assert.equal((await request('/api/health', { headers: { Cookie: '' } })).status, 200);
  assert.equal((await request('/api/auth/me', { headers: { Cookie: 'presight_session=bad' } })).status, 401);
});

test('login issues an HTTP-only session, me restores it, and logout revokes it', async () => {
  const result = await request('/api/auth/login', loginOptions({ username: 'admin', password: 'admin' }));
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(result.body.data).sort(), ['id', 'username']);
  const cookie = result.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  const headers = { Cookie: cookie.split(';')[0], 'Content-Type': 'application/json' };
  assert.equal((await request('/api/auth/me', { headers })).body.data.username, 'admin');
  assert.equal((await request('/api/auth/logout', { method: 'POST', headers, body: '{}' })).status, 200);
  assert.equal((await request('/api/auth/me', { headers })).status, 401);
});

test('expired sessions are rejected and auth writes require JSON', async () => {
  const result = await request('/api/auth/login', loginOptions({ username: 'admin', password: 'admin' }));
  const cookie = result.headers.get('set-cookie').split(';')[0];
  const { createHash } = require('node:crypto');
  const hash = createHash('sha256').update(cookie.split('=')[1]).digest('hex');
  await db.run('UPDATE sessions SET expires_at = 0 WHERE token_hash = ?', hash);
  assert.equal((await request('/api/auth/me', { headers: { Cookie: cookie } })).status, 401);
  assert.equal((await request('/api/auth/logout', { method: 'POST' })).status, 415);
});
