import { CheckCircle2, Cpu, Download, FileJson2, MessageSquareWarning, ShieldAlert, Table2, Terminal, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeCadKernelRuntimeCloseoutFileFormat,
  NativeCadKernelRuntimeCloseoutReport,
  NativeCadKernelRuntimeCloseoutRow,
  NativeCadKernelRuntimeCloseoutStatus,
} from "@/features/projects/native-cad-kernel-runtime-closeout";

function statusVariant(status: NativeCadKernelRuntimeCloseoutStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeCadKernelRuntimeCloseoutStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeCadKernelRuntimeCloseoutFileFormat }) {
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

function CloseoutFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "destructive"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function RuntimeRow({ row }: { row: NativeCadKernelRuntimeCloseoutRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Terminal className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.adapterId.toUpperCase()}</p>
            <p className="truncate text-xs text-muted-foreground">{row.installedVersion || "missing version"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal">
        <div className="flex flex-wrap gap-1.5">
          <CloseoutFlag enabled={row.runtimePathReady} label="runtime path" />
          <CloseoutFlag enabled={row.fixtureCoverageReady} label="fixtures" />
          <CloseoutFlag enabled={row.sandboxReady} label="sandbox" />
          <CloseoutFlag enabled={row.customerFallbackReady} label="fallback" />
        </div>
      </TableCell>
      <TableCell className="max-w-[380px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.bundledRuntimePath || "missing bundled runtime path"}</p>
        <p className="mt-1">{row.conversionFixtureCount} conversion fixtures</p>
        <p className="mt-1 truncate">{row.sandboxLimits}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.closeoutHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeCadKernelRuntimeCloseoutPanel({ report }: { report: NativeCadKernelRuntimeCloseoutReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="size-4" />
              Native CAD kernel runtime closeout
            </CardTitle>
            <CardDescription>Bundled FreeCAD/OCCT runtime paths, conversion fixture diagnostics, sandbox limits, and customer fallback messaging for native CAD closeout.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.closeoutScore < 80 ? "destructive" : "outline"}>
              {report.summary.closeoutScore}/100 closeout
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
          <SummaryTile detail="adapter rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="ready runtimes" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="release blockers" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="fixture total" label="Fixtures" value={`${report.summary.fixtureCoverageCount}`} />
          <SummaryTile detail="fallback messages" label="Fallbacks" value={`${report.summary.fallbackMessageCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Runtime closeout action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.closeoutHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Adapter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Closeout</TableHead>
              <TableHead>Runtime</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <RuntimeRow key={row.adapterId} row={row} />)}</TableBody>
        </Table>

        <div className="flex flex-wrap gap-2">
          <Badge className="gap-1 rounded-md" variant="outline">
            <Download className="size-3.5" />
            {report.summary.closeoutHash}
          </Badge>
          <Badge className="gap-1 rounded-md" variant="outline">
            <MessageSquareWarning className="size-3.5" />
            customer fallback ready
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
