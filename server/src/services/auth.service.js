const { randomBytes, createHash } = require('node:crypto');
const AuthRepository = require('../repositories/auth.repository');
const { hashPassword, verifyPassword } = require('../utils/password');
const { AppError } = require('../errors/custom.error');

const SESSION_DURATION = 24 * 60 * 60 * 1000;
const SESSION_TOKEN_BYTES = 32;
const SESSION_TOKEN_HEX_LENGTH = SESSION_TOKEN_BYTES * 2;
const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
// Unknown accounts still perform password verification.
let dummyHash;

class AuthService {
  static async login({ username, password }) {
    const account = await AuthRepository.findAccount(username);
    if (!dummyHash) dummyHash = hashPassword(randomBytes(SESSION_TOKEN_BYTES).toString('hex'));
    const valid = await verifyPassword(password, account?.password_hash || await dummyHash);
    if (!account || !valid) {
      throw new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
    }
    const token = randomBytes(SESSION_TOKEN_BYTES).toString('hex');
    await AuthRepository.createSession(tokenHash(token), account.id, Date.now() + SESSION_DURATION);
    return { token, user: { id: account.id, username: account.username } };
  }

  static async findUser(token) {
    return (token && await AuthRepository.findSession(tokenHash(token))) || null;
  }

  static async getUser(token) {
    const user = await AuthService.findUser(token);
    if (!user) throw new AppError('Please sign in to continue', 401, 'UNAUTHENTICATED');
    return user;
  }

  static async logout(token) {
    if (token) await AuthRepository.deleteSession(tokenHash(token));
  }
}

module.exports = { AuthService, SESSION_DURATION, SESSION_TOKEN_HEX_LENGTH };
