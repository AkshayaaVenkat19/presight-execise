const { getDbConnection } = require('../database/connection');
const { getOffset } = require('../utils/pagination');
const { SORT_FIELDS } = require('../validation/user.validation');

const TOP_FACET_LIMIT = 20;
const LIKE_ESCAPE_CHAR = '\\';
const ESCAPE_CLAUSE = `ESCAPE '${LIKE_ESCAPE_CHAR}'`;

// SQLite's LIKE is case-insensitive for ASCII, which is what the search relies on.
const SEARCH_EXPRESSIONS = ['u.first_name', 'u.last_name', "u.first_name || ' ' || u.last_name"];

const TEXT_SORT_FIELDS = new Set(['first_name', 'last_name', 'nationality']);

function placeholders(count) {
  return new Array(count).fill('?').join(',');
}

/** Neutralises LIKE wildcards so a search for `50%` stays literal. */
function toLikePattern(text) {
  return `%${text.replace(/[\\%_]/g, (match) => LIKE_ESCAPE_CHAR + match)}%`;
}

/**
 * Builds the WHERE clause shared by the list and both facet queries, so the
 * sidebar counts always describe exactly the same result set as the list.
 */
function buildFilterClause({ text, nationalities = [], hobbies = [] }) {
  const conditions = [];
  const params = [];

  if (text) {
    const matches = SEARCH_EXPRESSIONS.map((column) => `${column} LIKE ? ${ESCAPE_CLAUSE}`);
    conditions.push(`(${matches.join(' OR ')})`);
    params.push(...SEARCH_EXPRESSIONS.map(() => toLikePattern(text)));
  }

  // Any selected nationality matches (OR).
  if (nationalities.length > 0) {
    conditions.push(`u.nationality IN (${placeholders(nationalities.length)})`);
    params.push(...nationalities);
  }

  // Every selected hobby must match (AND).
  if (hobbies.length > 0) {
    conditions.push(`u.id IN (
      SELECT uh.user_id
      FROM user_hobbies uh
      JOIN hobbies h ON h.id = uh.hobby_id
      WHERE h.name IN (${placeholders(hobbies.length)})
      GROUP BY uh.user_id
      HAVING COUNT(DISTINCT h.id) = ?
    )`);
    params.push(...hobbies, hobbies.length);
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

/**
 * Repository layer for performant, parameterized SQLite database queries.
 * Built strictly according to the indexing & query optimization requirements.
 */
class UserRepository {
  /**
   * One page of users for the active filter state, ordered deterministically.
   * The page is sliced before joining hobbies, so aggregation only ever runs
   * over `limit` rows instead of the whole match set.
   */
  static async findUsers({ text, nationalities, hobbies, sortBy, sortOrder, page, limit }) {
    const db = await getDbConnection();
    const { where, params } = buildFilterClause({ text, nationalities, hobbies });

    // Sort field is whitelisted, never interpolated from raw input.
    const sortField = SORT_FIELDS.includes(sortBy) ? sortBy : SORT_FIELDS[0];
    const sortDirection = String(sortOrder).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    // Names sort case-insensitively to match the search; `id` keeps ties deterministic.
    const collation = TEXT_SORT_FIELDS.has(sortField) ? ' COLLATE NOCASE' : '';
    const orderBy = `ORDER BY u.${sortField}${collation} ${sortDirection}, u.id ASC`;

    const { total } = await db.get(`SELECT COUNT(u.id) AS total FROM users u ${where}`, params);

    // A page past the end is an empty page, not an error — and never worth querying.
    const offset = getOffset(page, limit);
    if (offset >= total) return { users: [], total };

    const rows = await db.all(
      `SELECT
         u.id,
         u.avatar,
         u.first_name,
         u.last_name,
         u.birth_date,
         u.nationality,
         GROUP_CONCAT(h.name, '||') AS hobbies
       FROM (
         SELECT u.id, u.avatar, u.first_name, u.last_name, u.birth_date, u.nationality
         FROM users u
         ${where}
         ${orderBy}
         LIMIT ? OFFSET ?
       ) u
       LEFT JOIN user_hobbies uh ON uh.user_id = u.id
       LEFT JOIN hobbies h ON h.id = uh.hobby_id
       GROUP BY u.id
       ${orderBy}`,
      [...params, limit, offset]
    );

    const users = rows.map((row) => ({
      id: row.id,
      avatar: row.avatar,
      first_name: row.first_name,
      last_name: row.last_name,
      birth_date: row.birth_date,
      nationality: row.nationality,
      hobbies: row.hobbies ? row.hobbies.split('||').sort() : [],
    }));

    return { users, total };
  }

  /**
   * Top 20 nationalities with user counts for the active filter state.
   * The nationality filter is ignored here so other options stay selectable (OR).
   */
  static async findTopNationalities(filters) {
    const db = await getDbConnection();
    const { where, params } = buildFilterClause({ ...filters, nationalities: [] });

    return db.all(
      `SELECT u.nationality AS value, COUNT(u.id) AS count
       FROM users u
       ${where}
       GROUP BY u.nationality
       ORDER BY count DESC, value ASC
       LIMIT ${TOP_FACET_LIMIT}`,
      params
    );
  }

  /** Top 20 hobbies with distinct user counts for the active filter state. */
  static async findTopHobbies(filters) {
    const db = await getDbConnection();
    const { where, params } = buildFilterClause(filters);

    return db.all(
      `SELECT h.name AS value, COUNT(DISTINCT u.id) AS count
       FROM users u
       JOIN user_hobbies uh ON uh.user_id = u.id
       JOIN hobbies h ON h.id = uh.hobby_id
       ${where}
       GROUP BY h.name
       ORDER BY count DESC, value ASC
       LIMIT ${TOP_FACET_LIMIT}`,
      params
    );
  }

  /** The complete set of values the nationality and hobby filters may take. */
  static async findFilterVocabulary() {
    const db = await getDbConnection();
    const [nationalities, hobbies] = await Promise.all([
      db.all('SELECT DISTINCT nationality AS value FROM users WHERE nationality IS NOT NULL'),
      db.all('SELECT name AS value FROM hobbies'),
    ]);

    return {
      nationalities: nationalities.map((row) => row.value),
      hobbies: hobbies.map((row) => row.value),
    };
  }
}

module.exports = UserRepository;
