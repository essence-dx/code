export function getImportRateLimitMessage(retryAfterSeconds: number) {
  const waitSeconds = Math.max(Math.ceil(retryAfterSeconds), 1);

  if (waitSeconds < 60) {
    return `Too many imports. Try again in ${waitSeconds} seconds.`;
  }

  const waitMinutes = Math.ceil(waitSeconds / 60);

  return `Too many imports. Try again in ${waitMinutes} minutes.`;
}
