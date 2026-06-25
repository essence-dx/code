import { Activity, AlertTriangle, Download, Radar, ShieldCheck, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OperationalAnomalyDetectionReport, OperationalAnomalySeverity, OperationalAnomalySource } from "@/features/projects/operational-anomaly-detection";

const sourceLabels: Record<OperationalAnomalySource, string> = {
  "cad-workers": "CAD",
  "collaboration-runtime": "Collaboration",
  correlation: "Correlation",
  "email-delivery": "Email",
  "public-surfaces": "Public",
  "webhook-delivery": "Webhooks",
};

function severityVariant(severity: OperationalAnomalySeverity) {
  if (severity === "critical") {
    return "destructive" as const;
  }

  return severity === "warning" ? "secondary" : "outline";
}

function SeverityIcon({ severity }: { severity: OperationalAnomalySeverity }) {
  return severity === "critical" ? <AlertTriangle className="size-3.5" /> : <Activity className="size-3.5" />;
}

function formatDateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not observed";
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

export function OperationalAnomalyDetectionPanel({ report }: { report: OperationalAnomalyDetectionReport }) {
  const visibleRows = report.rows.slice(0, 10);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radar className="size-4" />
              Operational anomalies
            </CardTitle>
            <CardDescription>Correlated runtime, webhook, email, CAD worker, and public-surface signals before release work depends on them.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={report.summary.status === "blocked" ? "destructive" : report.summary.status === "watch" ? "secondary" : "outline"}>
              {report.summary.status === "ready" ? <ShieldCheck className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
              {report.summary.anomalyScore}/100
            </Badge>
            <Badge className="rounded-md" variant={report.summary.correlatedCount > 0 ? "secondary" : "outline"}>
              {report.summary.correlatedCount} correlated
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail={report.summary.status} label="Score" value={`${report.summary.anomalyScore}/100`} />
          <SummaryTile detail="release blockers" label="Critical" value={`${report.summary.criticalCount}`} />
          <SummaryTile detail="needs review" label="Warnings" value={`${report.summary.warningCount}`} />
          <SummaryTile detail="cross-signal findings" label="Correlated" value={`${report.summary.correlatedCount}`} />
          <SummaryTile detail={report.summary.topSource ? sourceLabels[report.summary.topSource] : "No source"} label="Top source" value={`${report.summary.sourceCoverage.length}`} />
        </div>

        <div className="flex flex-wrap gap-2">
          {report.summary.sourceCoverage.map((source) => (
            <Badge key={source} className="rounded-md" variant="outline">
              {sourceLabels[source]}
            </Badge>
          ))}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Anomaly</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Observed</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[320px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Workflow className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{row.label}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{row.detail}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={severityVariant(row.severity)}>
                      <SeverityIcon severity={row.severity} />
                      {row.severity}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">{row.confidence}% confidence</p>
                  </TableCell>
                  <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.evidence}</p>
                    <p className="mt-1">{row.affectedCount} affected</p>
                  </TableCell>
                  <TableCell className="whitespace-normal text-xs text-muted-foreground">{formatDateTime(row.observedAt)}</TableCell>
                  <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.nextAction}</p>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No operational anomalies were detected in the current workspace signals.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
