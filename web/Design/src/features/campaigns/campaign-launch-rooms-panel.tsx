"use client";

import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Download,
  Gauge,
  Megaphone,
  Route,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  CampaignLaunchChannel,
  CampaignLaunchRoom,
  CampaignLaunchRoomCenter,
  CampaignLaunchRoomStatus,
  CampaignRolloutMilestone,
  CampaignStakeholderSignoffItem,
} from "@/features/campaigns/campaign-launch-rooms";
import { cn } from "@/lib/utils";

type CampaignLaunchRoomsPanelProps = {
  center: CampaignLaunchRoomCenter;
};

const statusLabels: Record<CampaignLaunchRoomStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  CampaignLaunchRoomStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function CampaignLaunchRoomsPanel({
  center,
}: CampaignLaunchRoomsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Campaign launch rooms
            </CardTitle>
            <CardDescription>
              Stakeholder signoff, channel readiness, rollout timelines, and
              launch command packets for cross-format campaigns.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Rooms" value={center.totals.campaigns} />
          <Metric label="Ready" value={center.totals.readyRooms} />
          <Metric label="Review" value={center.totals.reviewRooms} />
          <Metric label="Blocked" value={center.totals.blockedRooms} />
          <Metric
            label="Scheduled"
            value={center.totals.scheduledDeliverables}
          />
          <Metric label="Signoffs" value={center.totals.pendingSignoffs} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {center.rooms.length ? (
            center.rooms
              .slice(0, 6)
              .map((room) => <LaunchRoomCard key={room.id} room={room} />)
          ) : (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Campaign launch rooms will appear after a campaign board has
              deliverables.
            </p>
          )}
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Launch room next actions
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
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LaunchRoomCard({ room }: { room: CampaignLaunchRoom }) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            {room.campaignName}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {room.goal || "No goal"} / {room.audience || "No audience"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariants[room.status]}>
            {room.score}/100 {statusLabels[room.status]}
          </Badge>
          <Button asChild size="sm" variant="outline">
            <a
              download={room.launchCommandPacket.fileName}
              href={room.launchCommandPacket.dataUrl}
            >
              <Download className="h-4 w-4" />
              Packet
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-4">
        <Metric label="Deliverables" value={room.totals.deliverables} />
        <Metric label="Formats" value={room.totals.formats} />
        <Metric label="Scheduled" value={room.totals.scheduledDeliverables} />
        <Metric label="Open tasks" value={room.totals.openReviewTasks} />
      </div>

      <div className="mt-3 grid gap-3">
        <RoomSection
          icon={UsersRound}
          title="Stakeholder signoff"
          status={room.stakeholderSignoff.status}
          detail={`${room.stakeholderSignoff.approvedDeliverables} approved, ${room.stakeholderSignoff.pendingDeliverables} pending, ${room.stakeholderSignoff.openTasks} open tasks.`}
        >
          {room.stakeholderSignoff.items.length ? (
            <div className="grid gap-2">
              {room.stakeholderSignoff.items.slice(0, 3).map((item) => (
                <SignoffItemRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState text="No stakeholder signoff blockers are open." />
          )}
        </RoomSection>

        <RoomSection
          icon={Route}
          title="Channel readiness"
          status={room.channelReadiness.status}
          detail={`${room.channelReadiness.channels.length} channel paths scored for rollout.`}
        >
          <div className="grid gap-2 md:grid-cols-2">
            {room.channelReadiness.channels.map((channel) => (
              <ChannelRow key={channel.id} channel={channel} />
            ))}
          </div>
        </RoomSection>

        <RoomSection
          icon={CalendarClock}
          title="Rollout timeline"
          status={room.rolloutTimeline.status}
          detail={`${room.rolloutTimeline.milestones.length} launch milestones tracked.`}
        >
          <div className="grid gap-2 md:grid-cols-5">
            {room.rolloutTimeline.milestones.map((milestone) => (
              <MilestoneRow key={milestone.id} milestone={milestone} />
            ))}
          </div>
        </RoomSection>
      </div>
    </section>
  );
}

function RoomSection({
  icon: Icon,
  title,
  status,
  detail,
  children,
}: {
  icon: LucideIcon;
  title: string;
  status: CampaignLaunchRoomStatus;
  detail: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {title}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <ReadinessIcon status={status} />
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SignoffItemRow({ item }: { item: CampaignStakeholderSignoffItem }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {item.detail}
          </p>
        </div>
        <Badge variant={statusVariants[item.status]}>{item.owner}</Badge>
      </div>
    </div>
  );
}

function ChannelRow({ channel }: { channel: CampaignLaunchChannel }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{channel.name}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {channel.detail}
          </p>
        </div>
        <Badge variant={statusVariants[channel.status]}>{channel.score}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline">{channel.deliverables} deliverables</Badge>
        <Badge variant="outline">
          {channel.scheduledDeliverables} scheduled
        </Badge>
        {channel.publishingRollupScore !== null ? (
          <Badge variant="outline">
            {channel.publishingRollupScore} channel
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function MilestoneRow({ milestone }: { milestone: CampaignRolloutMilestone }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{milestone.title}</p>
        <ReadinessIcon status={milestone.status} />
      </div>
      <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
        {milestone.detail}
      </p>
      {milestone.date ? (
        <Badge variant="outline" className="mt-2">
          {new Date(milestone.date).toLocaleDateString()}
        </Badge>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Gauge className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
      {text}
    </p>
  );
}

function ReadinessIcon({ status }: { status: CampaignLaunchRoomStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}
