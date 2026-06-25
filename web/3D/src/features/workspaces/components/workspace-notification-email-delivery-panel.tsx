import { AlertTriangle, CheckCircle2, MailCheck, RotateCcw, SendHorizonal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  WorkspaceNotificationEmailDeliveryReport,
  WorkspaceNotificationEmailDeliveryRow,
} from "@/features/workspaces/notification-email-delivery";
import type { WorkspaceNotificationEmailDeliveryStatus, WorkspaceNotificationTopic } from "@/features/workspaces/types";

const topicLabels: Record<WorkspaceNotificationTopic, string> = {
  health: "Health",
  inbox: "Inbox",
  release: "Release",
  review: "Review",
};

function statusVariant(status: WorkspaceNotificationEmailDeliveryStatus) {
  if (status === "failed") {
    return "destructive";
  }

  if (status === "pending") {
    return "secondary";
  }

  return "outline";
}

function statusIcon(status: WorkspaceNotificationEmailDeliveryStatus) {
  if (status === "sent") {
    return <CheckCircle2 className="size-3.5" />;
  }

  if (status === "failed") {
    return <AlertTriangle className="size-3.5" />;
  }

  return <RotateCcw className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function DeliveryRow({ job }: { job: WorkspaceNotificationEmailDeliveryRow }) {
  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate font-medium">{job.subject}</p>
          <p className="truncate text-xs text-muted-foreground">{job.recipientEmail}</p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          <Badge className="rounded-md" variant="outline">
            {topicLabels[job.topic]}
          </Badge>
          <Badge className="rounded-md" variant="secondary">
            {job.recipientRole}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(job.status)}>
          {statusIcon(job.status)}
          {job.status}
        </Badge>
      </TableCell>
      <TableCell>{job.attempts}</TableCell>
      <TableCell>{formatDate(job.sentAt ?? job.nextAttemptAt ?? job.updatedAt)}</TableCell>
      <TableCell className="max-w-[260px] truncate text-muted-foreground">{job.lastError ?? "Ready"}</TableCell>
    </TableRow>
  );
}

export function WorkspaceNotificationEmailDeliveryPanel({
  error,
  report,
}: {
  error?: string | null;
  report: WorkspaceNotificationEmailDeliveryReport;
}) {
  const visibleJobs = report.jobs.slice(0, 8);
  const latestAttempt = report.attempts[0] ?? null;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="size-4" />
              Email delivery jobs
            </CardTitle>
            <CardDescription>Queued workspace email notifications honor saved channel preferences and workspace roles before delivery.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={error ? "destructive" : "secondary"}>
              <SendHorizonal className="size-3.5" />
              {error ? "Unavailable" : `${report.summary.pendingCount} pending`}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.sentCount} sent
            </Badge>
            <Badge className="rounded-md" variant={report.summary.failedCount > 0 ? "destructive" : "outline"}>
              {report.summary.failedCount} failed
            </Badge>
          </div>
        </div>
        {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
        {latestAttempt ? (
          <p className="text-xs text-muted-foreground">
            Latest attempt {latestAttempt.status} on {formatDate(latestAttempt.attemptedAt)}
            {latestAttempt.error ? `: ${latestAttempt.error}` : "."}
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Message</TableHead>
              <TableHead>Routing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tries</TableHead>
              <TableHead>Next/Sent</TableHead>
              <TableHead>Last result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleJobs.length > 0 ? (
              visibleJobs.map((job) => <DeliveryRow job={job} key={job.id} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={6}>
                  No email delivery jobs have been queued for this workspace yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
