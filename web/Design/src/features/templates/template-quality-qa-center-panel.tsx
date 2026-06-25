"use client";

import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Download,
  Gauge,
  Languages,
  ListChecks,
  Route,
  ShieldCheck,
  Store,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  TemplateQualityFixPlan,
  TemplateQualityModerationRoute,
  TemplateQualityProfile,
  TemplateQualityQaPriority,
  TemplateQualityQaStatus,
  TemplateQualityReadiness,
  TemplateQualityQaCenter,
} from "@/features/templates/template-quality-qa-center";

type TemplateQualityQaCenterPanelProps = {
  center: TemplateQualityQaCenter;
};

const statusLabels: Record<TemplateQualityQaStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  TemplateQualityQaStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

const priorityLabels: Record<TemplateQualityQaPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorityVariants: Record<
  TemplateQualityQaPriority,
  "secondary" | "outline" | "destructive"
> = {
  high: "destructive",
  medium: "outline",
  low: "secondary",
};

const readinessIcons: Record<string, LucideIcon> = {
  accessibility: ShieldCheck,
  localization: Languages,
  marketplace: Store,
  moderation: Clock3,
};

export function TemplateQualityQaCenterPanel({
  center,
}: TemplateQualityQaCenterPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5" />
              Template quality QA
            </CardTitle>
            <CardDescription>
              Accessibility, localization, marketplace readiness, moderation
              routing, and creator fix plans for release-ready templates.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                download={center.qualityPacket.fileName}
                href={center.qualityPacket.dataUrl}
              >
                <Download className="h-4 w-4" />
                QA packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Templates" value={center.totals.templates} />
          <Metric label="Ready" value={center.totals.readyTemplates} />
          <Metric label="Review" value={center.totals.reviewTemplates} />
          <Metric label="Blocked" value={center.totals.blockedTemplates} />
          <Metric label="Routes" value={center.totals.moderationRoutes} />
          <Metric label="Fixes" value={center.totals.creatorFixes} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={Route}
              title="Moderation routing"
              detail={`${center.totals.accessibilityIssues} accessibility/localization, ${center.totals.marketplaceIssues} marketplace issue groups.`}
            />
            <div className="mt-3 grid gap-2">
              {center.moderationRoutes.length ? (
                center.moderationRoutes
                  .slice(0, 5)
                  .map((route) => (
                    <ModerationRouteRow key={route.id} route={route} />
                  ))
              ) : (
                <EmptyState text="No template QA routes are open." />
              )}
            </div>
          </section>

          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={Wrench}
              title="Creator fix plans"
              detail="Prioritized creator and moderator actions before release."
            />
            <div className="mt-3 grid gap-2">
              {center.creatorFixPlans.some((plan) => plan.items.length) ? (
                center.creatorFixPlans
                  .filter((plan) => plan.items.length)
                  .slice(0, 4)
                  .map((plan) => (
                    <FixPlanRow key={plan.templateId} plan={plan} />
                  ))
              ) : (
                <EmptyState text="No creator fix plans are open." />
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {center.templateProfiles.slice(0, 6).map((profile) => (
            <TemplateProfileCard key={profile.templateId} profile={profile} />
          ))}
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Template QA next actions
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

function TemplateProfileCard({ profile }: { profile: TemplateQualityProfile }) {
  const readiness = Object.values(profile.readiness);

  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            {profile.templateName}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {profile.creatorDetail} - {profile.dimensions}
          </p>
        </div>
        <Badge variant={statusVariants[profile.status]}>
          {profile.score}/100 {statusLabels[profile.status]}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {readiness.map((item) => (
          <ReadinessTile key={item.id} readiness={item} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-muted-foreground">
        <span>{profile.stats.views} views</span>
        <span>{profile.stats.uses} uses</span>
        <span>{profile.stats.conversionRate}% conv.</span>
        <span>{profile.stats.relatedProjectAudits} audits</span>
      </div>
      <Button asChild size="sm" variant="ghost" className="mt-2 px-0">
        <a href={profile.href}>
          Open template
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </Button>
    </section>
  );
}

function ReadinessTile({ readiness }: { readiness: TemplateQualityReadiness }) {
  const Icon = readinessIcons[readiness.id] ?? ListChecks;

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {readiness.label}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {readiness.detail}
          </p>
        </div>
        <Badge variant={statusVariants[readiness.status]}>
          {readiness.score}
        </Badge>
      </div>
      {readiness.signals.length ? (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {readiness.signals[0]}
        </p>
      ) : null}
    </div>
  );
}

function ModerationRouteRow({
  route,
}: {
  route: TemplateQualityModerationRoute;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{route.templateName}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {route.reason}
          </p>
        </div>
        <Badge variant={priorityVariants[route.priority]} className="shrink-0">
          {priorityLabels[route.priority]}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant={statusVariants[route.status]}>
          {statusLabels[route.status]}
        </Badge>
        <Badge variant="outline">{route.queueLabel}</Badge>
      </div>
    </div>
  );
}

function FixPlanRow({ plan }: { plan: TemplateQualityFixPlan }) {
  const firstItem = plan.items[0];

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{plan.templateName}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {firstItem?.detail ?? plan.summary}
          </p>
        </div>
        <Badge variant={statusVariants[plan.status]} className="shrink-0">
          {plan.items.length} fixes
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {plan.items.slice(0, 3).map((item) => (
          <Badge key={item.id} variant={priorityVariants[item.priority]}>
            {item.owner}
          </Badge>
        ))}
      </div>
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

function SectionHeader({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
      {text}
    </p>
  );
}
