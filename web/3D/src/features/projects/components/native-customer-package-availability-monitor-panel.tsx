import { CheckCircle2, Download, FileJson2, Globe2, PackageCheck, RadioTower, ShieldAlert, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeCustomerPackageAvailabilityEndpointKind,
  NativeCustomerPackageAvailabilityFileFormat,
  NativeCustomerPackageAvailabilityMonitor,
  NativeCustomerPackageAvailabilityRow,
  NativeCustomerPackageAvailabilityStatus,
} from "@/features/projects/native-customer-package-availability-monitor";

function statusVariant(status: NativeCustomerPackageAvailabilityStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeCustomerPackageAvailabilityStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function EndpointIcon({ endpointKind }: { endpointKind: NativeCustomerPackageAvailabilityEndpointKind }) {
  if (endpointKind === "updater-endpoint") {
    return <RadioTower className="size-4" />;
  }

  return endpointKind === "self-hosted-archive-mirror" ? <PackageCheck className="size-4" /> : <Globe2 className="size-4" />;
}

function FileIcon({ format }: { format: NativeCustomerPackageAvailabilityFileFormat }) {
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

function AvailabilityFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "destructive"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function AvailabilityRow({ row }: { row: NativeCustomerPackageAvailabilityRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <EndpointIcon endpointKind={row.endpointKind} />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.platform}</p>
            <p className="truncate text-xs text-muted-foreground">{row.endpointKind}</p>
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
          <AvailabilityFlag enabled={row.reachable} label="reachable" />
          <AvailabilityFlag enabled={row.tlsValid} label="TLS" />
          <AvailabilityFlag enabled={row.checksumAttached} label="checksum" />
          <AvailabilityFlag enabled={row.customerSafe} label="safe" />
        </div>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate">{row.url || "missing customer URL"}</p>
        <p className="mt-1 truncate">{row.artifactFileName || "missing artifact file"}</p>
        <p className="mt-1">
          HTTP {row.httpStatus} · {row.latencyMs}ms · {row.contentType || "missing content type"}
        </p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.monitorHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeCustomerPackageAvailabilityMonitorPanel({ monitor }: { monitor: NativeCustomerPackageAvailabilityMonitor }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="size-4" />
              Customer package availability
            </CardTitle>
            <CardDescription>Public download pages, updater endpoints, and self-hosted archive mirrors checked for customer-safe native package distribution.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(monitor.summary.status)}>
              <StatusIcon status={monitor.summary.status} />
              {monitor.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={monitor.summary.availabilityScore < 80 ? "destructive" : "outline"}>
              {monitor.summary.availabilityScore}/100 availability
            </Badge>
            {monitor.files.map((file) => (
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
          <SummaryTile detail="endpoint rows" label="Rows" value={`${monitor.summary.rowCount}`} />
          <SummaryTile detail="ready endpoints" label="Ready" value={`${monitor.summary.readyCount}`} />
          <SummaryTile detail="download pages" label="Public" value={`${monitor.summary.publicDownloadCount}`} />
          <SummaryTile detail="updater manifests" label="Updater" value={`${monitor.summary.updaterEndpointCount}`} />
          <SummaryTile detail="archive mirrors" label="Mirrors" value={`${monitor.summary.archiveMirrorCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Availability action</p>
          <p className="mt-1 text-sm text-muted-foreground">{monitor.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{monitor.summary.monitorHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Endpoint</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Signals</TableHead>
              <TableHead>Customer URL</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{monitor.rows.map((row) => <AvailabilityRow key={`${row.platform}-${row.endpointKind}-${row.url}`} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {monitor.summary.monitorHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
