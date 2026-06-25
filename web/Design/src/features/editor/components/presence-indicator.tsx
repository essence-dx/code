"use client";

import { UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ProjectPresenceSummary } from "@/features/editor/types";

type PresenceIndicatorProps = {
  presence: ProjectPresenceSummary[];
};

export function PresenceIndicator({ presence }: PresenceIndicatorProps) {
  if (presence.length === 0) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <UsersRound className="h-3.5 w-3.5" />
        Solo
      </Badge>
    );
  }

  const visiblePresence = presence.slice(0, 3);
  return (
    <div className="flex items-center gap-2" aria-label="Active collaborators">
      <div className="flex -space-x-2">
        {visiblePresence.map((item) => (
          <span
            key={item.userId}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: item.color }}
            title={item.userName}
          >
            {getInitials(item.userName)}
          </span>
        ))}
      </div>
      <Badge variant="secondary" className="gap-1.5">
        <UsersRound className="h-3.5 w-3.5" />
        {presence.length}
      </Badge>
    </div>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials.toUpperCase() || "?";
}
