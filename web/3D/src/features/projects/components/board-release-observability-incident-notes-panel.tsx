import { ClipboardList, Download, FileJson2, ShieldAlert, Timer, TriangleAlert, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseObservabilityIncidentNote,
  BoardReleaseObservabilityIncidentNotesReport,
  BoardReleaseObservabilityIncidentNoteStatus,
} from "@/features/projects/board-release-observability-incident-notes";

function statusVariant(status: BoardReleaseObservabilityIncidentNoteStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "closed" ? "outline" : "secondary";
}

function StatusIcon({ status }: { status: BoardReleaseObservabilityIncidentNoteStatus }) {
  if (status === "blocked") {
    return <ShieldAlert className="size-3.5" />;
  }

  return status === "closed" ? <UserRoundCheck className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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

function NoteRow({ note }: { note: BoardReleaseObservabilityIncidentNote }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ClipboardList className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{note.title}</p>
            <p className="truncate text-xs text-muted-foreground">{note.source}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(note.status)}>
          <StatusIcon status={note.status} />
          {note.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{note.severity}</p>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{note.ownerRole}</p>
        <p className="truncate">{note.ownerEmail}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{formatDate(note.dueAt)}</p>
        <p>{note.releasePromotionId ?? "Workspace incident"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{note.summary}</p>
        <p className="mt-1 truncate font-mono">{note.noteHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseObservabilityIncidentNotesPanel({ report }: { report: BoardReleaseObservabilityIncidentNotesReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4" />
              Board release observability incident notes
            </CardTitle>
            <CardDescription>Owner-assigned observability follow-ups with severity, due windows, and exportable evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="gap-1 rounded-md" variant="outline">
              <Timer className="size-3.5" />
              {report.summary.dueSoonCount} due soon
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
          <SummaryTile detail="assigned notes" label="Notes" value={`${report.summary.noteCount}`} />
          <SummaryTile detail="needs repair" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="open actions" label="Open" value={`${report.summary.openCount}`} />
          <SummaryTile detail="watch actions" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="critical" label="Critical" value={`${report.summary.criticalCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Incident note next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Note</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.notes.map((note) => <NoteRow key={note.noteId} note={note} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
