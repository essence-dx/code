export const publicRouteKinds = ["share", "prototype", "embed"] as const;

export type PublicRouteKind = (typeof publicRouteKinds)[number];
