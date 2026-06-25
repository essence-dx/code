"use client";

import { Download, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  filterLocalMaintenanceHistory,
  localMaintenanceHistoryLabel,
  type LocalMaintenanceHistoryEntry,
  type LocalMaintenanceHistoryFilter,
} from "@/lib/operations/local-maintenance-history";

interface LocalMaintenanceHistoryPanelProps {
  entries: LocalMaintenanceHistoryEntry[];
  filter: LocalMaintenanceHistoryFilter;
  onFilterChange: (filter: LocalMaintenanceHistoryFilter) => void;
  onSaveSnapshot: () => void;
  onDownloadPacket: () => void;
}

export function LocalMaintenanceHistoryPanel({
  entries,
  filter,
  onDownloadPacket,
  onFilterChange,
  onSaveSnapshot,
}: LocalMaintenanceHistoryPanelProps) {
  const filteredEntries = filterLocalMaintenanceHistory(entries, filter);

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Maintenance evidence</div>
          <div className="text-xs text-muted-foreground">
            {entries[0] ? `${localMaintenanceHistoryLabel(entries[0])} snapshot from ${formatHistoryTime(entries[0].savedAt)}` : "No maintenance snapshots saved yet"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onSaveSnapshot} aria-label="Save maintenance snapshot">
            <Save className="size-3.5" />
            Save snapshot
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onDownloadPacket} aria-label="Export maintenance evidence packet">
            <Download className="size-3.5" />
            Export packet
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["all", "ready", "draft", "blocked"] as const).map((nextFilter) => (
          <Button
            key={nextFilter}
            type="button"
            size="sm"
            variant={filter === nextFilter ? "default" : "outline"}
            aria-label={`Show ${maintenanceFilterLabel(nextFilter).toLowerCase()} maintenance evidence`}
            aria-pressed={filter === nextFilter}
            onClick={() => onFilterChange(nextFilter)}
          >
            {maintenanceFilterLabel(nextFilter)}
          </Button>
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        {filteredEntries.length > 0 ? (
          filteredEntries.slice(0, 4).map((entry) => (
            <div key={entry.id} className="rounded-md bg-muted/40 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Badge variant={maintenanceHistoryBadgeVariant(entry)}>{localMaintenanceHistoryLabel(entry)}</Badge>
                  <span className="text-xs text-muted-foreground">{formatHistoryTime(entry.savedAt)}</span>
                </div>
                <Badge variant="outline">{entry.score}/100</Badge>
              </div>
              <div className="mt-1 truncate text-xs text-muted-foreground">
                {entry.projectTitle} / {entry.readyCount} ready / {entry.attentionCount} draft / {entry.blockedCount} blocked
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">No snapshots match this filter.</div>
        )}
      </div>
    </div>
  );
}

function maintenanceFilterLabel(filter: LocalMaintenanceHistoryFilter) {
  if (filter === "all") return "All";
  if (filter === "ready") return "Ready";
  if (filter === "blocked") return "Blocked";
  return "Draft";
}

function maintenanceHistoryBadgeVariant(entry: LocalMaintenanceHistoryEntry) {
  const label = localMaintenanceHistoryLabel(entry);
  if (label === "Ready") return "default";
  if (label === "Blocked") return "destructive";
  return "secondary";
}

function formatHistoryTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
