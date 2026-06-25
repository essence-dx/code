import { CheckCircle2, Download, FileJson2, Gauge, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseDistributionReadinessDashboardReport,
  BoardReleaseDistributionReadinessFilter,
  BoardReleaseDistributionReadinessStatus,
} from "@/features/projects/board-release-distribution-readiness-dashboard";

function statusVariant(status: BoardReleaseDistributionReadinessStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseDistributionReadinessStatus }) {
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

function FilterRow({ filter }: { filter: BoardReleaseDistributionReadinessFilter }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <p className="font-medium">{filter.title}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{filter.filterId}</p>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(filter.status)}>
          <StatusIcon status={filter.status} />
          {filter.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{filter.filterKind}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{filter.totalCount} total</p>
        <p>{filter.blockedCount} blocked</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{filter.watchCount} watch</p>
        <p>{filter.readyCount} ready</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{filter.nextAction}</p>
        <p className="mt-1 truncate font-mono">{filter.evidenceHash}</p>
      </TableCell>
    </TableRow>
  );
}

function FilterTable({ filters }: { filters: BoardReleaseDistributionReadinessFilter[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Filter</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Readiness</TableHead>
          <TableHead>Next action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{filters.map((filter) => <FilterRow filter={filter} key={filter.filterId} />)}</TableBody>
    </Table>
  );
}

export function BoardReleaseDistributionReadinessDashboardPanel({ report }: { report: BoardReleaseDistributionReadinessDashboardReport }) {
  const blockedFilters = report.filters.filter((filter) => filter.status === "blocked");
  const watchFilters = report.filters.filter((filter) => filter.status === "watch");
  const readyFilters = report.filters.filter((filter) => filter.status === "ready");

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-4" />
              Board release distribution readiness dashboard
            </CardTitle>
            <CardDescription>Recipient, route, acknowledgement, retry, and audit timeline filters for release distribution readiness.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.readinessScore}/100
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
          <SummaryTile detail="readiness score" label="Score" value={`${report.summary.readinessScore}`} />
          <SummaryTile detail="filter groups" label="Filters" value={`${report.summary.filterCount}`} />
          <SummaryTile detail="needs repair" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="watch items" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="ready items" label="Ready" value={`${report.summary.readyCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Readiness next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Tabs defaultValue={report.summary.status}>
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="blocked">
              blocked
              <Badge className="ml-1 rounded-md" variant="outline">
                {blockedFilters.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="watch">
              watch
              <Badge className="ml-1 rounded-md" variant="outline">
                {watchFilters.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ready">
              ready
              <Badge className="ml-1 rounded-md" variant="outline">
                {readyFilters.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="blocked">
            <FilterTable filters={blockedFilters} />
          </TabsContent>
          <TabsContent value="watch">
            <FilterTable filters={watchFilters} />
          </TabsContent>
          <TabsContent value="ready">
            <FilterTable filters={readyFilters} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
