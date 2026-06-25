import { BadgeCheck, Box, Download, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeCadKernelCapabilityMatrixReport,
  NativeCadKernelCapabilityRow,
  NativeCadKernelCapabilityStatus,
} from "@/features/projects/native-cad-kernel-capability-matrix";

function statusVariant(status: NativeCadKernelCapabilityStatus) {
  if (status === "unsupported") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeCadKernelCapabilityStatus }) {
  if (status === "ready") {
    return <BadgeCheck className="size-3.5" />;
  }

  return status === "unsupported" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function CapabilityRow({ row }: { row: NativeCadKernelCapabilityRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Box className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.format}</p>
            <p className="text-xs text-muted-foreground">{row.adapter}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">{row.unitHandling}</TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">{row.tessellationQuality}</TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.unsupportedFeatures}</p>
        <p className="mt-1 truncate font-mono">{row.capabilityHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeCadKernelCapabilityMatrixPanel({ report }: { report: NativeCadKernelCapabilityMatrixReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Box className="size-4" />
              Native CAD kernel capability
            </CardTitle>
            <CardDescription>STEP, IGES, SAT, and STL coverage with unit handling, tessellation quality, and unsupported feature explanations.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={report.summary.status === "blocked" ? "destructive" : report.summary.status === "review" ? "secondary" : "outline"}>
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.capabilityScore < 70 ? "destructive" : "outline"}>
              {report.summary.capabilityScore}/100 capability
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
          <SummaryTile detail="formats tracked" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="fixture-backed" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="needs validation" label="Review" value={`${report.summary.reviewCount}`} />
          <SummaryTile detail="not supported yet" label="Unsupported" value={`${report.summary.unsupportedCount}`} />
          <SummaryTile detail="workspace" label="Matrix" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Capability action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.capabilityHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Format</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Tessellation</TableHead>
              <TableHead>Unsupported Scope</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <CapabilityRow key={row.format} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
