import { CalendarClock, CheckCircle2, ClipboardCheck, FileJson2, Table2, TriangleAlert, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RuntimeReleaseApprovalChecklist, RuntimeReleaseApprovalChecklistStatus } from "@/features/projects/runtime-release-approval-checklist";

function statusVariant(status: RuntimeReleaseApprovalChecklistStatus) {
  return status === "approved" ? "outline" : "destructive";
}

function StatusIcon({ status }: { status: RuntimeReleaseApprovalChecklistStatus }) {
  return status === "approved" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

export function RuntimeReleaseApprovalChecklistPanel({ checklist }: { checklist: RuntimeReleaseApprovalChecklist }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4" />
              Runtime release approval
            </CardTitle>
            <CardDescription>Reviewer, notes, gate evidence, and expiry state for the current runtime release candidate.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(checklist.summary.status)}>
              <StatusIcon status={checklist.summary.status} />
              {checklist.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={checklist.summary.approvalScore < 100 ? "destructive" : "outline"}>
              {checklist.summary.approvalScore}/100 approval
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border bg-background p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <UserRound className="size-4" />
              {checklist.summary.reviewerName}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{checklist.summary.reviewerEmail ?? "Needs reviewer assignment"}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="size-4" />
              Expires
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(checklist.expiresAt)}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-sm font-medium">{checklist.releaseCandidateId}</p>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{checklist.summary.approvalHash}</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {checklist.rows.map((row) => (
            <div key={row.gateId} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.gateLabel}</p>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{row.evidenceHash}</p>
                </div>
                <Badge className="shrink-0 rounded-md" variant={statusVariant(row.status)}>
                  {row.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<a download={checklist.csvFileName} href={checklist.csvDataUri} />} className="gap-2" size="sm" variant="outline">
            <Table2 className="size-4" />
            CSV
          </Button>
          <Button render={<a download={checklist.jsonFileName} href={checklist.jsonDataUri} />} className="gap-2" size="sm" variant="outline">
            <FileJson2 className="size-4" />
            JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
