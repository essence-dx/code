import { Archive, CheckCircle2, Download, FileJson2, Filter, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseOperationsDashboardFilterBucket,
  BoardReleaseOperationsDashboardFilterEntry,
  BoardReleaseOperationsDashboardFilterReport,
  BoardReleaseOperationsDashboardFilterStatus,
} from "@/features/projects/board-release-operations-dashboard-filters";

function statusVariant(status: BoardReleaseOperationsDashboardFilterStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseOperationsDashboardFilterStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  if (status === "archived") {
    return <Archive className="size-3.5" />;
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

function FilterRow({ entry }: { entry: BoardReleaseOperationsDashboardFilterEntry }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <p className="font-medium">{entry.releasePromotionId ?? "Unassigned release"}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{entry.sourceId}</p>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(entry.filterStatus)}>
          <StatusIcon status={entry.filterStatus} />
          {entry.filterStatus}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{entry.source}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{entry.ownerName ?? "Unassigned"}</p>
        <p>{entry.score === null ? "No score" : `${entry.score}/100`}</p>
      </TableCell>
      <TableCell className="max-w-[380px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{entry.nextAction}</p>
        <p className="mt-1 truncate font-mono">{entry.evidenceHash ?? "No evidence hash"}</p>
      </TableCell>
    </TableRow>
  );
}

function FilterTable({ bucket }: { bucket: BoardReleaseOperationsDashboardFilterBucket }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-md border bg-background p-3">
        <p className="text-sm font-medium">{bucket.status} filter next action</p>
        <p className="mt-1 text-sm text-muted-foreground">{bucket.nextAction}</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Release</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Next action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{bucket.entries.map((entry) => <FilterRow entry={entry} key={`${entry.source}:${entry.sourceId}`} />)}</TableBody>
      </Table>
    </div>
  );
}

export function BoardReleaseOperationsDashboardFiltersPanel({ report }: { report: BoardReleaseOperationsDashboardFilterReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="size-4" />
              Board release operations dashboard filters
            </CardTitle>
            <CardDescription>Filter release operations across history, review queue, approval snapshots, and signed export packets.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.entryCount} entries
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
          <SummaryTile detail="all entries" label="Entries" value={`${report.summary.entryCount}`} />
          <SummaryTile detail="needs action" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="review needed" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="ready to approve" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="closed records" label="Archived" value={`${report.summary.archivedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Filter next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Tabs defaultValue={report.summary.status}>
          <TabsList className="flex w-full flex-wrap justify-start">
            {report.buckets.map((bucket) => (
              <TabsTrigger key={bucket.status} value={bucket.status}>
                {bucket.status}
                <Badge className="ml-1 rounded-md" variant="outline">
                  {bucket.entries.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {report.buckets.map((bucket) => (
            <TabsContent key={bucket.status} value={bucket.status}>
              <FilterTable bucket={bucket} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
