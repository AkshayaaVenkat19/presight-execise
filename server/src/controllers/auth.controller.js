const { AuthService, SESSION_DURATION } = require('../services/auth.service');
const { COOKIE_NAME, getSessionToken } = require('../middleware/auth.middleware');
const { sendSuccess } = require('../utils/response');

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/api',
});

class AuthController {
  static async login(req, res) {
    const { token, user } = await AuthService.login(req.validated);
    await AuthService.logout(getSessionToken(req));
    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: SESSION_DURATION });
    res.set('Cache-Control', 'no-store');
    return sendSuccess(res, user);
  }

  static async me(req, res) {
    res.set('Cache-Control', 'no-store');
    return sendSuccess(res, await AuthService.findUser(getSessionToken(req)));
  }

  static async logout(req, res) {
    await AuthService.logout(getSessionToken(req));
    res.clearCookie(COOKIE_NAME, cookieOptions());
    return sendSuccess(res, { message: 'Signed out successfully' });
  }
}

module.exports = AuthController;
