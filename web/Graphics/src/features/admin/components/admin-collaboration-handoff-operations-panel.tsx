"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  ClipboardCopy,
  Download,
  Eraser,
  FileJson2,
  MessageSquareWarning,
  RadioTower,
  ScreenShare,
  UserCheck,
  Users,
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
import type {
  AdminCollaborationHandoffOperationsReport,
  AdminCollaborationHandoffStatus,
} from "@/features/admin/admin-collaboration-handoff-operations";
import {
  archiveCollaborationHandoffEvidence,
  assignCollaborationHandoffOwner,
  clearCollaborationHandoffStaleSnapshot,
  resolveCollaborationHandoffQueue,
} from "@/features/admin/actions";
import {
  getAdminCollaborationHandoffOperationsCsv,
  getAdminCollaborationHandoffOperationsJson,
  getAdminCollaborationHandoffOperationsMarkdown,
} from "@/features/admin/admin-collaboration-handoff-operations-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminCollaborationHandoffOperationsPanelProps = {
  report: AdminCollaborationHandoffOperationsReport;
};

export function AdminCollaborationHandoffOperationsPanel({
  report,
}: AdminCollaborationHandoffOperationsPanelProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function exportJson() {
    downloadTextFile({
      filename: "collaboration-handoff-operations.json",
      content: getAdminCollaborationHandoffOperationsJson(report),
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      filename: "collaboration-handoff-operations.csv",
      content: getAdminCollaborationHandoffOperationsCsv(report),
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      filename: "collaboration-handoff-operations.md",
      content: getAdminCollaborationHandoffOperationsMarkdown(report),
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminCollaborationHandoffOperationsMarkdown(report),
    );
  }

  function runRoomAction(actionId: string, action: () => Promise<unknown>) {
    setActionError(null);
    setPendingAction(actionId);
    startTransition(() => {
      void action()
        .then(() => router.refresh())
        .catch((error) => {
          setActionError(
            error instanceof Error ? error.message : "Room action failed.",
          );
        })
        .finally(() => setPendingAction(null));
    });
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ScreenShare className="size-4" />
            Collaboration handoff rooms
          </CardTitle>
          <CardDescription>
            Replay freshness, unresolved mentions, presenter ownership,
            conflict queues, and admin escalation exports.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Button type="button" size="sm" variant="outline" onClick={exportJson}>
            <FileJson2 className="size-3.5" />
            JSON
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={exportMarkdown}
          >
            <Download className="size-3.5" />
            MD
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copyMarkdown}
          >
            <ClipboardCopy className="size-3.5" />
            Copy
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Rooms" value={report.roomCount} />
          <Metric label="Captured" value={report.capturedRoomCount} />
          <Metric label="Fresh" value={report.replayFreshCount} />
          <Metric label="Mentions" value={report.unresolvedMentionCount} />
          <Metric label="Conflicts" value={report.conflictQueueCount} />
          <Metric label="Escalations" value={report.escalationQueueCount} />
        </div>
        {actionError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {actionError}
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-3">
            {report.rooms.slice(0, 8).map((room) => (
              <div
                key={room.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <Users className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{room.fileName}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant={getStatusVariant(room.status)}>
                        {room.status}
                      </Badge>
                      <Badge variant="outline">{room.ownerEmail}</Badge>
                      <Badge variant={room.roomCaptured ? "outline" : "secondary"}>
                        {room.roomCaptured ? "captured" : "missing room"}
                      </Badge>
                      {room.handoffOwnerEmail ? (
                        <Badge variant="outline">
                          owner {room.handoffOwnerEmail}
                        </Badge>
                      ) : null}
                      {room.evidenceArchivedAt ? (
                        <Badge variant="outline">evidence archived</Badge>
                      ) : null}
                      {room.mentionQueueResolvedAt ? (
                        <Badge variant="outline">mentions resolved</Badge>
                      ) : null}
                      {room.escalationQueueResolvedAt ? (
                        <Badge variant="outline">escalations resolved</Badge>
                      ) : null}
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(room.syncReplay.status)}>
                    replay {room.syncReplay.status}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-4">
                  <Info label="Chat" value={`${room.chatMessageCount}`} />
                  <Info label="Presence" value={`${room.presenceEventCount}`} />
                  <Info label="Mentions" value={`${room.unresolvedMentionCount}`} />
                  <Info
                    label="Age"
                    value={
                      room.roomAgeMinutes === null
                        ? "none"
                        : `${Math.round(room.roomAgeMinutes)}m`
                    }
                  />
                </div>
                <div className="mt-3 rounded-md border border-border bg-background p-2 text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <RadioTower className="size-3.5 text-muted-foreground" />
                    Presenter: {room.presenter.status}
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {room.presenter.summary}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <RoomActionButton
                    actionId={`${room.id}-assign-owner`}
                    icon={<UserCheck className="size-3.5" />}
                    label={room.handoffAssignedAt ? "Reassign owner" : "Assign owner"}
                    pendingAction={pendingAction}
                    onClick={() =>
                      runRoomAction(`${room.id}-assign-owner`, () =>
                        assignCollaborationHandoffOwner({
                          fileId: room.fileId,
                          ownerEmail: room.ownerEmail,
                          ownerName: getOwnerName(room.ownerEmail),
                        }),
                      )
                    }
                  />
                  <RoomActionButton
                    actionId={`${room.id}-archive`}
                    icon={<Archive className="size-3.5" />}
                    label={room.evidenceArchivedAt ? "Archive again" : "Archive"}
                    pendingAction={pendingAction}
                    onClick={() =>
                      runRoomAction(`${room.id}-archive`, () =>
                        archiveCollaborationHandoffEvidence({
                          fileId: room.fileId,
                        }),
                      )
                    }
                  />
                  <RoomActionButton
                    actionId={`${room.id}-clear-stale`}
                    disabled={
                      room.roomAgeMinutes !== null &&
                      room.roomAgeMinutes <= 60 * 24
                    }
                    icon={<Eraser className="size-3.5" />}
                    label="Clear stale"
                    pendingAction={pendingAction}
                    onClick={() =>
                      runRoomAction(`${room.id}-clear-stale`, () =>
                        clearCollaborationHandoffStaleSnapshot({
                          fileId: room.fileId,
                        }),
                      )
                    }
                  />
                  <RoomActionButton
                    actionId={`${room.id}-resolve-mentions`}
                    disabled={room.unresolvedMentionCount === 0}
                    icon={<CheckCircle2 className="size-3.5" />}
                    label="Resolve mentions"
                    pendingAction={pendingAction}
                    onClick={() =>
                      runRoomAction(`${room.id}-resolve-mentions`, () =>
                        resolveCollaborationHandoffQueue({
                          fileId: room.fileId,
                          queue: "mentions",
                        }),
                      )
                    }
                  />
                  <RoomActionButton
                    actionId={`${room.id}-resolve-escalations`}
                    disabled={room.escalationCount === 0}
                    icon={<CheckCircle2 className="size-3.5" />}
                    label="Resolve escalations"
                    pendingAction={pendingAction}
                    onClick={() =>
                      runRoomAction(`${room.id}-resolve-escalations`, () =>
                        resolveCollaborationHandoffQueue({
                          fileId: room.fileId,
                          queue: "escalations",
                        }),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid content-start gap-3">
            {report.rows.slice(0, 8).map((row) => (
              <div
                key={row.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-sm font-medium">
                    {row.label}
                  </div>
                  <Badge variant={getStatusVariant(row.status)}>
                    {row.status}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline">{row.category}</Badge>
                  <Badge variant="secondary">
                    <MessageSquareWarning className="size-3" />
                    {row.count}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{row.detail}</p>
                <p className="mt-2 text-xs">{row.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function RoomActionButton({
  actionId,
  disabled = false,
  icon,
  label,
  onClick,
  pendingAction,
}: {
  actionId: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  pendingAction: string | null;
}) {
  const pending = pendingAction === actionId;

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={Boolean(pendingAction) || disabled}
      onClick={onClick}
    >
      {icon}
      {pending ? "Working" : label}
    </Button>
  );
}

function getOwnerName(email: string) {
  return email.split("@")[0] || email;
}

function getStatusVariant(status: AdminCollaborationHandoffStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
