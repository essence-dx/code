import { CheckCircle2, Download, FileJson2, Gauge, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveOversightEvidenceQualityMonitorReport,
  BoardReleaseArchiveOversightEvidenceQualityMonitorRow,
  BoardReleaseArchiveOversightEvidenceQualityStatus,
} from "@/features/projects/board-release-archive-oversight-evidence-quality-monitor";

function statusVariant(status: BoardReleaseArchiveOversightEvidenceQualityStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveOversightEvidenceQualityStatus }) {
  if (status === "healthy") {
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

function QualityRow({ row }: { row: BoardReleaseArchiveOversightEvidenceQualityMonitorRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Gauge className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{row.qualityScore}/100</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-1">
          <Badge className="rounded-md" variant={row.staleHash ? "secondary" : "outline"}>
            stale {row.staleHash ? "yes" : "no"}
          </Badge>
          <Badge className="rounded-md" variant={row.missingAttestation ? "secondary" : "outline"}>
            attestation {row.missingAttestation ? "missing" : "ok"}
          </Badge>
          <Badge className="rounded-md" variant={row.reviewerDrift ? "secondary" : "outline"}>
            reviewer {row.reviewerDrift ? "drift" : "ok"}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.attestationHash ?? "attestation missing"}</p>
        <p className="mt-1 truncate font-mono">{row.qualityHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveOversightEvidenceQualityMonitorPanel({
  report,
}: {
  report: BoardReleaseArchiveOversightEvidenceQualityMonitorReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-4" />
              Archive oversight evidence quality monitor
            </CardTitle>
            <CardDescription>Quality scoring for stale hashes, missing attestations, and reviewer drift.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.qualityScore < 80 ? "destructive" : "outline"}>
              {report.summary.qualityScore}/100 quality
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
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryTile detail="quality rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="healthy rows" label="Healthy" value={`${report.summary.healthyCount}`} />
          <SummaryTile detail="watch rows" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="blocked rows" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="reviewer drift" label="Drift" value={`${report.summary.reviewerDriftCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Quality next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.qualityMonitorHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evidence area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Signals</TableHead>
              <TableHead>Attestation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <QualityRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
