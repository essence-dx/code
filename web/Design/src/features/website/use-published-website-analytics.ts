"use client";

import { useEffect } from "react";

export function usePublishedWebsiteAnalytics(slug: string) {
  useEffect(() => {
    const endpoint = `/site/${encodeURIComponent(slug)}/click`;

    function handleClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const clickable = target.closest("a,button") as HTMLElement | null;

      if (!clickable) {
        return;
      }

      const section = clickable.closest("[data-website-section-id]");
      const sectionId =
        section instanceof HTMLElement
          ? section.dataset.websiteSectionId
          : undefined;
      const payload = {
        sectionId,
        target: getClickTarget(clickable),
        path: window.location.pathname,
      };
      const body = JSON.stringify(payload);

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          endpoint,
          new Blob([body], { type: "application/json" }),
        );
        return;
      }

      void fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body,
        keepalive: true,
      });
    }

    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [slug]);
}

function getClickTarget(element: HTMLElement) {
  const label =
    element.getAttribute("aria-label") ??
    element.getAttribute("title") ??
    element.textContent ??
    element.tagName.toLowerCase();
  const href =
    element instanceof HTMLAnchorElement
      ? element.href
      : element.getAttribute("formaction");
  const trimmedLabel = label.trim().replace(/\s+/g, " ").slice(0, 160);

  if (!href) {
    return trimmedLabel;
  }

  return `${trimmedLabel || "link"} -> ${href}`.slice(0, 500);
}
