export const getErrorMessage = (
  err: any,
  fallback = 'Something went wrong. Please try again.',
): string => {
  if (err?.status === 'FETCH_ERROR') {
    return 'Cannot reach the server. Check your connection and try again.';
  }

  if (err?.status === 'PARSING_ERROR' || err?.status === 404) {
    return 'This service is unavailable right now. Please try again later.';
  }

  const detail = err?.data?.detail;
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    const field = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : null;
    if (first?.msg) {
      return field ? `${field}: ${first.msg}` : first.msg;
    }
  }

  if (typeof err?.data?.message === 'string') return err.data.message;

  return fallback;
};
