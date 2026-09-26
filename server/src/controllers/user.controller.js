const UserService = require('../services/user.service');
const { sendSuccess } = require('../utils/response');

function toFilters({ q, nationality, hobby }) {
  return { text: q, nationalities: nationality, hobbies: hobby };
}

class UserController {
  static async getUsers(req, res) {
    const { sortBy, sortOrder, page, limit } = req.validated;
    const { users, pagination } = await UserService.getUsers({
      ...toFilters(req.validated),
      sortBy,
      sortOrder,
      page,
      limit,
    });

    return sendSuccess(res, users, pagination);
  }

  static async getFilters(req, res) {
    return sendSuccess(res, await UserService.getFilters(toFilters(req.validated)));
  }

  static async getHobbies(req, res) {
    return sendSuccess(res, await UserService.getTopHobbies(toFilters(req.validated)));
  }

  static async getNationalities(req, res) {
    return sendSuccess(res, await UserService.getTopNationalities(toFilters(req.validated)));
  }
}

module.exports = UserController;
