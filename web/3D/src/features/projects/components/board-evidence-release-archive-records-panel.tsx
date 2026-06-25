import { Archive, CheckCircle2, Download, FileJson2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardEvidenceReleaseArchiveRecord,
  BoardEvidenceReleaseArchiveRecordReport,
  BoardEvidenceReleaseArchiveStatus,
} from "@/features/projects/board-evidence-release-archive-records";

function statusVariant(status: BoardEvidenceReleaseArchiveStatus) {
  return status === "blocked" ? "destructive" : "outline";
}

function StatusIcon({ status }: { status: BoardEvidenceReleaseArchiveStatus }) {
  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <CheckCircle2 className="size-3.5" />;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value));
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

function ArchiveRow({ record }: { record: BoardEvidenceReleaseArchiveRecord }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Archive className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{record.releasePromotionId ?? "Unassigned release"}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{record.archiveId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={record.promotionAllowed ? "outline" : "destructive"}>
          {record.promotionAllowed ? "releasable" : "blocked"}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(record.archivedAt)}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{record.actorName}</p>
        <p className="truncate">{record.actorEmail ?? "No email on file"}</p>
      </TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{record.closeoutHash}</p>
        <p className="truncate">{record.closeoutJsonFileName}</p>
      </TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{record.archiveHash}</p>
        <p className="truncate">{record.promotionGateJsonFileName}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardEvidenceReleaseArchiveRecordsPanel({ report }: { report: BoardEvidenceReleaseArchiveRecordReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Archive className="size-4" />
              Board evidence release archive records
            </CardTitle>
            <CardDescription>Immutable closeout and promotion-gate hashes with actor attribution for release evidence retention.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.promotionAllowed ? "outline" : "destructive"}>
              {report.summary.promotionAllowed ? "promotion evidence sealed" : "blocked archive"}
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile detail="sealed records" label="Archives" value={`${report.summary.archiveCount}`} />
          <SummaryTile detail="promotion gate" label="Decision" value={report.summary.promotionAllowed ? "open" : "blocked"} />
          <SummaryTile detail="latest archive" label="Hash" value={report.summary.latestArchiveHash ? "sealed" : "missing"} />
          <SummaryTile detail={formatDate(report.generatedAt)} label="Generated" value="UTC" />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Archive next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Archive</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Closeout hash</TableHead>
              <TableHead>Archive hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.records.map((record) => <ArchiveRow key={record.archiveId} record={record} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
