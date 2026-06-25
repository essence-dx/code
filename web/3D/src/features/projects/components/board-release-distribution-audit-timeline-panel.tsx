import { CheckCircle2, Download, FileClock, FileJson2, ShieldAlert, Timeline, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseDistributionAuditTimelineEvent,
  BoardReleaseDistributionAuditTimelineReport,
  BoardReleaseDistributionAuditTimelineStatus,
} from "@/features/projects/board-release-distribution-audit-timeline";

function statusVariant(status: BoardReleaseDistributionAuditTimelineStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" || status === "open" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseDistributionAuditTimelineStatus }) {
  if (status === "closed") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function TimelineRow({ event }: { event: BoardReleaseDistributionAuditTimelineEvent }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <FileClock className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{event.title}</p>
            <p className="truncate text-xs text-muted-foreground">{event.actor ?? "System"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(event.status)}>
          <StatusIcon status={event.status} />
          {event.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{event.eventType}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{formatDate(event.occurredAt)}</p>
        <p>{event.releasePromotionId ?? "Unassigned release"}</p>
      </TableCell>
      <TableCell className="max-w-[380px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{event.nextAction}</p>
        <p className="mt-1 truncate font-mono">{event.eventHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseDistributionAuditTimelinePanel({ report }: { report: BoardReleaseDistributionAuditTimelineReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Timeline className="size-4" />
              Board release distribution audit timeline
            </CardTitle>
            <CardDescription>Export packets, delivery routes, acknowledgements, retries, and variance closure in one audit trail.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.eventCount} events
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
          <SummaryTile detail="timeline events" label="Events" value={`${report.summary.eventCount}`} />
          <SummaryTile detail="needs repair" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="active watch" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="still open" label="Open" value={`${report.summary.openCount}`} />
          <SummaryTile detail="closed events" label="Closed" value={`${report.summary.closedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Timeline next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.events.map((event) => <TimelineRow event={event} key={event.eventId} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
