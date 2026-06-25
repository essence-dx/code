import { Ban, Clock3, Download, FileClock, Send, ShieldCheck, TriangleAlert, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardApprovalPacketCirculationQueueReport,
  BoardApprovalPacketCirculationQueueRow,
  BoardApprovalPacketCirculationStatus,
} from "@/features/projects/board-approval-circulation-queue";
import type { BoardApprovalRedactionAudience } from "@/features/projects/board-approval-redaction-policies";

function statusVariant(status: BoardApprovalPacketCirculationStatus) {
  if (status === "blocked" || status === "expired" || status === "revoked") {
    return "destructive" as const;
  }

  return status === "queued" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardApprovalPacketCirculationStatus }) {
  switch (status) {
    case "blocked":
      return <TriangleAlert className="size-3.5" />;
    case "expired":
      return <Clock3 className="size-3.5" />;
    case "queued":
      return <FileClock className="size-3.5" />;
    case "revoked":
      return <Ban className="size-3.5" />;
    case "sent":
      return <Send className="size-3.5" />;
  }
}

function audienceLabel(audience: BoardApprovalRedactionAudience) {
  if (audience === "internal-board") {
    return "Internal board";
  }

  return `${audience[0]?.toUpperCase() ?? ""}${audience.slice(1)}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not revoked";
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

function QueueRow({ row }: { row: BoardApprovalPacketCirculationQueueRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <UsersRound className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{audienceLabel(row.audience)}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{row.templateLabel}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.redactionCount} redactions</p>
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{row.recipientPurpose}</p>
        <p className="mt-1">{row.recipientName}</p>
        <p className="mt-1">{row.recipientEmail ?? "No recipient email"}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">
        <p>Expires {formatDate(row.expiresAt)}</p>
        <p className="mt-1">{row.daysUntilExpiry} day{row.daysUntilExpiry === 1 ? "" : "s"} left</p>
        {row.revokedAt ? <p className="mt-1">Revoked {formatDate(row.revokedAt)}</p> : null}
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        {row.revokeReason ? <p className="mt-1 line-clamp-1">Reason: {row.revokeReason}</p> : null}
      </TableCell>
    </TableRow>
  );
}

export function BoardApprovalCirculationQueuePanel({ report }: { report: BoardApprovalPacketCirculationQueueReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Board circulation queue
            </CardTitle>
            <CardDescription>Reviewer-specific packet queues tied to redaction templates, recipient purpose, expiry, and revocation state.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={report.summary.status === "blocked" ? "destructive" : report.summary.status === "watch" ? "secondary" : "outline"}>
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.externalQueueCount} external
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="reviewer audiences" label="Queue rows" value={`${report.summary.totalQueueCount}`} />
          <SummaryTile detail="already active" label="Sent" value={`${report.summary.sentCount}`} />
          <SummaryTile detail="waiting to send" label="Queued" value={`${report.summary.queuedCount}`} />
          <SummaryTile detail="access expired" label="Expired" value={`${report.summary.expiredCount}`} />
          <SummaryTile detail="manually revoked" label="Revoked" value={`${report.summary.revokedCount}`} />
          <SummaryTile detail="saved active packet rows" label="History" value={`${report.summary.activeHistoryCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Circulation next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Audience</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recipient purpose</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <QueueRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
