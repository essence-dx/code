"use client";

import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Download,
  ExternalLink,
  ListChecks,
  Sparkles,
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
  ProjectCoachingModeCenter,
  ProjectCoachingRecipe,
  ProjectCoachingSession,
  ProjectCoachingStatus,
} from "@/features/coaching/project-coaching-mode";
import { cn } from "@/lib/utils";

type ProjectCoachingModePanelProps = {
  center: ProjectCoachingModeCenter;
};

const statusLabels: Record<ProjectCoachingStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ProjectCoachingStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ProjectCoachingModePanel({
  center,
}: ProjectCoachingModePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Project coaching mode
            </CardTitle>
            <CardDescription>
              Contextual editing recipes, checklist progress, production
              coaching, and reusable learning dashboards for active projects.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Projects" value={center.totals.projects} />
          <Metric label="Sessions" value={center.totals.coachingSessions} />
          <Metric label="Recipes" value={center.totals.contextualRecipes} />
          <Metric label="Checklist" value={center.totals.checklistItems} />
          <Metric label="Readiness" value={center.totals.readinessCards} />
          <Metric label="Blocked" value={center.totals.blockedSessions} />
        </div>

        {center.sessions.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {center.sessions.map((session) => (
              <CoachingSessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Create a project to open the first contextual coaching session.
          </p>
        )}

        <section className="rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            Next coaching actions
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
      </CardContent>
    </Card>
  );
}

function CoachingSessionCard({ session }: { session: ProjectCoachingSession }) {
  const topRecipe = session.contextualRecipes[0] ?? null;

  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={session.status} />
            <h3 className="truncate text-sm font-semibold">
              {session.projectName}
            </h3>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {session.nextAction}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariants[session.status]}>
            {session.score}/100
          </Badge>
          <Button asChild size="icon" variant="ghost" aria-label="Open project">
            <a href={`/editor/${session.projectId}`}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <Signal
          icon={<ListChecks className="h-4 w-4" />}
          label="Checklist"
          value={`${session.checklist.progressPercent}%`}
          detail={`${session.checklist.completedItems}/${session.checklist.totalItems} coaching checkpoints complete`}
          variant={statusVariants[session.checklist.status]}
        />
        <Signal
          icon={<BookOpenCheck className="h-4 w-4" />}
          label="Learning"
          value={`${session.learningDashboard.progressPercent}%`}
          detail={`${session.learningDashboard.tracks.length} reusable learning tracks`}
          variant={statusVariants[session.learningDashboard.status]}
        />
        <Signal
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Readiness"
          value={`${session.readinessCoaching.length} cards`}
          detail={
            session.readinessCoaching[0]?.nextAction ??
            "Production coaching is ready."
          }
        />
        <Signal
          icon={<Sparkles className="h-4 w-4" />}
          label="Top recipe"
          value={topRecipe?.category ?? "ready"}
          detail={topRecipe?.title ?? "Maintenance recipe ready"}
          variant={topRecipe ? statusVariants[topRecipe.status] : "secondary"}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          <SectionHeader>Contextual recipes</SectionHeader>
          {session.contextualRecipes.slice(0, 4).map((recipe) => (
            <RecipeRow key={recipe.id} recipe={recipe} />
          ))}
        </div>

        <div className="space-y-2">
          <SectionHeader>Learning dashboard</SectionHeader>
          {session.learningDashboard.tracks.slice(0, 4).map((track) => (
            <div
              key={track.id}
              className="rounded-md border border-border bg-background p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium">{track.label}</p>
                <Badge variant={statusVariants[track.status]}>
                  {track.progressPercent}%
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {track.completedLessons}/{track.totalLessons} lessons -{" "}
                {track.nextLesson}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Button asChild size="sm" variant="outline" className="mt-3">
        <a
          href={session.coachingPacket.downloadJson}
          download={`${session.projectId}-coaching-packet.json`}
        >
          <Download className="h-3.5 w-3.5" />
          Coaching packet
        </a>
      </Button>
    </section>
  );
}

function RecipeRow({ recipe }: { recipe: ProjectCoachingRecipe }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{recipe.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {recipe.detail}
          </p>
        </div>
        <Badge variant={statusVariants[recipe.status]}>
          {recipe.estimatedMinutes}m
        </Badge>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Signal({
  icon,
  label,
  value,
  detail,
  variant = "outline",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
  variant?: "secondary" | "outline" | "destructive";
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
        <Badge variant={variant}>{value}</Badge>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({ status }: { status: ProjectCoachingStatus }) {
  const className = cn(
    "h-4 w-4",
    status === "ready" && "text-emerald-600",
    status === "review" && "text-amber-600",
    status === "blocked" && "text-destructive",
  );

  if (status === "ready") return <CheckCircle2 className={className} />;

  return <CircleAlert className={className} />;
}
