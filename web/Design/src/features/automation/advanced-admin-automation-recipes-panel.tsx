"use client";

import {
  ArchiveRestore,
  ArrowRight,
  BellRing,
  CheckCircle2,
  CircleAlert,
  Download,
  FileWarning,
  ListChecks,
  ShieldAlert,
  Workflow,
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
  AdvancedAdminAutomationCenter,
  AdvancedAdminAutomationRecipeId,
  AdvancedAdminAutomationRecipePlan,
  AdvancedAdminAutomationStatus,
} from "@/features/automation/advanced-admin-automation-recipes";
import { cn } from "@/lib/utils";

type AdvancedAdminAutomationRecipesPanelProps = {
  center: AdvancedAdminAutomationCenter;
};

const statusLabels: Record<AdvancedAdminAutomationStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  AdvancedAdminAutomationStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function AdvancedAdminAutomationRecipesPanel({
  center,
}: AdvancedAdminAutomationRecipesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Advanced admin automation
            </CardTitle>
            <CardDescription>
              Bulk remediation, approval follow-ups, retention sweeps, and audit
              packet generation from governance evidence.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.targets.toLocaleString()} targets
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Recipes" value={center.totals.recipes} />
          <Metric label="Ready" value={center.totals.readyRecipes} />
          <Metric label="Review" value={center.totals.reviewRecipes} />
          <Metric label="Blocked" value={center.totals.blockedRecipes} />
          <Metric label="Targets" value={center.totals.targets} />
          <Metric label="Actions" value={center.totals.plannedActions} />
          <Metric label="Audit" value={center.totals.auditEvents} />
          <Metric label="Packets" value={center.totals.sourcePackets} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <PanelBlock
              title="Admin recipes"
              badge={`${center.recipes.length} workflows`}
            >
              {center.recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </PanelBlock>
          </section>
          <section className="space-y-4">
            <AuditPacket center={center} />
            {center.nextActions.length ? (
              <PanelBlock
                title="Next admin actions"
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

function RecipeCard({ recipe }: { recipe: AdvancedAdminAutomationRecipePlan }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <RecipeIcon id={recipe.id} />
            <StatusIcon status={recipe.status} />
            <p className="truncate text-sm font-semibold">{recipe.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {recipe.description}
          </p>
        </div>
        <Badge variant={statusVariants[recipe.status]}>
          {recipe.score}/100
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Metric
          label={recipe.targetLabel}
          value={recipe.targets.length}
          compact
        />
        <Metric label="Actions" value={recipe.plannedActions.length} compact />
        <Metric label="Audit" value={recipe.auditLogIds.length} compact />
      </div>

      {recipe.targets.length ? (
        <div className="mt-3 grid gap-2">
          {recipe.targets.slice(0, 4).map((target) => (
            <div
              key={target.id}
              className="rounded-md border border-border bg-background p-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{target.label}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {target.detail}
                  </p>
                </div>
                <Badge variant={statusVariants[target.status]}>
                  {statusLabels[target.status]}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      ) : recipe.disabledReason ? (
        <p className="mt-3 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
          {recipe.disabledReason}
        </p>
      ) : null}

      {recipe.plannedActions.length ? (
        <div className="mt-3 grid gap-1">
          {recipe.plannedActions.slice(0, 3).map((action) => (
            <p
              key={action}
              className="flex gap-2 text-xs text-muted-foreground"
            >
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{action}</span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AuditPacket({ center }: { center: AdvancedAdminAutomationCenter }) {
  return (
    <PanelBlock
      title="Audit packet"
      badge={statusLabels[center.auditPacket.status]}
    >
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-muted-foreground" />
              <p className="truncate text-sm font-medium">
                Admin automation packet
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {center.auditPacket.recipeIds.length} recipes /{" "}
              {center.auditPacket.auditLogIds.length} audit events /{" "}
              {center.auditPacket.packetIds.length} source packets.
            </p>
          </div>
          <Badge variant={statusVariants[center.auditPacket.status]}>
            {statusLabels[center.auditPacket.status]}
          </Badge>
        </div>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <a
            href={center.auditPacket.download.href}
            download={center.auditPacket.download.fileName}
          >
            <Download className="h-4 w-4" />
            Packet
          </a>
        </Button>
      </div>
    </PanelBlock>
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

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-semibold", compact ? "text-sm" : "text-lg")}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function RecipeIcon({ id }: { id: AdvancedAdminAutomationRecipeId }) {
  const className = "h-4 w-4 text-muted-foreground";

  if (id === "bulk-remediation") return <ShieldAlert className={className} />;
  if (id === "approval-follow-ups") return <BellRing className={className} />;
  if (id === "retention-sweep") {
    return <ArchiveRestore className={className} />;
  }

  return <ListChecks className={className} />;
}

function StatusIcon({ status }: { status: AdvancedAdminAutomationStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldAlert className={className} />;

  return <CircleAlert className={className} />;
}
