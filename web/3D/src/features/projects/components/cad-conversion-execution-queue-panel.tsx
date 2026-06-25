import { CheckCircle2, Download, FileJson2, RotateCcw, ShieldAlert, Timer, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectCadConversionJobStatus } from "@/features/projects/cad-conversion-worker";
import type { CadConversionExecutionQueueReport, CadConversionExecutionQueueRow } from "@/features/projects/cad-conversion-execution-queue";

function statusVariant(status: ProjectCadConversionJobStatus) {
  if (status === "failed") {
    return "destructive" as const;
  }

  return status === "retryable-failed" || status === "running" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: ProjectCadConversionJobStatus }) {
  if (status === "succeeded") {
    return <CheckCircle2 className="size-3.5" />;
  }

  if (status === "retryable-failed") {
    return <RotateCcw className="size-3.5" />;
  }

  if (status === "queued" || status === "running") {
    return <Timer className="size-3.5" />;
  }

  return <ShieldAlert className="size-3.5" />;
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

function ExecutionRow({ row }: { row: CadConversionExecutionQueueRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Workflow className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.sourceFileName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.jobId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">{row.adapterContract}</TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">{row.retryState}</TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.failureReason}</p>
        <p className="mt-1 truncate font-mono">{row.diagnosticHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function CadConversionExecutionQueuePanel({ report }: { report: CadConversionExecutionQueueReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="size-4" />
              CAD conversion execution
            </CardTitle>
            <CardDescription>Kernel adapter contracts, retry state, diagnostic hashes, and operator-visible failure reasons for native CAD conversions.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={report.summary.status === "blocked" ? "destructive" : report.summary.status === "review" ? "secondary" : "outline"}>
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.executionScore < 70 ? "destructive" : "outline"}>
              {report.summary.executionScore}/100 execution
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="execution records" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="finished outputs" label="Succeeded" value={`${report.summary.succeededCount}`} />
          <SummaryTile detail="retryable records" label="Retryable" value={`${report.summary.retryableCount}`} />
          <SummaryTile detail="active workers" label="Running" value={`${report.summary.runningCount}`} />
          <SummaryTile detail="blocked records" label="Blocked" value={`${report.summary.blockedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Execution action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.executionHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Adapter Contract</TableHead>
              <TableHead>Retry State</TableHead>
              <TableHead>Diagnostics</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.length > 0 ? (
              report.rows.map((row) => <ExecutionRow key={row.jobId} row={row} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No CAD conversion execution records have been queued yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
