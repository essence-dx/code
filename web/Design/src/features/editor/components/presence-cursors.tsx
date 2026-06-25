"use client";

import { MousePointer2 } from "lucide-react";

import type { ProjectPresenceSummary } from "@/features/editor/types";

type PresenceCursorsProps = {
  presence: ProjectPresenceSummary[];
  pageId: string;
};

export function PresenceCursors({ presence, pageId }: PresenceCursorsProps) {
  const pagePresence = presence.filter(
    (item) =>
      item.pageId === pageId &&
      typeof item.cursorX === "number" &&
      typeof item.cursorY === "number",
  );

  if (pagePresence.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-50"
      aria-hidden="true"
    >
      {pagePresence.map((item) => (
        <div
          key={item.userId}
          className="absolute flex items-start gap-1"
          style={{
            left: item.cursorX ?? 0,
            top: item.cursorY ?? 0,
            color: item.color,
          }}
        >
          <MousePointer2 className="h-5 w-5 fill-background drop-shadow-sm" />
          <span
            className="max-w-32 truncate rounded-sm px-1.5 py-0.5 text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: item.color }}
          >
            {item.userName}
          </span>
        </div>
      ))}
    </div>
  );
}
