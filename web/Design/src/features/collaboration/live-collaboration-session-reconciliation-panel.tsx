"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  GitMerge,
  MousePointer2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  LiveCollaborationCursorConflict,
  LiveCollaborationOperationHistoryItem,
  LiveCollaborationReviewerLock,
  LiveCollaborationReconnectRecovery,
  LiveCollaborationSessionReconciliation,
  LiveCollaborationSessionReconciliationCenter,
  LiveCollaborationSessionStatus,
} from "@/features/collaboration/live-collaboration-session-reconciliation";
import { cn } from "@/lib/utils";

type LiveCollaborationSessionReconciliationPanelProps = {
  center: LiveCollaborationSessionReconciliationCenter;
};

const statusLabels: Record<LiveCollaborationSessionStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  LiveCollaborationSessionStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function LiveCollaborationSessionReconciliationPanel({
  center,
}: LiveCollaborationSessionReconciliationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5" />
              Live collaboration reconciliation
            </CardTitle>
            <CardDescription>
              Operation merge history, reviewer locks, participant presence,
              recoverable cursor conflicts, and downloadable replay packets.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.participants.toLocaleString()} participants
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-12">
          <Metric label="Sessions" value={center.totals.sessions} />
          <Metric label="Active" value={center.totals.activeSessions} />
          <Metric label="People" value={center.totals.participants} />
          <Metric label="Online" value={center.totals.activeParticipants} />
          <Metric label="Reconnect" value={center.totals.reconnectRecoveries} />
          <Metric label="Conflicts" value={center.totals.cursorConflicts} />
          <Metric label="Merges" value={center.totals.operationMerges} />
          <Metric label="Stale ops" value={center.totals.operationConflicts} />
          <Metric label="Locks" value={center.totals.reviewerLocks} />
          <Metric label="Packets" value={center.totals.evidencePackets} />
          <Metric label="Replays" value={center.totals.replayPackets} />
          <Metric label="Audit" value={center.totals.auditEvents} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <PanelBlock
              title="Session reconciliation"
              badge={`${center.sessions.length} sessions`}
            >
              {center.sessions.length ? (
                center.sessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))
              ) : (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No live collaboration presence has been recorded yet.
                </p>
              )}
            </PanelBlock>
          </section>
          <section className="space-y-4">
            <PanelBlock title="Recovery queues" badge="live">
              {center.sessions.flatMap((session) => session.reviewerLocks)
                .length ||
              center.sessions.flatMap(
                (session) => session.operationMergeHistory,
              ).length ||
              center.sessions.flatMap((session) => session.reconnectRecoveries)
                .length ||
              center.sessions.flatMap((session) => session.cursorConflictQueue)
                .length ? (
                <>
                  {center.sessions
                    .flatMap((session) => session.operationMergeHistory)
                    .filter((operation) => operation.status === "conflict")
                    .slice(0, 4)
                    .map((operation) => (
                      <OperationRow key={operation.id} operation={operation} />
                    ))}
                  {center.sessions
                    .flatMap((session) => session.reviewerLocks)
                    .slice(0, 4)
                    .map((lock) => (
                      <ReviewerLockRow key={lock.id} lock={lock} />
                    ))}
                  {center.sessions
                    .flatMap((session) => session.reconnectRecoveries)
                    .slice(0, 4)
                    .map((recovery) => (
                      <ReconnectRow key={recovery.id} recovery={recovery} />
                    ))}
                  {center.sessions
                    .flatMap((session) => session.cursorConflictQueue)
                    .slice(0, 4)
                    .map((conflict) => (
                      <ConflictRow key={conflict.id} conflict={conflict} />
                    ))}
                </>
              ) : (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No operation, reviewer-lock, reconnect, or cursor conflict
                  queues are active.
                </p>
              )}
            </PanelBlock>

            {center.nextActions.length ? (
              <PanelBlock
                title="Next collaboration actions"
                badge={`${center.nextActions.length} actions`}
              >
                {center.nextActions.map((action) => (
                  <p
                    key={action}
                    className="flex gap-2 text-xs text-muted-foreground"
                  >
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{action}</span>
                  </p>
                ))}
              </PanelBlock>
            ) : null}
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionCard({
  session,
}: {
  session: LiveCollaborationSessionReconciliation;
}) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={session.status} />
            <p className="truncate text-sm font-semibold">
              {session.projectName}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {session.participants.length} participants /{" "}
            {session.operationMergeHistory.length} operations /{" "}
            {session.reviewerLocks.length} locks /{" "}
            {session.reconnectRecoveries.length} reconnects /{" "}
            {session.cursorConflictQueue.length} cursor conflicts
          </p>
        </div>
        <Badge variant={statusVariants[session.status]}>
          {session.score}/100
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {session.presenceHistory.slice(0, 5).map((participant) => (
          <Badge
            key={participant.id}
            variant={participant.state === "active" ? "secondary" : "outline"}
          >
            {participant.userName} / {participant.state}
          </Badge>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <a
            href={session.evidencePacket.download.href}
            download={session.evidencePacket.download.fileName}
          >
            <Download className="h-4 w-4" />
            Packet
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={session.sessionReplayPacket.download.href}
            download={session.sessionReplayPacket.download.fileName}
          >
            <GitMerge className="h-4 w-4" />
            Replay
          </a>
        </Button>
        <Badge variant="outline">
          {session.evidencePacket.auditLogIds.length} audit logs
        </Badge>
        <Badge variant="outline">
          {session.sessionReplayPacket.timeline.length} replay events
        </Badge>
      </div>
    </article>
  );
}

function OperationRow({
  operation,
}: {
  operation: LiveCollaborationOperationHistoryItem;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <GitMerge className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{operation.actorName}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {operation.operationKind} / revision{" "}
            {operation.clientRevision ?? "unknown"}
          </p>
        </div>
        <Badge
          variant={
            operation.status === "conflict" ? "destructive" : "secondary"
          }
        >
          {operation.status}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{operation.detail}</p>
    </div>
  );
}

function ReviewerLockRow({ lock }: { lock: LiveCollaborationReviewerLock }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{lock.assigneeName}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {lock.projectName} / {lock.lockTarget}
          </p>
        </div>
        <Badge variant={statusVariants[lock.status]}>
          {statusLabels[lock.status]}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {lock.recoverySteps[0]}
      </p>
    </div>
  );
}

function ReconnectRow({
  recovery,
}: {
  recovery: LiveCollaborationReconnectRecovery;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{recovery.userName}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {recovery.projectName} / {recovery.offlineMinutes}m offline /{" "}
            {recovery.taskCount} tasks
          </p>
        </div>
        <Badge variant={statusVariants[recovery.status]}>
          {statusLabels[recovery.status]}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {recovery.recoverySteps[0]}
      </p>
    </div>
  );
}

function ConflictRow({
  conflict,
}: {
  conflict: LiveCollaborationCursorConflict;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <MousePointer2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">
              {conflict.participantNames.join(" / ")}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {conflict.projectName} / {conflict.pageId}
          </p>
        </div>
        <Badge variant={statusVariants[conflict.status]}>
          {Math.round(conflict.distance)}px
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{conflict.detail}</p>
    </div>
  );
}

function PanelBlock({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
      </div>
      <div className="mt-3 grid gap-2">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: LiveCollaborationSessionStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldAlert className={className} />;

  return <CircleAlert className={className} />;
}
