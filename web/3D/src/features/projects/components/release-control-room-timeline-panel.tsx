import { Activity, Clock3, Download, ListChecks, RadioTower, Rocket, ShieldCheck, TriangleAlert, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  ReleaseControlRoomTimelineKind,
  ReleaseControlRoomTimelineReport,
  ReleaseControlRoomTimelineRow,
  ReleaseControlRoomTimelineStatus,
} from "@/features/projects/release-control-room-timeline";

const kindIcon: Record<ReleaseControlRoomTimelineKind, typeof Activity> = {
  deploy: Rocket,
  incident: TriangleAlert,
  "owner-action": UserRoundCheck,
  runbook: ListChecks,
  webhook: RadioTower,
};

function statusVariant(status: ReleaseControlRoomTimelineStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: ReleaseControlRoomTimelineStatus }) {
  if (status === "ready") {
    return <ShieldCheck className="size-3.5" />;
  }

  return status === "watch" ? <Clock3 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "No updates";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
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

function TimelineRow({ row }: { row: ReleaseControlRoomTimelineRow }) {
  const Icon = kindIcon[row.kind];

  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.detail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.kind}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{formatTimestamp(row.occurredAt)}</p>
        <p className="mt-1">{row.sourceLabel}</p>
      </TableCell>
      <TableCell className="max-w-[240px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{row.ownerName ?? "No owner"}</p>
        <p className="mt-1 truncate">{row.ownerEmail ?? row.projectName ?? "Workspace"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 line-clamp-1">{row.evidence}</p>
      </TableCell>
    </TableRow>
  );
}

export function ReleaseControlRoomTimelinePanel({ report }: { report: ReleaseControlRoomTimelineReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RadioTower className="size-4" />
              Release control-room timeline
            </CardTitle>
            <CardDescription>Live release feed for deploy, webhook, incident, runbook, and owner-action updates.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.blockedCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockedCount} blocked
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <SummaryTile detail="merged updates" label="Events" value={`${report.summary.totalCount}`} />
          <SummaryTile detail="source categories" label="Sources" value={`${report.summary.sourceCount}`} />
          <SummaryTile detail="accountable people" label="Owners" value={`${report.summary.ownerCount}`} />
          <SummaryTile detail="ready updates" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="watch updates" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail={formatTimestamp(report.summary.latestAt)} label="Latest" value={report.summary.status} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Control-room next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Update</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Action and evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.length > 0 ? (
              report.rows.map((row) => <TimelineRow key={row.id} row={row} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No release control-room updates are available yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
