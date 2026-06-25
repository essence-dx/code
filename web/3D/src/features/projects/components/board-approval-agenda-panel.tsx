import { Activity, CalendarClock, Download, ListChecks, Route, ShieldCheck, TriangleAlert, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardApprovalAgendaAttendee,
  BoardApprovalAgendaItem,
  BoardApprovalAgendaItemKind,
  BoardApprovalAgendaStatus,
  BoardApprovalMeetingAgendaReport,
} from "@/features/projects/board-approval-agenda";

const kindIcon: Record<BoardApprovalAgendaItemKind, typeof ListChecks> = {
  decision: ListChecks,
  "owner-action": Users2,
  "risk-review": TriangleAlert,
  scenario: Route,
  timeline: CalendarClock,
};

function statusVariant(status: BoardApprovalAgendaStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardApprovalAgendaStatus }) {
  if (status === "ready") {
    return <ShieldCheck className="size-3.5" />;
  }

  return status === "watch" ? <Activity className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No due date";
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

function AgendaItemRow({ item }: { item: BoardApprovalAgendaItem }) {
  const Icon = kindIcon[item.kind];

  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{item.topic}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{item.decisionPrompt}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(item.status)}>
          <StatusIcon status={item.status} />
          {item.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{item.kind}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{item.ownerName}</p>
        <p className="mt-1">{item.ownerEmail ?? "No email attached"}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{item.durationMinutes} minutes</p>
        <p className="mt-1">{formatDate(item.dueAt)}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{item.nextAction}</p>
        <p className="mt-1 line-clamp-1">{item.evidence}</p>
      </TableCell>
    </TableRow>
  );
}

function AttendeeRow({ attendee }: { attendee: BoardApprovalAgendaAttendee }) {
  return (
    <TableRow>
      <TableCell className="max-w-[240px] whitespace-normal">
        <p className="font-medium">{attendee.name}</p>
        <p className="text-xs text-muted-foreground">{attendee.email ?? "No email attached"}</p>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={attendee.required ? "secondary" : "outline"}>
          {attendee.required ? "required" : "optional"}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{attendee.role}</TableCell>
      <TableCell className="text-sm">{attendee.itemCount}</TableCell>
    </TableRow>
  );
}

export function BoardApprovalAgendaPanel({ report }: { report: BoardApprovalMeetingAgendaReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-4" />
              Board approval agenda
            </CardTitle>
            <CardDescription>Meeting agenda generated from packet sign-offs, control-room updates, owner actions, and scenario recommendation.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.blockedItemCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockedItemCount} blocked
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
          <SummaryTile detail="agenda rows" label="Items" value={`${report.summary.totalItemCount}`} />
          <SummaryTile detail="required attendees" label="Attendees" value={`${report.summary.requiredAttendeeCount}`} />
          <SummaryTile detail="meeting estimate" label="Duration" value={`${report.summary.estimatedDurationMinutes}m`} />
          <SummaryTile detail="source families" label="Sources" value={`${report.summary.sourceCount}`} />
          <SummaryTile detail="watched items" label="Watch" value={`${report.summary.watchItemCount}`} />
          <SummaryTile detail="ready items" label="Ready" value={`${report.summary.readyItemCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Opening memo</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.openingMemo}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agenda item</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Timing</TableHead>
              <TableHead>Action and evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.items.length > 0 ? (
              report.items.slice(0, 10).map((item) => <AgendaItemRow item={item} key={item.id} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No board agenda items are active for this release window.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Attendee</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.attendees.length > 0 ? (
              report.attendees.slice(0, 8).map((attendee) => <AttendeeRow attendee={attendee} key={attendee.email ?? attendee.name} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={4}>
                  No agenda attendees are required yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
