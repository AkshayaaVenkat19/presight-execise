const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../utils/pagination');
const { getVocabulary } = require('./vocabulary');

const SORT_FIELDS = ['first_name', 'last_name', 'age', 'nationality'];
const SORT_ORDERS = ['asc', 'desc'];

const MAX_TEXT_LENGTH = 100;
const MAX_VALUE_LENGTH = 100;
const MAX_NATIONALITIES = 50;
const MAX_HOBBIES = 10; // A user can hold at most 10 hobbies, so more filters can never match.

const DIGITS_ONLY = /^\d+$/;
// eslint-disable-next-line no-control-regex -- Control characters are exactly what we strip.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;

/** Each parser returns the normalised value or throws a field-level message. */

function clean(raw) {
  return raw.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
}

function text({ maxLength }) {
  return (raw) => {
    if (raw === undefined) return undefined;
    if (typeof raw !== 'string') throw new Error('must be a single string value');
    const value = clean(raw);
    if (value === '') return undefined;
    if (value.length > maxLength) throw new Error(`must be at most ${maxLength} characters`);
    return value;
  };
}

function list({ maxItems, maxLength, vocabulary }) {
  return (raw) => {
    if (raw === undefined) return [];
    const input = Array.isArray(raw) ? raw : [raw];
    if (input.some((entry) => typeof entry !== 'string')) {
      throw new Error('must be a string or an array of strings');
    }
    const values = [
      ...new Set(
        input
          .flatMap((entry) => entry.split(','))
          .map((entry) => clean(entry))
          .filter(Boolean)
      ),
    ];
    if (values.length > maxItems) throw new Error(`must contain at most ${maxItems} values`);
    if (values.some((value) => value.length > maxLength)) {
      throw new Error(`each value must be at most ${maxLength} characters`);
    }

    const allowed = getVocabulary(vocabulary);
    if (!allowed) return values;

    const unsupported = values.filter((value) => !allowed.has(value.toLowerCase()));
    if (unsupported.length > 0) {
      throw new Error(`has unsupported value(s): ${unsupported.join(', ')}`);
    }
    // Canonicalise casing so the SQL equality match behaves predictably.
    return values.map((value) => allowed.get(value.toLowerCase()));
  };
}

function oneOf(allowed, fallback) {
  return (raw) => {
    if (raw === undefined) return fallback;
    if (typeof raw !== 'string') throw new Error('must be a single string value');
    const value = raw.trim().toLowerCase();
    if (!allowed.includes(value)) throw new Error(`must be one of ${allowed.join(', ')}`);
    return value;
  };
}

/** Digits only — rejects signs, decimals and exponent forms like `1e3`. */
function integer({ min, max, fallback }) {
  const expected =
    max === Number.MAX_SAFE_INTEGER
      ? `must be a positive integer of at least ${min}`
      : `must be a positive integer between ${min} and ${max}`;

  return (raw) => {
    if (raw === undefined) return fallback;
    if (typeof raw !== 'string') throw new Error('must be a single numeric value');
    const value = raw.trim();
    if (!DIGITS_ONLY.test(value)) throw new Error(expected);
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error(expected);
    return parsed;
  };
}

/** Shared by the list and both facet endpoints so filter state can never diverge. */
const filterQuerySchema = {
  q: text({ maxLength: MAX_TEXT_LENGTH }),
  nationality: list({
    maxItems: MAX_NATIONALITIES,
    maxLength: MAX_VALUE_LENGTH,
    vocabulary: 'nationality',
  }),
  hobby: list({ maxItems: MAX_HOBBIES, maxLength: MAX_VALUE_LENGTH, vocabulary: 'hobby' }),
};

const userListQuerySchema = {
  ...filterQuerySchema,
  sortBy: oneOf(SORT_FIELDS, 'first_name'),
  sortOrder: oneOf(SORT_ORDERS, 'asc'),
  page: integer({ min: 1, max: Number.MAX_SAFE_INTEGER, fallback: DEFAULT_PAGE }),
  limit: integer({ min: 1, max: MAX_LIMIT, fallback: DEFAULT_LIMIT }),
};

module.exports = {
  SORT_FIELDS,
  SORT_ORDERS,
  filterQuerySchema,
  userListQuerySchema,
};
