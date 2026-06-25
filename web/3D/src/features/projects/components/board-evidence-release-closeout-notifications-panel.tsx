import { BellRing, CheckCircle2, Download, FileJson2, Mail, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardEvidenceReleaseCloseoutNotification,
  BoardEvidenceReleaseCloseoutNotificationReport,
  BoardEvidenceReleaseCloseoutNotificationStatus,
} from "@/features/projects/board-evidence-release-closeout-notifications";

function statusVariant(status: BoardEvidenceReleaseCloseoutNotificationStatus | BoardEvidenceReleaseCloseoutNotificationReport["summary"]["status"]) {
  if (status === "blocked" || status === "suppressed-by-role" || status === "missing-recipient") {
    return "destructive" as const;
  }

  return status === "watch" || status === "suppressed-by-preference" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardEvidenceReleaseCloseoutNotificationReport["summary"]["status"] }) {
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

function NotificationRow({ notification }: { notification: BoardEvidenceReleaseCloseoutNotification }) {
  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            {notification.channel === "email" ? <Mail className="size-3.5" /> : <BellRing className="size-3.5" />}
          </span>
          <div className="min-w-0">
            <p className="font-medium">{notification.recipientName}</p>
            <p className="truncate text-xs text-muted-foreground">{notification.recipientEmail ?? "No email on file"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant="outline">
          {notification.reason}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{notification.recipientRole}</p>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant="outline">
          {notification.topic}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{notification.channel}</p>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={statusVariant(notification.status)}>
          {notification.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{notification.message}</p>
        <p className="mt-1 truncate font-mono">{notification.dedupeKey}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardEvidenceReleaseCloseoutNotificationsPanel({ report }: { report: BoardEvidenceReleaseCloseoutNotificationReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-4" />
              Board evidence release closeout notifications
            </CardTitle>
            <CardDescription>Preference-aware notification routing for release signers, packet owners, and admins.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.eligibleRouteCount} eligible
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
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="unique people" label="Candidates" value={`${report.summary.candidateCount}`} />
          <SummaryTile detail="all channels" label="Eligible" value={`${report.summary.eligibleRouteCount}`} />
          <SummaryTile detail="email routes" label="Email" value={`${report.summary.emailEligibleCount}`} />
          <SummaryTile detail="in-app routes" label="In-app" value={`${report.summary.inAppEligibleCount}`} />
          <SummaryTile detail="preference off" label="Prefs" value={`${report.summary.suppressedByPreferenceCount}`} />
          <SummaryTile detail="role blocked" label="Roles" value={`${report.summary.suppressedByRoleCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Notification next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.notifications.map((notification) => <NotificationRow key={notification.notificationId} notification={notification} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
