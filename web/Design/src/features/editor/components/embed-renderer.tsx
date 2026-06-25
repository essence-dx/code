"use client";

import type { CSSProperties } from "react";

import { getSafeHttpUrl, getUrlHost } from "@/features/editor/link-utils";
import type { DesignElement, EmbedElement } from "@/features/editor/types";

type EmbedRendererProps = {
  element: Extract<DesignElement, { type: "embed" }>;
  baseStyle: CSSProperties;
};

export function EmbedRenderer({ element, baseStyle }: EmbedRendererProps) {
  const safeUrl = getSafeHttpUrl(element.url);

  if (element.embedMode === "iframe" && safeUrl) {
    return (
      <div style={getShellStyle(element, baseStyle)}>
        <iframe
          src={safeUrl}
          title={element.title || "Embedded content"}
          loading="lazy"
          sandbox="allow-forms allow-popups allow-same-origin"
          referrerPolicy="no-referrer"
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            borderRadius: Math.max(0, element.radius - element.padding * 0.35),
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  return (
    <div style={getShellStyle(element, baseStyle)}>
      <div
        style={{
          display: "flex",
          height: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: Math.max(10, element.padding * 0.65),
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "grid",
            gap: Math.max(6, element.padding * 0.35),
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: Math.max(36, element.fontSize * 2.4),
              height: 4,
              borderRadius: 999,
              background: element.accentColor,
            }}
          />
          <strong
            style={{
              display: "-webkit-box",
              overflow: "hidden",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              fontSize: element.fontSize * 1.15,
              fontWeight: element.fontWeight,
              lineHeight: 1.1,
            }}
          >
            {element.title || getUrlHost(element.url) || "Embed"}
          </strong>
          <span
            style={{
              display: "-webkit-box",
              overflow: "hidden",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 3,
              color: element.textColor,
              fontSize: Math.max(10, element.fontSize * 0.82),
              fontWeight: 500,
              lineHeight: 1.35,
              opacity: 0.72,
            }}
          >
            {element.description ||
              "Add a title and description for this link."}
          </span>
        </div>
        {element.showUrl ? (
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: element.accentColor,
              fontSize: Math.max(10, element.fontSize * 0.72),
              fontWeight: 700,
            }}
          >
            {safeUrl || element.url || "https://example.com"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function getShellStyle(
  element: EmbedElement,
  baseStyle: CSSProperties,
): CSSProperties {
  return {
    ...baseStyle,
    boxSizing: "border-box",
    padding: element.padding,
    borderRadius: element.radius,
    border: `${Math.max(0, element.borderWidth)}px solid ${element.borderColor}`,
    background: element.surfaceColor,
    color: element.textColor,
    fontFamily: element.fontFamily,
    fontSize: element.fontSize,
    fontWeight: element.fontWeight,
    overflow: "hidden",
  };
}
