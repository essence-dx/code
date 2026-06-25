"use client";

import {
  ArrowRight,
  BadgeCheck,
  Camera,
  Download,
  FileClock,
  GitCompareArrows,
  History,
  ShieldCheck,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  CollaborativeProofingCompareRoom,
  CollaborativeProofingCompareRoomCenter,
  CollaborativeProofingStatus,
  ProofingDecisionTrailItem,
} from "@/features/review/collaborative-proofing-compare-rooms";
import { cn } from "@/lib/utils";

type CollaborativeProofingCompareRoomsPanelProps = {
  center: CollaborativeProofingCompareRoomCenter;
};

const statusLabels: Record<CollaborativeProofingStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  CollaborativeProofingStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function CollaborativeProofingCompareRoomsPanel({
  center,
}: CollaborativeProofingCompareRoomsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5" />
              Collaborative proofing compare rooms
            </CardTitle>
            <CardDescription>
              Visual change snapshots, annotated decision trails, signed
              approval snapshots, and revision rollback packets.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.rollbackPackets.toLocaleString()} rollback packets
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Rooms" value={center.totals.rooms} />
          <Metric label="Ready" value={center.totals.readyRooms} />
          <Metric label="Review" value={center.totals.reviewRooms} />
          <Metric label="Blocked" value={center.totals.blockedRooms} />
          <Metric label="Snapshots" value={center.totals.visualSnapshots} />
          <Metric label="Decisions" value={center.totals.decisionTrailItems} />
          <Metric
            label="Approvals"
            value={center.totals.signedApprovalSnapshots}
          />
          <Metric label="Rollbacks" value={center.totals.rollbackPackets} />
        </div>

        {center.rooms.length ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <ScrollArea className="h-[520px]">
              <div className="grid gap-3 pr-3">
                {center.rooms.map((room) => (
                  <ProofingRoomCard key={room.id} room={room} />
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-4">
              <PanelBlock
                title="Decision trail"
                badge={`${center.totals.decisionTrailItems} items`}
                icon={<History className="h-4 w-4 text-muted-foreground" />}
              >
                <div className="grid gap-2">
                  {center.rooms
                    .flatMap((room) => room.decisionTrail.items)
                    .slice(0, 8)
                    .map((item) => (
                      <DecisionTrailRow key={item.id} item={item} />
                    ))}
                </div>
              </PanelBlock>

              <PanelBlock
                title="Next proofing actions"
                badge={`${center.nextActions.length} actions`}
                icon={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
              >
                <div className="grid gap-2">
                  {center.nextActions.map((action) => (
                    <p
                      className="flex gap-2 text-xs text-muted-foreground"
                      key={action}
                    >
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{action}</span>
                    </p>
                  ))}
                </div>
              </PanelBlock>
            </div>
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            Create project revisions to open collaborative proofing compare
            rooms.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProofingRoomCard({
  room,
}: {
  room: CollaborativeProofingCompareRoom;
}) {
  return (
    <article
      className={cn(
        "rounded-md border border-border bg-muted/20 p-4",
        room.status === "blocked" && "border-destructive/30 bg-destructive/5",
      )}
    >
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
            {room.nextAction}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <a
            download={room.rollbackPacket.fileName}
            href={room.rollbackPacket.dataUrl}
          >
            <Download className="h-4 w-4" />
            Rollback
          </a>
        </Button>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <MiniStat
          label="Snapshot"
          value={statusLabels[room.visualSnapshot.status]}
        />
        <MiniStat
          label="Fields"
          value={room.visualSnapshot.changedFields.length}
        />
        <MiniStat label="Decisions" value={room.decisionTrail.items.length} />
        <MiniStat
          label="Approval"
          value={statusLabels[room.signedApprovalSnapshot.status]}
        />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <StatusPanel
          icon={<Camera className="h-4 w-4 text-muted-foreground" />}
          label="Visual snapshot"
          status={room.visualSnapshot.status}
          detail={room.visualSnapshot.detail}
        />
        <StatusPanel
          icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
          label="Signed approval"
          status={room.signedApprovalSnapshot.status}
          detail={room.signedApprovalSnapshot.detail}
        />
        <StatusPanel
          icon={<FileClock className="h-4 w-4 text-muted-foreground" />}
          label="Rollback packet"
          status={room.rollbackPacket.status}
          detail={room.rollbackPacket.detail}
        />
        <StatusPanel
          icon={<History className="h-4 w-4 text-muted-foreground" />}
          label="Decision trail"
          status={room.decisionTrail.status}
          detail={room.decisionTrail.summary}
        />
      </div>
    </article>
  );
}

function DecisionTrailRow({ item }: { item: ProofingDecisionTrailItem }) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/20 p-3",
        item.status === "blocked" && "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.summary}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.actor} / {item.kind}
          </p>
        </div>
        <Badge variant={statusVariants[item.status]}>
          {statusLabels[item.status]}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{item.annotation}</p>
    </div>
  );
}

function StatusPanel({
  icon,
  label,
  status,
  detail,
}: {
  icon: ReactNode;
  label: string;
  status: CollaborativeProofingStatus;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-medium">{label}</p>
        </div>
        <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
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
  badge: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-background/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <Badge variant="outline">{badge}</Badge>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background/70 px-2 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate text-xs font-medium">{value}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: CollaborativeProofingStatus }) {
  if (status === "blocked") {
    return <BadgeCheck className="h-4 w-4 text-destructive" />;
  }

  if (status === "review") {
    return <GitCompareArrows className="h-4 w-4 text-muted-foreground" />;
  }

  return <BadgeCheck className="h-4 w-4 text-emerald-500" />;
}
