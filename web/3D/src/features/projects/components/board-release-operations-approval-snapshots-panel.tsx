import { BadgeCheck, CheckCircle2, Download, FileJson2, ShieldAlert, TrendingUp, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseOperationsApprovalSnapshot,
  BoardReleaseOperationsApprovalSnapshotReport,
  BoardReleaseOperationsApprovalSnapshotStatus,
} from "@/features/projects/board-release-operations-approval-snapshots";

function statusVariant(status: BoardReleaseOperationsApprovalSnapshotStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseOperationsApprovalSnapshotStatus }) {
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

function SnapshotRow({ snapshot }: { snapshot: BoardReleaseOperationsApprovalSnapshot }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <BadgeCheck className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{snapshot.releasePromotionId ?? "Unassigned release"}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{snapshot.snapshotId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(snapshot.status)}>
          <StatusIcon status={snapshot.status} />
          {snapshot.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{snapshot.approvalRecommendation}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{snapshot.currentGateScore}/100 current</p>
        <p>{snapshot.priorGateScore}/100 prior</p>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={snapshot.gateDrift === "regressed" ? "destructive" : snapshot.gateDrift === "improved" ? "outline" : "secondary"}>
          <TrendingUp className="size-3.5" />
          {snapshot.gateDrift}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">delta {snapshot.scoreDelta}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{snapshot.nextAction}</p>
        <p className="mt-1 truncate font-mono">{snapshot.snapshotHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseOperationsApprovalSnapshotsPanel({ report }: { report: BoardReleaseOperationsApprovalSnapshotReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="size-4" />
              Board release operations approval snapshots
            </CardTitle>
            <CardDescription>Current promotion gate status compared against prior release operations history.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.currentGateScore}/100 gate
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.jsonFileName} href={report.jsonDataUri}>
              <FileJson2 className="size-4" />
              JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryTile detail="snapshots" label="Records" value={`${report.summary.snapshotCount}`} />
          <SummaryTile detail="approval ready" label="Approve" value={`${report.summary.approvalReadyCount}`} />
          <SummaryTile detail="blocked" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="improved" label="Improved" value={`${report.summary.improvedCount}`} />
          <SummaryTile detail="regressed" label="Regressed" value={`${report.summary.regressedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Approval snapshot next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Snapshot</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scores</TableHead>
              <TableHead>Drift</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.snapshots.map((snapshot) => <SnapshotRow key={snapshot.snapshotId} snapshot={snapshot} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
