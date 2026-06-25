import { Camera, CheckCircle2, Download, FileJson2, Image, PackageCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { VisualParityEvidenceReport, VisualParityEvidenceRow, VisualParityEvidenceStatus, VisualParityEvidenceSurface } from "@/features/projects/visual-parity-evidence";

const surfaceLabels: Record<VisualParityEvidenceSurface, string> = {
  "app-package": "Package",
  editor: "Editor",
  embed: "Embed",
  "public-viewer": "Viewer",
};

function statusVariant(status: VisualParityEvidenceStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: VisualParityEvidenceStatus }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function SurfaceIcon({ surface }: { surface: VisualParityEvidenceSurface }) {
  if (surface === "app-package") {
    return <PackageCheck className="size-4" />;
  }

  return surface === "editor" ? <Image className="size-4" /> : <Camera className="size-4" />;
}

function formatBytes(value: number | null) {
  if (!value) {
    return "No image";
  }

  return value < 1024 ? `${value} B` : `${Math.round(value / 1024)} KB`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not captured";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
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

function EvidenceRow({ row }: { row: VisualParityEvidenceRow }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <SurfaceIcon surface={row.surface} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.targetName}</p>
            <p className="truncate text-xs text-muted-foreground">{surfaceLabels[row.surface]}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[260px]">
        <p className="truncate font-mono text-xs">{row.screenshotHash ?? "missing screenshot hash"}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.width && row.height ? `${row.width}x${row.height}` : "No dimensions"} - {formatBytes(row.byteSize)}
        </p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p>{row.diffSummary ?? "No screenshot diff summary yet."}</p>
        <p className="mt-1 truncate">{row.screenshotPath ?? "No screenshot artifact path"}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDate(row.capturedAt)}</TableCell>
    </TableRow>
  );
}

export function VisualParityEvidencePanel({ report }: { report: VisualParityEvidenceReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="size-4" />
              Visual parity evidence
            </CardTitle>
            <CardDescription>Screenshot-backed parity proof for the editor, public viewer, embed, and package download surfaces with stored hashes and diff summaries.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.visualParityScore < 80 ? "destructive" : "outline"}>
              {report.summary.visualParityScore}/100 visual
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
          <SummaryTile detail="surfaces tracked" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="with screenshot hashes" label="Captured" value={`${report.summary.capturedCount}`} />
          <SummaryTile detail="with diff summaries" label="Diffs" value={`${report.summary.diffCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${report.summary.reviewCount}`} />
          <SummaryTile detail="blocking evidence" label="Blocked" value={`${report.summary.blockedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Visual parity action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.visualParityHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Surface</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Screenshot</TableHead>
              <TableHead>Diff</TableHead>
              <TableHead>Captured</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <EvidenceRow key={row.surface} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
