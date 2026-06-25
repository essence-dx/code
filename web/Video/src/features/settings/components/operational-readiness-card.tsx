"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CircleAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEditorStore } from "@/features/editor/state/editor-store";
import {
  createOperationalReadinessReport,
  type OperationalReadinessStatus,
} from "@/lib/operations/operational-readiness";
import { createProjectLibraryHealthReport, type ProjectLibraryHealthReport } from "@/lib/projects/project-health";
import { listLocalProjects } from "@/lib/projects/local-project-store";
import { useHasClientApiRuntime } from "@/lib/runtime/client-api";

export function OperationalReadinessCard({
  aiConfigured,
  isSignedIn,
  dailyAiRemaining,
}: {
  aiConfigured: boolean;
  isSignedIn: boolean;
  dailyAiRemaining: number | null;
}) {
  const exportJobs = useEditorStore((state) => state.exportJobs);
  const hasOnlineActions = useHasClientApiRuntime();
  const [projectLibrary, setProjectLibrary] = useState<ProjectLibraryHealthReport | null>(null);
  const [localProjectStatus, setLocalProjectStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadProjectHealth() {
      try {
        const projects = await listLocalProjects();
        if (cancelled) return;
        setProjectLibrary(createProjectLibraryHealthReport(projects));
        setLocalProjectStatus("ready");
      } catch {
        if (cancelled) return;
        setLocalProjectStatus("failed");
      }
    }

    void loadProjectHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  const report = useMemo(
    () =>
      createOperationalReadinessReport({
        projectLibrary,
        localProjectStatus,
        exportJobs,
        hasOnlineActions,
        isSignedIn,
        aiConfigured,
        dailyAiRemaining,
      }),
    [aiConfigured, dailyAiRemaining, exportJobs, hasOnlineActions, isSignedIn, localProjectStatus, projectLibrary],
  );

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-lg">
          <span className="flex min-w-0 items-center gap-2">
            <Activity className="size-4 shrink-0" />
            Operational readiness
          </span>
          <Badge variant={statusBadgeVariant(report.status)}>{report.score}/100</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {report.label === "Ready"
            ? "Project health, media, exports, account access, and AI limits are ready."
            : "Resolve the highest-risk operational items before a serious export or handoff."}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {report.signals.map((signal) => {
            const Icon = signal.status === "ready" ? ShieldCheck : CircleAlert;
            return (
              <div key={signal.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className={`size-4 shrink-0 ${signal.status === "blocked" ? "text-destructive" : signal.status === "attention" ? "text-amber-300" : "text-primary"}`} />
                    <div className="truncate text-sm font-medium">{signal.label}</div>
                  </div>
                  <Badge variant={statusBadgeVariant(signal.status)}>{signal.count ?? statusLabel(signal.status)}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{signal.detail}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function statusLabel(status: OperationalReadinessStatus) {
  if (status === "blocked") return "Blocked";
  if (status === "attention") return "Attention";
  return "Ready";
}

function statusBadgeVariant(status: OperationalReadinessStatus) {
  if (status === "blocked") return "destructive";
  if (status === "attention") return "secondary";
  return "default";
}
