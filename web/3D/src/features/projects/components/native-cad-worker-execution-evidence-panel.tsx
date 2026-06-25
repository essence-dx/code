import { CheckCircle2, Cpu, Download, FileJson2, ShieldAlert, Table2, Terminal, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeCadWorkerExecutionEvidenceFileFormat,
  NativeCadWorkerExecutionEvidenceReport,
  NativeCadWorkerExecutionEvidenceRow,
  NativeCadWorkerExecutionEvidenceStatus,
} from "@/features/projects/native-cad-worker-execution-evidence";

function statusVariant(status: NativeCadWorkerExecutionEvidenceStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeCadWorkerExecutionEvidenceStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeCadWorkerExecutionEvidenceFileFormat }) {
  return format === "json" ? <FileJson2 className="size-4" /> : <Table2 className="size-4" />;
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

function EvidenceFlag({ active, label }: { active: boolean; label: string }) {
  return (
    <Badge className="rounded-md" variant={active ? "outline" : "destructive"}>
      {label}
    </Badge>
  );
}

function WorkerRow({ row }: { row: NativeCadWorkerExecutionEvidenceRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Terminal className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.adapterId.toUpperCase()}</p>
            <p className="truncate text-xs text-muted-foreground">{row.command}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-1">
          <EvidenceFlag active={row.commandAvailable} label="command" />
          <EvidenceFlag active={row.fixturePassed} label="fixture" />
          <EvidenceFlag active={row.sandboxReady} label="sandbox" />
        </div>
        <p className="mt-2">
          {row.fixtureName} / exit {row.exitCode}
        </p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p>{row.sandboxLimits}</p>
        <p className="mt-1 truncate">{row.version}</p>
        <p className="mt-1 truncate font-mono">{row.outputHash}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.evidenceHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeCadWorkerExecutionEvidencePanel({ report }: { report: NativeCadWorkerExecutionEvidenceReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="size-4" />
              Native CAD worker execution evidence
            </CardTitle>
            <CardDescription>FreeCAD/OCCT command availability, fixture output, sandbox limits, and failure diagnostics for native CAD worker release evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.evidenceScore < 80 ? "destructive" : "outline"}>
              {report.summary.evidenceScore}/100 evidence
            </Badge>
            {report.files.map((file) => (
              <Button key={file.format} render={<a download={file.download} href={file.href} />} className="h-8 gap-2" size="sm" variant="outline">
                <FileIcon format={file.format} />
                {file.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="worker evidence rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="release-ready workers" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${report.summary.reviewCount}`} />
          <SummaryTile detail="blocked workers" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Evidence" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Worker evidence action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.evidenceHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Worker</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Sandbox / Output</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <WorkerRow key={row.workerId} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {report.summary.evidenceHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
