"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Clock3,
  Download,
  FileClock,
  Globe2,
  KeyRound,
  Loader2,
  MessageSquare,
  Rocket,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getProjectAuditLog } from "../project-api";
import type { ProjectAuditCategory, ProjectAuditEvent, ProjectAuditLog as ProjectAuditLogData, ProjectAuditStatus } from "../types";

interface ProjectAuditLogProps {
  projectId: string;
  projectName: string;
}

type LoadState = "idle" | "loading" | "ready" | "error";

const categoryLabels: Record<ProjectAuditCategory, string> = {
  comments: "Comments",
  exports: "Exports",
  permissions: "Permissions",
  publishing: "Publishing",
  releases: "Releases",
  versions: "Versions",
};

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function categoryIcon(category: ProjectAuditCategory) {
  if (category === "permissions") {
    return <KeyRound className="size-4" />;
  }

  if (category === "publishing") {
    return <Globe2 className="size-4" />;
  }

  if (category === "exports") {
    return <Download className="size-4" />;
  }

  if (category === "comments") {
    return <MessageSquare className="size-4" />;
  }

  if (category === "releases") {
    return <Rocket className="size-4" />;
  }

  return <Archive className="size-4" />;
}

function statusIcon(status: ProjectAuditStatus) {
  if (status === "success") {
    return <CheckCircle2 className="size-3.5 text-emerald-500" />;
  }

  if (status === "danger") {
    return <ShieldAlert className="size-3.5 text-destructive" />;
  }

  if (status === "warning") {
    return <Clock3 className="size-3.5 text-amber-500" />;
  }

  return <FileClock className="size-3.5 text-muted-foreground" />;
}

function statusClassName(status: ProjectAuditStatus) {
  if (status === "success") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (status === "danger") {
    return "border-destructive/20 bg-destructive/10 text-destructive";
  }

  if (status === "warning") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-border bg-muted/40 text-muted-foreground";
}

function AuditEventRow({ event }: { event: ProjectAuditEvent }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border", statusClassName(event.status))}>{categoryIcon(event.category)}</div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-medium">{event.title}</h3>
            <Badge className="rounded-md text-[10px]" variant="secondary">
              {categoryLabels[event.category]}
            </Badge>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{event.description}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>{formatEventTime(event.occurredAt)}</span>
            {event.actorName || event.actorEmail ? <span>{event.actorName || event.actorEmail}</span> : null}
          </div>
        </div>
        <div className="mt-0.5 shrink-0">{statusIcon(event.status)}</div>
      </div>
    </div>
  );
}

function AuditSummary({ auditLog }: { auditLog: ProjectAuditLogData }) {
  const categories = useMemo(
    () =>
      (Object.keys(categoryLabels) as ProjectAuditCategory[]).filter((category) => auditLog.summary[category] > 0),
    [auditLog.summary],
  );

  return (
    <div className="grid grid-cols-2 gap-2 px-4 sm:grid-cols-3">
      {categories.map((category) => (
        <div key={category} className="rounded-md border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {categoryIcon(category)}
            {categoryLabels[category]}
          </div>
          <p className="mt-1 text-lg font-semibold">{auditLog.summary[category]}</p>
        </div>
      ))}
    </div>
  );
}

export function ProjectAuditLog({ projectId, projectName }: ProjectAuditLogProps) {
  const [open, setOpen] = useState(false);
  const [auditLog, setAuditLog] = useState<ProjectAuditLogData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");

  useEffect(() => {
    if (!open || auditLog || loadState !== "idle") {
      return;
    }

    let cancelled = false;

    async function loadAuditLog() {
      setLoadState("loading");

      try {
        const response = await getProjectAuditLog(projectId);

        if (!cancelled) {
          setAuditLog(response.auditLog);
          setLoadState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Audit log failed to load");
          setLoadState("error");
        }
      }
    }

    void loadAuditLog();

    return () => {
      cancelled = true;
    };
  }, [auditLog, loadState, open, projectId]);

  function retry() {
    setAuditLog(null);
    setLoadState("idle");
  }

  return (
    <>
      <Button className="w-full justify-start gap-2" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <FileClock className="size-4" />
        Audit log
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Project audit log</SheetTitle>
            <SheetDescription>{projectName}</SheetDescription>
          </SheetHeader>

          {loadState === "loading" ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading audit log
            </div>
          ) : null}

          {loadState === "error" ? (
            <div className="mx-4 space-y-3 rounded-md border border-border p-4 text-sm">
              <p className="text-muted-foreground">Audit log could not be loaded.</p>
              <Button className="w-full" variant="secondary" onClick={retry}>
                Retry
              </Button>
            </div>
          ) : null}

          {auditLog && auditLog.events.length > 0 ? (
            <>
              <AuditSummary auditLog={auditLog} />
              <ScrollArea className="min-h-0 flex-1 px-4">
                <div className="space-y-2 pb-4">
                  {auditLog.events.map((event) => (
                    <AuditEventRow key={event.id} event={event} />
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : null}

          {auditLog && auditLog.events.length === 0 ? <div className="mx-4 rounded-md border border-border p-4 text-sm text-muted-foreground">No audit events yet.</div> : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
