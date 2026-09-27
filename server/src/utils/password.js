const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const deriveKey = promisify(scrypt);

const SALT_BYTES = 16;
const DERIVED_KEY_BYTES = 64;

async function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const key = await deriveKey(password, salt, DERIVED_KEY_BYTES);
  return `${salt}:${key.toString('hex')}`;
}

async function verifyPassword(password, hash) {
  const [salt, key] = hash.split(':');
  const actual = await deriveKey(password, salt, DERIVED_KEY_BYTES);
  const expected = Buffer.from(key, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

module.exports = { hashPassword, verifyPassword };
