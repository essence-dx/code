import { CheckCircle2, Download, FileJson2, FolderSearch, PackageOpen, Table2, Terminal, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeCadRuntimeBundleInstallerVerificationFileFormat,
  NativeCadRuntimeBundleInstallerVerificationReport,
  NativeCadRuntimeBundleInstallerVerificationRow,
  NativeCadRuntimeBundleInstallerVerificationStatus,
} from "@/features/projects/native-cad-runtime-bundle-installer-verification";

function statusVariant(status: NativeCadRuntimeBundleInstallerVerificationStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeCadRuntimeBundleInstallerVerificationStatus }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeCadRuntimeBundleInstallerVerificationFileFormat }) {
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

function VerificationFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "destructive"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function VerificationRow({ row }: { row: NativeCadRuntimeBundleInstallerVerificationRow }) {
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
          <VerificationFlag enabled={row.bundleLayoutReady} label="layout" />
          <VerificationFlag enabled={row.discoveryReady} label="discovery" />
          <VerificationFlag enabled={row.executionReady} label="execution" />
          <VerificationFlag enabled={row.fixtureReady} label="fixture" />
        </div>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.bundleRoot || "missing bundle root"}</p>
        <p className="mt-1 truncate">{row.discoveredExecutablePath || "missing executable path"}</p>
        <p className="mt-1 truncate">{row.sandboxProfile || "missing sandbox profile"}</p>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate">{row.fixtureCommand || "missing fixture command"}</p>
        <p className="mt-1 truncate font-mono">{row.verificationHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeCadRuntimeBundleInstallerVerificationPanel({ report }: { report: NativeCadRuntimeBundleInstallerVerificationReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageOpen className="size-4" />
              CAD runtime bundle installer verification
            </CardTitle>
            <CardDescription>Packaged FreeCAD/OCCT desktop layout discovery, executable rehearsal, fixture output proof, sandbox profile, and exportable fulfillment evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.verificationScore < 80 ? "destructive" : "outline"}>
              {report.summary.verificationScore}/100 verification
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
          <SummaryTile detail="ready rows" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="discovered paths" label="Discovery" value={`${report.summary.discoveredCount}`} />
          <SummaryTile detail="command rehearsals" label="Execution" value={`${report.summary.executionReadyCount}`} />
          <SummaryTile detail="fixture outputs" label="Fixtures" value={`${report.summary.fixtureReadyCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Bundle action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.verificationHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Adapter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Bundle</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <VerificationRow key={row.adapterId} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          <FolderSearch className="size-3.5" />
          {report.summary.verificationHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
