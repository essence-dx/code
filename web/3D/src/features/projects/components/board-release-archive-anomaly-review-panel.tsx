import { AlertTriangle, CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveAnomalyFinding,
  BoardReleaseArchiveAnomalyReviewReport,
} from "@/features/projects/board-release-archive-anomaly-review";
import type { BoardReleaseCloseoutReadinessGateStatus } from "@/features/projects/board-release-closeout-readiness-gates";

function statusVariant(status: BoardReleaseCloseoutReadinessGateStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseCloseoutReadinessGateStatus }) {
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

function FindingRow({ finding }: { finding: BoardReleaseArchiveAnomalyFinding }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <AlertTriangle className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{finding.sourceTitle}</p>
            <p className="truncate text-xs text-muted-foreground">{finding.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(finding.status)}>
          <StatusIcon status={finding.status} />
          {finding.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{finding.severity}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">{finding.finalDecisionOutcome}</p>
        <p className="truncate text-xs text-muted-foreground">{finding.indexId}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{finding.archiveBundleHash}</p>
        <p className="mt-1 truncate font-mono">{finding.remediationHash}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{finding.nextAction}</p>
        <p className="mt-1 truncate font-mono">{finding.findingHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveAnomalyReviewPanel({ report }: { report: BoardReleaseArchiveAnomalyReviewReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4" />
              Board release archive anomaly review
            </CardTitle>
            <CardDescription>Review repeated hold/defer decisions, stale remediation evidence, and drifting archive bundle correlations.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.criticalCount > 0 ? "destructive" : "outline"}>
              {report.summary.criticalCount} critical
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
          <SummaryTile detail="review findings" label="Findings" value={`${report.summary.findingCount}`} />
          <SummaryTile detail="hold/defer pressure" label="Decision" value={`${report.summary.repeatedDecisionCount}`} />
          <SummaryTile detail="evidence refresh" label="Stale" value={`${report.summary.staleRemediationCount}`} />
          <SummaryTile detail="bundle mismatch risk" label="Drift" value={`${report.summary.archiveDriftCount}`} />
          <SummaryTile detail="checksum" label="Hash" value={report.summary.reviewHash.slice(7, 15)} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Anomaly next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.reviewHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Finding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Evidence chain</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.findings.map((finding) => (
              <FindingRow finding={finding} key={finding.findingId} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
