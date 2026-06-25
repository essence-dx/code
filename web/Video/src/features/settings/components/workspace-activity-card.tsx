"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Activity, Download, KeyRound, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createWorkspaceActivityReport, type WorkspaceActivityReport } from "@/lib/projects/collaboration-store";

export interface WorkspaceAiActivitySummary {
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  recentEvents: number;
  recentGenerations: number;
}

export function WorkspaceActivityCard({ aiSummary }: { aiSummary: WorkspaceAiActivitySummary | null }) {
  const [report, setReport] = useState<WorkspaceActivityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    createWorkspaceActivityReport()
      .then((nextReport) => {
        if (!mounted) return;
        setReport(nextReport);
        setError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setError("Workspace activity is unavailable on this device.");
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          Workspace activity
          <Badge variant="secondary">{report ? "Local history" : "Loading"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Activity unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <ActivityMetric icon={<Users className="size-4" />} label="Members" value={report ? String(report.memberCount) : "-"} />
          <ActivityMetric icon={<Download className="size-4" />} label="Exports" value={report ? String(report.exportReviewCount) : "-"} />
          <ActivityMetric icon={<Sparkles className="size-4" />} label="AI generations" value={aiSummary ? String(aiSummary.recentGenerations) : "-"} />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <SmallMetric label="Folders" value={report ? `${report.folderCount} / ${report.privateFolderCount} private` : "-"} />
          <SmallMetric label="Invites" value={report ? String(report.invitationCount) : "-"} />
          <SmallMetric label="Project access" value={report ? String(report.projectPermissionCount) : "-"} />
          <SmallMetric label="Audit events" value={report ? String(report.auditEventCount) : "-"} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SmallMetric icon={<KeyRound className="size-3.5" />} label="Access records" value={report ? String(report.projectPermissionCount + report.invitationCount) : "-"} />
          <SmallMetric label="Downloads" value={report ? `${report.downloadCount} / ${formatBytes(report.downloadBytes)}` : "-"} />
          <SmallMetric icon={<ShieldCheck className="size-3.5" />} label="Publish prep" value={report ? String(report.publishPrepCount) : "-"} />
        </div>

        {aiSummary ? (
          <div className="rounded-md border border-border p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">AI usage</span>
              <Badge variant="outline">{aiSummary.dailyRemaining} left today</Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {aiSummary.dailyUsed}/{aiSummary.dailyLimit} daily actions used across {aiSummary.recentEvents} recent AI events.
            </div>
          </div>
        ) : (
          <Alert>
            <AlertTitle>Private AI activity</AlertTitle>
            <AlertDescription>Sign in to include team AI usage and generation history in this workspace view.</AlertDescription>
          </Alert>
        )}

        {report?.recentExports.length ? (
          <div className="space-y-2">
            {report.recentExports.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{item.outputName}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.format.toUpperCase()} / {item.preset} / {formatActivityDate(item.createdAt)}
                  </div>
                </div>
                <Badge variant={item.reviewStatus === "approved" ? "default" : item.reviewStatus === "changes-requested" ? "destructive" : "secondary"}>
                  {reviewStatusLabel(item.reviewStatus)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Completed export reviews will appear here after the first reviewed export.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function SmallMetric({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-2 text-sm">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function reviewStatusLabel(status: WorkspaceActivityReport["recentExports"][number]["reviewStatus"]) {
  if (status === "approved") return "Approved";
  if (status === "changes-requested") return "Changes";
  return "Review";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
