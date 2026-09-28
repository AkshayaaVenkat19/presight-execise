const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function getOffset(page, limit) {
  return (page - 1) * limit;
}

/**
 * Pagination metadata the client uses to decide whether to request more rows.
 */
function buildPaginationMeta({ total, page, limit }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
}

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  getOffset,
  buildPaginationMeta,
};
