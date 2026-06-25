"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  FileClock,
  Handshake,
  RadioTower,
  ShieldAlert,
  Target,
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
  ProductionCollaborationConflictOwnership,
  ProductionCollaborationRoom,
  ProductionCollaborationRoomCenter,
  ProductionCollaborationRoomStatus,
} from "@/features/collaboration/production-collaboration-rooms";
import { cn } from "@/lib/utils";

type ProductionCollaborationRoomsPanelProps = {
  center: ProductionCollaborationRoomCenter;
};

const statusLabels: Record<ProductionCollaborationRoomStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ProductionCollaborationRoomStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ProductionCollaborationRoomsPanel({
  center,
}: ProductionCollaborationRoomsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RadioTower className="h-5 w-5" />
              Production collaboration rooms
            </CardTitle>
            <CardDescription>
              Goal-led live rooms with role handoffs, conflict ownership, async
              update timelines, and downloadable collaboration evidence.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.conflictOwners.toLocaleString()} owners
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-10">
          <Metric label="Rooms" value={center.totals.rooms} />
          <Metric label="Ready" value={center.totals.readyRooms} />
          <Metric label="Review" value={center.totals.reviewRooms} />
          <Metric label="Blocked" value={center.totals.blockedRooms} />
          <Metric label="Goals" value={center.totals.sessionGoals} />
          <Metric label="Handoffs" value={center.totals.roleHandoffs} />
          <Metric label="Owners" value={center.totals.conflictOwners} />
          <Metric label="Updates" value={center.totals.asyncUpdates} />
          <Metric label="Tasks" value={center.totals.openReviewTasks} />
          <Metric label="Bundles" value={center.totals.evidenceBundles} />
        </div>

        {center.rooms.length ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="space-y-3">
              {center.rooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </section>
            <section className="space-y-3">
              <PanelBlock
                badge={`${center.totals.conflictOwners} owners`}
                icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
                title="Conflict ownership"
              >
                {center.rooms
                  .flatMap((room) => room.conflictOwnership)
                  .slice(0, 8)
                  .map((ownership) => (
                    <OwnershipRow key={ownership.id} ownership={ownership} />
                  ))}
              </PanelBlock>

              {center.nextActions.length ? (
                <PanelBlock
                  badge={`${center.nextActions.length} actions`}
                  icon={
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  }
                  title="Next room actions"
                >
                  {center.nextActions.map((action) => (
                    <p
                      className="flex gap-2 text-xs text-muted-foreground"
                      key={action}
                    >
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{action}</span>
                    </p>
                  ))}
                </PanelBlock>
              ) : null}
            </section>
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            No live collaboration sessions are ready for production room
            coordination yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RoomCard({ room }: { room: ProductionCollaborationRoom }) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={room.status} />
            <h3 className="truncate text-sm font-semibold">
              {room.projectName}
            </h3>
            <Badge variant={statusVariants[room.status]}>
              {room.score}/100
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {room.sessionGoal.title}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <a
            download={room.evidenceBundle.fileName}
            href={room.evidenceBundle.dataUrl}
          >
            <Download className="h-4 w-4" />
            Evidence
          </a>
        </Button>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <MiniStat label="Handoffs" value={room.roleHandoffs.length} />
        <MiniStat label="Owners" value={room.conflictOwnership.length} />
        <MiniStat label="Updates" value={room.asyncUpdates.length} />
        <MiniStat
          label="Replay"
          value={room.sourceSession.sessionReplayPacket.timeline.length}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <PanelBlock
          badge={statusLabels[room.sessionGoal.status]}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          title="Room goal"
        >
          <p className="text-xs text-muted-foreground">
            {room.sessionGoal.detail}
          </p>
          <Badge className="w-fit" variant="outline">
            Owner: {room.sessionGoal.ownerName}
          </Badge>
        </PanelBlock>
        <PanelBlock
          badge={`${room.roleHandoffs.length} roles`}
          icon={<Handshake className="h-4 w-4 text-muted-foreground" />}
          title="Role handoffs"
        >
          {room.roleHandoffs.slice(0, 4).map((handoff) => (
            <div
              className="rounded-md border border-border bg-background p-3"
              key={handoff.id}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">
                  {humanize(handoff.role)} / {handoff.ownerName}
                </p>
                <StatusIcon status={handoff.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {handoff.detail}
              </p>
            </div>
          ))}
        </PanelBlock>
      </div>

      {room.asyncUpdates.length ? (
        <PanelBlock
          badge={`${room.asyncUpdates.length} updates`}
          icon={<FileClock className="h-4 w-4 text-muted-foreground" />}
          title="Async updates"
        >
          {room.asyncUpdates.slice(0, 5).map((update) => (
            <div
              className="flex items-start justify-between gap-3 rounded-md border border-border bg-background p-3"
              key={update.id}
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">
                  {update.ownerName}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {update.summary}
                </p>
              </div>
              <Badge variant={statusVariants[update.status]}>
                {update.kind}
              </Badge>
            </div>
          ))}
        </PanelBlock>
      ) : null}
    </article>
  );
}

function OwnershipRow({
  ownership,
}: {
  ownership: ProductionCollaborationConflictOwnership;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <UsersRound className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{ownership.ownerName}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ownership.projectName} / {humanize(ownership.kind)} /{" "}
            {ownership.target}
          </p>
        </div>
        <Badge variant={statusVariants[ownership.status]}>
          {statusLabels[ownership.status]}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{ownership.nextStep}</p>
    </div>
  );
}

function PanelBlock({
  title,
  badge,
  icon,
  children,
}: {
  title: string;
  badge?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-semibold">{title}</h4>
        </div>
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

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: ProductionCollaborationRoomStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldAlert className={className} />;

  return <CircleAlert className={className} />;
}

function humanize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
