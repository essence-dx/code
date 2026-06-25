import { CheckCircle2, Download, FileJson2, ShieldAlert, ShieldCheck, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeProductionFulfillmentCoverageFileFormat,
  NativeProductionFulfillmentCoverageReport,
  NativeProductionFulfillmentCoverageRow,
  NativeProductionFulfillmentCoverageStatus,
} from "@/features/projects/native-production-fulfillment-coverage";

function statusVariant(status: NativeProductionFulfillmentCoverageStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeProductionFulfillmentCoverageStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeProductionFulfillmentCoverageFileFormat }) {
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

function CoverageFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "destructive"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function CoverageRow({ row }: { row: NativeProductionFulfillmentCoverageRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ShieldCheck className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.area}</p>
            <p className="truncate text-xs text-muted-foreground">{row.reportHash}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex flex-wrap gap-1.5">
          <CoverageFlag enabled={row.readyScenarioCovered} label="ready path" />
          <CoverageFlag enabled={row.blockedScenarioCovered} label="blocked path" />
          <CoverageFlag enabled={row.reportHashAttached} label="report hash" />
        </div>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.coverageHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeProductionFulfillmentCoveragePanel({ report }: { report: NativeProductionFulfillmentCoverageReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Native production fulfillment coverage
            </CardTitle>
            <CardDescription>Targeted coverage across fulfillment ledger scoring, artifact storage handoff readiness, CAD transcript ingestion, and promotion rehearsal gating.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.coverageScore < 80 ? "destructive" : "outline"}>
              {report.summary.coverageScore}/100 coverage
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
          <SummaryTile detail="coverage rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="ready coverage" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${report.summary.reviewCount}`} />
          <SummaryTile detail="blocked coverage" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="missing evidence" label="Missing" value={`${report.summary.missingCoverageCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Coverage action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.coverageHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <CoverageRow key={row.area} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {report.summary.coverageHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
