import { CheckCircle2, Download, FileJson2, History, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createBoardEvidenceReadinessSnapshotJson,
  type BoardEvidenceReadinessSnapshotHistoryReport,
  type BoardEvidenceReadinessSnapshotRecord,
} from "@/features/projects/board-evidence-readiness-snapshots";

function statusVariant(status: BoardEvidenceReadinessSnapshotRecord["status"]) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardEvidenceReadinessSnapshotRecord["status"] }) {
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

function SnapshotRow({ record }: { record: BoardEvidenceReadinessSnapshotRecord }) {
  const jsonContent = createBoardEvidenceReadinessSnapshotJson(record);
  const jsonDataUri = `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;

  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <History className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{record.snapshotId}</p>
            <p className="text-xs text-muted-foreground">{record.createdAt}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(record.status)}>
          <StatusIcon status={record.status} />
          {record.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{record.readinessScore}/100</p>
      </TableCell>
      <TableCell className="max-w-[180px] whitespace-normal text-sm">
        <p className="font-medium">{record.actor.name ?? "Unknown actor"}</p>
        <p className="truncate text-xs text-muted-foreground">{record.actor.email ?? record.actor.userId ?? "No actor email"}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{record.unresolvedAttachmentRiskCount} risks</p>
        <p>{record.carryForwardCount} carry-forward</p>
      </TableCell>
      <TableCell>
        <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={record.jsonFileName} href={jsonDataUri}>
          <FileJson2 className="size-4" />
          JSON
        </a>
      </TableCell>
    </TableRow>
  );
}

export function BoardEvidenceReadinessSnapshotsPanel({ history }: { history: BoardEvidenceReadinessSnapshotHistoryReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" />
              Board evidence readiness snapshots
            </CardTitle>
            <CardDescription>Actor-attributed readiness snapshots with audit hashes, score movement, and export history.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={history.summary.scoreDelta < 0 ? "destructive" : "outline"}>
              {history.summary.scoreDelta > 0 ? "+" : ""}
              {history.summary.scoreDelta} score delta
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={history.csvFileName} href={history.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="saved records" label="Snapshots" value={`${history.summary.totalSnapshotCount}`} />
          <SummaryTile detail="latest score" label="Latest" value={`${history.summary.latestScore ?? "-"}`} />
          <SummaryTile detail="previous score" label="Previous" value={`${history.summary.previousScore ?? "-"}`} />
          <SummaryTile detail="risk movement" label="Risk delta" value={`${history.summary.riskDelta > 0 ? "+" : ""}${history.summary.riskDelta}`} />
          <SummaryTile detail="unique actors" label="Actors" value={`${history.summary.actorCount}`} />
          <SummaryTile detail="score trend" label="Trend" value={history.summary.statusTrend} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Snapshot</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Export</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{history.records.map((record) => <SnapshotRow key={record.id} record={record} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
