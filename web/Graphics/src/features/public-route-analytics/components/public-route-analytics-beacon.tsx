"use client";

import { useEffect, useRef } from "react";
import type { PublicRouteKind } from "@/features/public-route-analytics/types";

type PublicRouteAnalyticsBeaconProps = {
  routeKind: PublicRouteKind;
  token: string;
};

export function PublicRouteAnalyticsBeacon({
  routeKind,
  token,
}: PublicRouteAnalyticsBeaconProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) {
      return;
    }

    sentRef.current = true;

    const payload = JSON.stringify({
      token,
      routeKind,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    const endpoint = "/api/public-route-events";

    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        endpoint,
        new Blob([payload], { type: "application/json" }),
      );

      if (sent) {
        return;
      }
    }

    void fetch(endpoint, {
      body: payload,
      credentials: "omit",
      headers: { "content-type": "application/json" },
      keepalive: true,
      method: "POST",
    });
  }, [routeKind, token]);

  return null;
}
