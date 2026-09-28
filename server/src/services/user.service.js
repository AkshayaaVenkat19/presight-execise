const UserRepository = require('../repositories/user.repository');
const { setVocabulary } = require('../validation/vocabulary');
const { buildPaginationMeta } = require('../utils/pagination');

/**
 * Business logic for the user directory. Keeps the list and the facet counts
 * bound to the same filter state so the sidebar always matches the results.
 */
class UserService {
  static async loadFilterVocabulary() {
    const { nationalities, hobbies } = await UserRepository.findFilterVocabulary();
    setVocabulary('nationality', nationalities);
    setVocabulary('hobby', hobbies);
  }

  static async getUsers({ text, nationalities, hobbies, sortBy, sortOrder, page, limit }) {
    const { users, total } = await UserRepository.findUsers({
      text,
      nationalities,
      hobbies,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    return { users, pagination: buildPaginationMeta({ total, page, limit }) };
  }

  static getTopHobbies(filters) {
    return UserRepository.findTopHobbies(filters);
  }

  static getTopNationalities(filters) {
    return UserRepository.findTopNationalities(filters);
  }

  /** Both facets in one round trip — the sidebar needs them together. */
  static async getFilters(filters) {
    const [hobbies, nationalities] = await Promise.all([
      UserRepository.findTopHobbies(filters),
      UserRepository.findTopNationalities(filters),
    ]);

    return { hobbies, nationalities };
  }
}

module.exports = UserService;
