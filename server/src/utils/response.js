/**
 * Single place where every successful payload is shaped, so `data` (and the
 * optional `pagination` sibling) stay identical across all endpoints.
 */
function sendSuccess(res, data, pagination) {
  const body = { data };
  if (pagination) body.pagination = pagination;
  return res.status(200).json(body);
}

module.exports = { sendSuccess };
