import { Activity, Download, FileJson2, Gauge, History, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductionParityHistorySnapshotRecord, ProductionParityHistorySnapshotReport, ProductionParityHistoryTrend } from "@/features/projects/live-production-parity-evidence-dashboard";

function trendVariant(trend: ProductionParityHistoryTrend) {
  return trend === "regressed" ? "destructive" : trend === "improved" ? "outline" : "secondary";
}

function TrendIcon({ trend }: { trend: ProductionParityHistoryTrend }) {
  if (trend === "improved") {
    return <TrendingUp className="size-3.5" />;
  }

  return trend === "regressed" ? <TrendingDown className="size-3.5" /> : <Activity className="size-3.5" />;
}

function formatDelta(value: number) {
  if (value === 0) {
    return "0";
  }

  return value > 0 ? `+${value}` : String(value);
}

function formatDate(value: string) {
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

function SnapshotRow({ record }: { record: ProductionParityHistorySnapshotRecord }) {
  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <p className="font-medium">{formatDate(record.generatedAt)}</p>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{record.parityHash}</p>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={record.status === "blocked" ? "destructive" : record.status === "review" ? "secondary" : "outline"}>
          {record.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Gauge className="size-3.5 text-muted-foreground" />
          <span>{record.parityScore}/100</span>
          <span className="text-xs text-muted-foreground">({formatDelta(record.scoreDelta)})</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={trendVariant(record.trend)}>
          <TrendIcon trend={record.trend} />
          {record.trend}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p>{record.driftSummary}</p>
        <p className="mt-1 truncate font-mono">{record.snapshotHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function ProductionParityHistorySnapshotsPanel({ report }: { report: ProductionParityHistorySnapshotReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" />
              Production parity history
            </CardTitle>
            <CardDescription>Saved live-parity gate snapshots with score drift, blocker drift, status changes, and downloadable evidence for release review.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={trendVariant(report.summary.trend)}>
              <TrendIcon trend={report.summary.trend} />
              {report.summary.trend}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.latestScore < 80 ? "destructive" : "outline"}>
              {report.summary.latestScore}/100 latest
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
          <SummaryTile detail="saved gates" label="Snapshots" value={`${report.summary.snapshotCount}`} />
          <SummaryTile detail="from first to latest" label="Score drift" value={formatDelta(report.summary.scoreDelta)} />
          <SummaryTile detail="blocker movement" label="Blocker drift" value={formatDelta(report.summary.blockedDelta)} />
          <SummaryTile detail="latest gate status" label="Status" value={report.summary.latestStatus} />
          <SummaryTile detail="workspace" label="Gate" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">History action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.historyHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Snapshot</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.records.map((record) => <SnapshotRow key={record.id} record={record} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
