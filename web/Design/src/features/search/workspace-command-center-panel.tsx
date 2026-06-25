"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Command,
  ExternalLink,
  Search,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  WorkspaceCommandCenter,
  WorkspaceCommandItem,
  WorkspaceCommandStatus,
  WorkspaceSavedFilter,
} from "@/features/search/workspace-command-center";
import { filterWorkspaceCommandItems } from "@/features/search/workspace-command-center";
import { cn } from "@/lib/utils";

type WorkspaceCommandCenterPanelProps = {
  center: WorkspaceCommandCenter;
};

const statusLabels: Record<WorkspaceCommandStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  WorkspaceCommandStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function WorkspaceCommandCenterPanel({
  center,
}: WorkspaceCommandCenterPanelProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => filterWorkspaceCommandItems(center.items, query),
    [center.items, query],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Command className="h-5 w-5" />
              Workspace command center
            </CardTitle>
            <CardDescription>
              Search projects, assets, templates, comments, tasks, exports, and
              saved filters from one place.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Projects" value={center.totals.projects} />
          <Metric label="Assets" value={center.totals.assets} />
          <Metric label="Templates" value={center.totals.templates} />
          <Metric label="Comments" value={center.totals.comments} />
          <Metric label="Tasks" value={center.totals.tasks} />
          <Metric label="Exports" value={center.totals.exports} />
          <Metric label="Filters" value={center.totals.savedFilters} />
          <Metric label="Indexed" value={center.totals.searchableItems} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-md border border-border">
            <div className="border-b border-border p-4">
              <label className="text-sm font-semibold" htmlFor="workspace-search">
                Search workspace
              </label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="workspace-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search projects, templates, exports, tasks..."
                  className="pl-9"
                />
              </div>
              <SavedFilterChips
                filters={center.savedFilters}
                onSelect={setQuery}
              />
            </div>

            <ScrollArea className="h-[440px]">
              <div className="divide-y divide-border">
                {results.length ? (
                  results.map((item) => (
                    <CommandResultRow key={item.id} item={item} />
                  ))
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">
                    No workspace items match this search.
                  </p>
                )}
              </div>
            </ScrollArea>
          </section>

          <RecommendedCommandsPanel commands={center.recommendedCommands} />
        </div>
      </CardContent>
    </Card>
  );
}

function SavedFilterChips({
  filters,
  onSelect,
}: {
  filters: WorkspaceSavedFilter[];
  onSelect: (query: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Button
          key={filter.id}
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onSelect(filter.query)}
        >
          {filter.title}
          <Badge variant="secondary">{filter.resultCount}</Badge>
        </Button>
      ))}
    </div>
  );
}

function CommandResultRow({ item }: { item: WorkspaceCommandItem }) {
  return (
    <article className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{item.kindLabel}</Badge>
            <Badge variant={statusVariants[item.status]}>
              {item.badge || statusLabels[item.status]}
            </Badge>
            <p className="truncate text-sm font-semibold">{item.title}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {item.detail}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Updated {formatDate(item.updatedAt)}
          </p>
        </div>
        {item.href ? (
          <Button asChild size="sm" variant="ghost" className="shrink-0">
            <a href={item.href}>
              {item.commandLabel}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : (
          <Badge variant="outline" className="shrink-0">
            {item.commandLabel}
          </Badge>
        )}
      </div>
    </article>
  );
}

function RecommendedCommandsPanel({
  commands,
}: {
  commands: WorkspaceCommandItem[];
}) {
  return (
    <section className="rounded-md border border-border">
      <div className="border-b border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ArrowRight className="h-4 w-4" />
          Recommended commands
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Highest-priority review and recovery targets from the workspace index.
        </p>
      </div>
      {commands.length ? (
        <div className="divide-y divide-border">
          {commands.map((command) => (
            <div key={command.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {command.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {command.detail}
                  </p>
                </div>
                <ReadinessIcon status={command.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={statusVariants[command.status]}>
                  {statusLabels[command.status]}
                </Badge>
                <Badge variant="outline">{command.kindLabel}</Badge>
                {command.href ? (
                  <Button asChild size="sm" variant="ghost" className="px-0">
                    <a href={command.href}>
                      {command.commandLabel}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          No urgent workspace commands are pending.
        </p>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Search className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function ReadinessIcon({ status }: { status: WorkspaceCommandStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
