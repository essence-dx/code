import { Activity, CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardEvidenceReleaseVarianceReport,
  BoardEvidenceReleaseVarianceRow,
  BoardEvidenceReleaseVarianceSeverity,
  BoardEvidenceReleaseVarianceStatus,
} from "@/features/projects/board-evidence-release-variance";

function statusVariant(status: BoardEvidenceReleaseVarianceStatus) {
  if (status === "changed") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function severityVariant(severity: BoardEvidenceReleaseVarianceSeverity) {
  if (severity === "critical") {
    return "destructive" as const;
  }

  return severity === "warning" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardEvidenceReleaseVarianceStatus }) {
  if (status === "stable") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "changed" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function VarianceRow({ variance }: { variance: BoardEvidenceReleaseVarianceRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Activity className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{variance.title}</p>
            <p className="font-mono text-xs text-muted-foreground">{variance.id}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(variance.status)}>
          <StatusIcon status={variance.status} />
          {variance.status}
        </Badge>
        <Badge className="mt-1 rounded-md" variant={severityVariant(variance.severity)}>
          {variance.severity}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{variance.archivedValue}</p>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{variance.currentValue}</p>
        {variance.delta !== null ? <p>delta {variance.delta}</p> : null}
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{variance.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardEvidenceReleaseVariancePanel({ report }: { report: BoardEvidenceReleaseVarianceReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4" />
              Board evidence release variance
            </CardTitle>
            <CardDescription>Compares sealed archive evidence against current closeout and readiness drift.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.blockerCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockerCount} blockers
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile detail="changed checks" label="Variances" value={`${report.summary.varianceCount}`} />
          <SummaryTile detail="critical drift" label="Blockers" value={`${report.summary.blockerCount}`} />
          <SummaryTile detail="warning drift" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="current digest" label="Readiness" value={`${report.summary.currentReadinessScore}/100`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Variance next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Archived</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.variances.map((variance) => <VarianceRow key={variance.id} variance={variance} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
