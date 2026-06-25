import type {
  AdminPublicRouteAnalyticsEvent,
  AdminPublicRouteAnalyticsStatus,
} from "@/features/admin/admin-public-route-analytics-types";

export const publicRouteAnalyticsStatusWeight: Record<
  AdminPublicRouteAnalyticsStatus,
  number
> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getWorstPublicRouteAnalyticsStatus(
  statuses: AdminPublicRouteAnalyticsStatus[],
  fallback: AdminPublicRouteAnalyticsStatus = "ready",
) {
  return (
    statuses.sort(
      (left, right) =>
        publicRouteAnalyticsStatusWeight[left] -
        publicRouteAnalyticsStatusWeight[right],
    )[0] ?? fallback
  );
}

export function getLatestPublicRouteAnalyticsIso(
  left: string | null,
  right: string | null,
) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return new Date(left).getTime() > new Date(right).getTime() ? left : right;
}

export function getEarliestPublicRouteAnalyticsIso(
  left: string | null,
  right: string | null,
) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return new Date(left).getTime() < new Date(right).getTime() ? left : right;
}

export function uniqueSortedPublicRouteValues(values: (string | null)[]) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  ).sort((left, right) => left.localeCompare(right));
}

export function getEventTime(event: AdminPublicRouteAnalyticsEvent) {
  return new Date(event.createdAt).getTime();
}
