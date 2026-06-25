"use client";

import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Download,
  FileArchive,
  ShieldAlert,
  UserRoundCheck,
  XCircle,
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
  ClientAnalyticsDeliveryMilestone,
  ClientAnalyticsHandoffRoom,
  ClientAnalyticsHandoffRoomCenter,
  ClientAnalyticsHandoffStatus,
} from "@/features/client-portal/client-analytics-handoff-rooms";
import { cn } from "@/lib/utils";

type ClientAnalyticsHandoffRoomsPanelProps = {
  center: ClientAnalyticsHandoffRoomCenter;
};

const statusLabels: Record<ClientAnalyticsHandoffStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ClientAnalyticsHandoffStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ClientAnalyticsHandoffRoomsPanel({
  center,
}: ClientAnalyticsHandoffRoomsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Client analytics handoff rooms
            </CardTitle>
            <CardDescription>
              Stakeholder-safe analytics, approval context, delivery timelines,
              and downloadable evidence bundles for client handoff.
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
          <Metric label="Safe views" value={center.totals.safeViews} />
          <Metric label="Analytics" value={center.totals.analyticsSnapshots} />
          <Metric label="Approvals" value={center.totals.approvalContexts} />
          <Metric label="Milestones" value={center.totals.deliveryMilestones} />
          <Metric label="Bundles" value={center.totals.evidenceBundles} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {center.rooms.length ? (
            center.rooms.map((room) => (
              <HandoffRoomCard key={room.id} room={room} />
            ))
          ) : (
            <EmptyState>
              Create a client portal room before analytics handoff.
            </EmptyState>
          )}
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Client handoff actions
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

function HandoffRoomCard({ room }: { room: ClientAnalyticsHandoffRoom }) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-4">
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
            {room.campaignName ?? "No campaign"} / {room.nextAction}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <a
            download={room.evidenceBundle.fileName}
            href={room.evidenceBundle.dataUrl}
          >
            <Download className="h-4 w-4" />
            Bundle
          </a>
        </Button>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <RoomMetric
          label="Views"
          value={room.analyticsSnapshot.websiteViews}
          status={room.analyticsSnapshot.status}
        />
        <RoomMetric
          label="Clicks"
          value={room.analyticsSnapshot.websiteClicks}
          status={room.analyticsSnapshot.status}
        />
        <RoomMetric
          label="Responses"
          value={room.analyticsSnapshot.formSubmissions}
          status={room.analyticsSnapshot.status}
        />
        <RoomMetric
          label="Dashboards"
          value={room.analyticsSnapshot.exportReadyDashboards}
          status={room.analyticsSnapshot.status}
        />
      </div>

      <div className="mt-4 grid gap-3">
        <RoomSection
          icon={<UserRoundCheck className="h-4 w-4 text-muted-foreground" />}
          title="Stakeholder view"
          status={room.stakeholderView.safeShare ? "ready" : "blocked"}
          detail={`${room.stakeholderView.label} / ${room.stakeholderView.exposedFields.length} safe fields`}
        >
          <p className="text-xs text-muted-foreground">
            {room.stakeholderView.redactions.join(" ")}
          </p>
        </RoomSection>

        <RoomSection
          icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
          title="Approval context"
          status={room.approvalContext.status}
          detail={`${room.approvalContext.approvalStatus.replace("-", " ")} / ${room.approvalContext.packetScore}/100 packet`}
        >
          {room.approvalContext.blockers.length ? (
            <div className="grid gap-1">
              {room.approvalContext.blockers.slice(0, 3).map((blocker) => (
                <p key={blocker} className="text-xs text-muted-foreground">
                  {blocker}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Approval and scoped review context are ready.
            </p>
          )}
        </RoomSection>

        <RoomSection
          icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
          title="Delivery timeline"
          status={room.deliveryTimeline.status}
          detail={room.deliveryTimeline.summary}
        >
          <div className="grid gap-2 md:grid-cols-5">
            {room.deliveryTimeline.milestones.map((milestone) => (
              <Milestone key={milestone.id} milestone={milestone} />
            ))}
          </div>
        </RoomSection>
      </div>
    </section>
  );
}

function RoomSection({
  icon,
  title,
  status,
  detail,
  children,
}: {
  icon: ReactNode;
  title: string;
  status: ClientAnalyticsHandoffStatus;
  detail: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {icon}
            {title}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Milestone({
  milestone,
}: {
  milestone: ClientAnalyticsDeliveryMilestone;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium">{milestone.label}</p>
        <StatusIcon status={milestone.status} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {milestone.date ? formatDate(milestone.date) : "Unscheduled"}
      </p>
    </div>
  );
}

function RoomMetric({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: ClientAnalyticsHandoffStatus;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <StatusIcon status={status} />
      </div>
      <p className="mt-1 text-sm font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileArchive className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({ status }: { status: ClientAnalyticsHandoffStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <XCircle className={className} />;

  return <ShieldAlert className={className} />;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
