/**
 * Convert unknown request failures into an Error while preserving useful Axios fields.
 * @param {unknown} error
 * @param {string} fallbackMessage
 * @returns {Error & { response?: unknown, code?: string, status?: number }}
 */
export function normalizeApiError(error, fallbackMessage = "Request failed") {
  const source = error && typeof error === "object" ? error : {};
  const message =
    source.response?.data?.message || source.message || fallbackMessage;
  const normalizedError = new Error(message, { cause: error });

  if (source.response) normalizedError.response = source.response;
  if (source.code) normalizedError.code = source.code;
  if (source.status) normalizedError.status = source.status;

  return normalizedError;
}
