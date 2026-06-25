"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  ExternalLink,
  MessageSquareText,
  ShieldAlert,
  UserRoundCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  ClientPortalCenter,
  ClientPortalComment,
  ClientPortalRoom,
  ClientPortalStatus,
} from "@/features/client-portal/client-portal-rooms";
import { cn } from "@/lib/utils";

type ClientPortalRoomsPanelProps = {
  center: ClientPortalCenter;
};

const statusLabels: Record<ClientPortalStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ClientPortalStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ClientPortalRoomsPanel({ center }: ClientPortalRoomsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserRoundCheck className="h-5 w-5" />
              Client portal rooms
            </CardTitle>
            <CardDescription>
              Approval-safe project views, scoped comments, handoff downloads,
              and reviewer activity history.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Rooms" value={center.totals.rooms} />
          <Metric label="Approval-safe" value={center.totals.approvalSafeRooms} />
          <Metric label="Comment rooms" value={center.totals.commentEnabledRooms} />
          <Metric label="Downloads" value={center.totals.handoffDownloads} />
          <Metric label="Open comments" value={center.totals.openComments} />
          <Metric label="Activity" value={center.totals.reviewerEvents} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-3">
            {center.rooms.length ? (
              center.rooms.map((room) => (
                <PortalRoomCard key={room.id} room={room} />
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                Create a project before opening the first client portal room.
              </p>
            )}
          </section>

          <div className="space-y-4">
            <ScopedCommentsPanel comments={center.scopedCommentQueue} />
            <ReviewerActivityPanel center={center} />
          </div>
        </div>

        {center.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Next client-room actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p
                  key={action}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{action}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PortalRoomCard({ room }: { room: ClientPortalRoom }) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{room.projectName}</h3>
            <Badge variant={statusVariants[room.status]}>
              {statusLabels[room.status]}
            </Badge>
            <Badge variant="outline">{room.score}/100</Badge>
            <Badge variant={room.approvalSafe ? "secondary" : "destructive"}>
              {room.viewLabel}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{room.nextAction}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Button
            asChild
            size="sm"
            variant={room.handoffDownload.ready ? "outline" : "ghost"}
          >
            <a
              download={room.handoffDownload.fileName}
              href={room.handoffDownload.dataUrl}
            >
              <Download className="h-4 w-4" />
              Packet
            </a>
          </Button>
          {room.href ? (
            <Button asChild size="icon" variant="ghost" aria-label="Open room">
              <a href={room.href}>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <RoomSignal
          label="Approval"
          value={room.approvalLabel}
          status={room.status}
        />
        <RoomSignal
          label="Comments"
          value={`${room.metrics.openComments} open`}
          status={room.metrics.openComments ? "review" : "ready"}
        />
        <RoomSignal
          label="Tasks"
          value={`${room.metrics.openTasks} open`}
          status={room.metrics.overdueTasks ? "blocked" : room.metrics.openTasks ? "review" : "ready"}
        />
        <RoomSignal
          label="Handoff"
          value={`${room.metrics.handoffScore}/100`}
          status={room.handoffDownload.ready ? "ready" : "review"}
        />
      </div>
    </article>
  );
}

function ScopedCommentsPanel({ comments }: { comments: ClientPortalComment[] }) {
  return (
    <section className="rounded-md border border-border">
      <div className="border-b border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquareText className="h-4 w-4" />
          Scoped comments
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Client-visible comment and task queue by project room.
        </p>
      </div>
      {comments.length ? (
        <ScrollArea className="h-[280px]">
          <div className="divide-y divide-border">
            {comments.map((comment) => (
              <div key={comment.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm">{comment.body}</p>
                  <Badge
                    variant={
                      comment.overdue
                        ? "destructive"
                        : comment.status === "done"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {comment.overdue ? "Overdue" : comment.status}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {comment.assigneeName ?? "Unassigned"}
                  {comment.dueAt ? ` - Due ${formatDate(comment.dueAt)}` : ""}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          No scoped client comments are open.
        </p>
      )}
    </section>
  );
}

function ReviewerActivityPanel({ center }: { center: ClientPortalCenter }) {
  return (
    <section className="rounded-md border border-border">
      <div className="border-b border-border p-4">
        <h3 className="text-sm font-semibold">Reviewer activity</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent approval, review, and project events visible to portal prep.
        </p>
      </div>
      {center.reviewerActivity.length ? (
        <div className="divide-y divide-border">
          {center.reviewerActivity.map((activity) => (
            <div key={activity.id} className="p-3">
              <p className="text-sm">{activity.summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activity.actorEmail ?? "System"} - {formatDate(activity.createdAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          No reviewer activity has been recorded yet.
        </p>
      )}
    </section>
  );
}

function RoomSignal({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: ClientPortalStatus;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <ReadinessIcon status={status} />
      </div>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <UserRoundCheck className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function ReadinessIcon({ status }: { status: ClientPortalStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
