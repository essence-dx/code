import { CheckCircle2, Cpu, Download, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeCadKernelExecutionRun,
  NativeCadKernelExecutionRunnerReport,
  NativeCadKernelExecutionRunnerStatus,
} from "@/features/projects/native-cad-kernel-execution-runner";

function statusVariant(status: NativeCadKernelExecutionRunnerStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeCadKernelExecutionRunnerStatus }) {
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

function RunnerRow({ row }: { row: NativeCadKernelExecutionRun }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Cpu className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.adapterId.toUpperCase()}</p>
            <p className="truncate text-xs text-muted-foreground">{row.runId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.outputPath ?? row.failureReason ?? "No output attached yet."}</p>
        <p className="mt-1 truncate">{row.sandboxCwd}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{row.diagnosticHash}</p>
        <p className="mt-1">{row.durationMs ? `${row.durationMs} ms` : "No duration"} / {row.timeoutMs} ms timeout</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">{row.nextAction}</TableCell>
    </TableRow>
  );
}

export function NativeCadKernelExecutionRunnerPanel({ report }: { report: NativeCadKernelExecutionRunnerReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="size-4" />
              Native CAD kernel execution runner
            </CardTitle>
            <CardDescription>Controlled FreeCAD/OCCT worker execution evidence with output paths, diagnostics, sandbox bounds, and release-ready hashes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.runnerScore < 80 ? "destructive" : "outline"}>
              {report.summary.runnerScore}/100 runner
            </Badge>
            <Button render={<a download={report.csvFileName} href={report.csvDataUri} />} className="h-8 gap-2" size="sm" variant="outline">
              <Download className="size-4" />
              CSV
            </Button>
            <Button render={<a download={report.jsonFileName} href={report.jsonDataUri} />} className="h-8 gap-2" size="sm" variant="outline">
              <FileJson2 className="size-4" />
              JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="runner executions" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="output attached" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${report.summary.reviewCount}`} />
          <SummaryTile detail="blocked workers" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Gate" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Runner action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.runnerHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Adapter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Output</TableHead>
              <TableHead>Diagnostics</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.length > 0 ? (
              report.rows.map((row) => <RunnerRow key={row.runId} row={row} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No native CAD kernel runner executions have been recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
