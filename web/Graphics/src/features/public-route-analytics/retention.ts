const defaultRetentionDays = 30;
const maxRetentionDays = 365;

export function getPublicRouteAnalyticsRetentionDays(
  env: Record<string, string | undefined> = process.env,
) {
  const value = Number(env.ESSENCE_PUBLIC_ROUTE_ANALYTICS_RETENTION_DAYS);

  if (!Number.isFinite(value) || value <= 0) {
    return defaultRetentionDays;
  }

  return Math.min(Math.round(value), maxRetentionDays);
}

export function getPublicRouteAnalyticsRetentionDate(
  createdAt: Date,
  retentionDays: number,
) {
  return new Date(createdAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
}
