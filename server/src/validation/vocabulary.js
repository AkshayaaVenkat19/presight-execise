/**
 * Allowed filter values, read from the database once at startup so the request
 * path can reject unsupported values synchronously. Keyed by lowercase value so
 * lookups are case-insensitive and resolve to the stored casing.
 */
const vocabularies = new Map();

function setVocabulary(name, values) {
  vocabularies.set(name, new Map(values.map((value) => [value.toLowerCase(), value])));
}

/** Returns undefined until loaded, which callers treat as "skip the check". */
function getVocabulary(name) {
  return vocabularies.get(name);
}

module.exports = { setVocabulary, getVocabulary };
