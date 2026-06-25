"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, Download, FileText, History, Loader2, Save, ShieldAlert, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardOperationsControlCenterReport,
  BoardOperationsControlRow,
  BoardOperationsControlStatus,
} from "@/features/projects/board-operations-control-center";
import type { BoardOperationsReviewCycleHistoryReport } from "@/features/projects/board-operations-review-cycle-history";

function statusVariant(status: BoardOperationsControlStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardOperationsControlStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function SummaryTile({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function ControlRow({ row }: { row: BoardOperationsControlRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ClipboardList className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.label}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.detail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.score}/100</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">{row.owner}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

function firstReviewCycle(report: BoardOperationsControlCenterReport) {
  return {
    id: `${report.workspaceId}-${report.generatedAt.slice(0, 10)}`,
    label: `Board closeout ${report.generatedAt.slice(0, 10)}`,
    owner: report.rows.find((row) => row.id === "closeout-report")?.owner ?? "Board operations",
    savedAt: report.generatedAt,
    status: report.summary.status,
  };
}

export function BoardOperationsControlCenterPanel({
  canPersist,
  history,
  report,
  workspaceId,
}: {
  canPersist?: boolean;
  history?: BoardOperationsReviewCycleHistoryReport | null;
  report: BoardOperationsControlCenterReport;
  workspaceId?: string;
}) {
  const [reviewCycleHistory, setReviewCycleHistory] = useState(history ?? null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveReviewCycle() {
    if (!canPersist || !workspaceId || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/board-operations-review-cycles`, {
        body: JSON.stringify({
          controlCenter: report,
          reviewCycle: firstReviewCycle(report),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; history?: BoardOperationsReviewCycleHistoryReport } | null;

      if (!response.ok || !payload?.history) {
        throw new Error(payload?.error ?? "Board operations review cycle history could not be saved.");
      }

      setReviewCycleHistory(payload.history);
      toast.success("Board operations review cycle saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Board operations review cycle history could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4" />
              Board operations control center
            </CardTitle>
            <CardDescription>Saved review cycles, agenda readiness, packet status, route health, and final closeout controls.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.controlScore < 80 ? "destructive" : "outline"}>
              {report.summary.controlScore}/100 control
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            {reviewCycleHistory ? (
              <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={reviewCycleHistory.csvFileName} href={reviewCycleHistory.csvDataUri}>
                <History className="size-4" />
                History CSV
              </a>
            ) : null}
            {canPersist && workspaceId ? (
              <Button className="h-8 gap-2" disabled={isSaving} onClick={saveReviewCycle} size="sm" type="button" variant="outline">
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save cycle
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="control rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="saved cycles" label="Cycles" value={`${report.summary.savedReviewCycleCount}`} />
          <SummaryTile detail="needs action" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="monitor" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="complete" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="workspace" label="Control" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Control next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            <FileText className="mr-1 inline size-3.5" />
            {report.closeoutReport.split("\n").at(3) ?? "Closeout report ready."}
          </p>
        </div>

        {reviewCycleHistory ? (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <SummaryTile detail="saved cycles" label="History" value={`${reviewCycleHistory.summary.totalRecordCount}`} />
            <SummaryTile detail="needs closeout" label="Blocked" value={`${reviewCycleHistory.summary.blockedRecordCount}`} />
            <SummaryTile detail="closed cycles" label="Closed" value={`${reviewCycleHistory.summary.closedRecordCount}`} />
            <SummaryTile detail="watch cycles" label="Watch" value={`${reviewCycleHistory.summary.watchRecordCount}`} />
            <SummaryTile detail="unique owners" label="Owners" value={`${reviewCycleHistory.summary.ownerCount}`} />
            <SummaryTile detail={reviewCycleHistory.summary.latestSavedAt ?? "No save"} label="Latest" value={reviewCycleHistory.summary.latestStatus ?? "none"} />
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Control</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <ControlRow key={row.id} row={row} />)}</TableBody>
        </Table>

        {reviewCycleHistory ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Saved cycle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead>Files</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewCycleHistory.records.slice(0, 6).map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="max-w-[260px] whitespace-normal">
                    <p className="font-medium">{record.reviewCycle.label}</p>
                    <p className="text-xs text-muted-foreground">{record.createdAt}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={statusVariant(record.status)}>
                      <StatusIcon status={record.status} />
                      {record.ownerCloseoutState}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{record.controlScore}/100</TableCell>
                  <TableCell className="max-w-[260px] break-all font-mono text-xs text-muted-foreground">{record.auditHash}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={`/api/workspaces/${workspaceId ?? report.workspaceId}/board-operations-review-cycles/${record.id}?format=json`}>
                        JSON
                      </a>
                      <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={`/api/workspaces/${workspaceId ?? report.workspaceId}/board-operations-review-cycles/${record.id}?format=csv`}>
                        CSV
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
