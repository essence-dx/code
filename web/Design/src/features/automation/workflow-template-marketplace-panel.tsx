"use client";

import {
  Bot,
  CheckCircle2,
  CircleAlert,
  Download,
  History,
  PackageCheck,
  ShieldCheck,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  WorkflowTemplateMarketplaceCenter,
  WorkflowTemplateMarketplaceReport,
  WorkflowTemplateMarketplaceStatus,
} from "@/features/automation/workflow-template-marketplace";
import { cn } from "@/lib/utils";

type ServerAction = (formData: FormData) => Promise<void> | void;

type WorkflowTemplateMarketplacePanelProps = {
  center: WorkflowTemplateMarketplaceCenter;
  installWorkflowTemplateAction: ServerAction;
};

const statusLabels: Record<WorkflowTemplateMarketplaceStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  WorkflowTemplateMarketplaceStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function WorkflowTemplateMarketplacePanel({
  center,
  installWorkflowTemplateAction,
}: WorkflowTemplateMarketplacePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" />
              Workflow template marketplace
            </CardTitle>
            <CardDescription>
              Versioned internal workflow recipes with dependency checks,
              rollback notes, and adoption analytics.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                download={center.marketplacePacket.fileName}
                href={center.marketplacePacket.dataUrl}
              >
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Templates" value={center.totals.templates} />
          <Metric label="Ready" value={center.totals.readyTemplates} />
          <Metric label="Blocked" value={center.totals.blockedTemplates} />
          <Metric label="Versions" value={center.totals.versions} />
          <Metric label="Installs" value={center.totals.installs} />
          <Metric label="Runs" value={center.totals.recipeRuns} />
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {center.templates.map((template) => (
            <TemplateCard
              installWorkflowTemplateAction={installWorkflowTemplateAction}
              key={template.id}
              template={template}
            />
          ))}
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CircleAlert className="h-4 w-4 text-muted-foreground" />
              Marketplace next actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p
                  className="flex gap-2 text-xs text-muted-foreground"
                  key={action}
                >
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
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

function TemplateCard({
  template,
  installWorkflowTemplateAction,
}: {
  template: WorkflowTemplateMarketplaceReport;
  installWorkflowTemplateAction: ServerAction;
}) {
  const firstWorkspace = template.installableWorkspaces[0] ?? null;
  const canInstall = template.status !== "blocked" && Boolean(firstWorkspace);

  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={template.status} />
            <h3 className="truncate text-sm font-semibold">{template.name}</h3>
            <Badge variant={statusVariants[template.status]}>
              {template.score}/100
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {template.description}
          </p>
        </div>
        <Badge variant="outline">{template.currentVersion.version}</Badge>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Installs" value={template.adoption.installs} />
        <MiniStat label="Runs" value={template.adoption.recipeRuns} />
        <MiniStat
          label="Adoption"
          value={`${template.adoption.adoptionRate}%`}
        />
      </div>

      <div className="mt-4 space-y-3">
        <SectionBlock
          badge={`${template.dependencyChecks.length} checks`}
          icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
          title="Dependencies"
        >
          <div className="grid gap-2">
            {template.dependencyChecks.map((dependency) => (
              <div
                className="rounded-md border border-border bg-background p-3"
                key={dependency.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{dependency.label}</p>
                  <StatusIcon status={dependency.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {dependency.detail}
                </p>
              </div>
            ))}
          </div>
        </SectionBlock>

        <SectionBlock
          badge={`${template.rollbackPlan.notes.length} notes`}
          icon={<History className="h-4 w-4 text-muted-foreground" />}
          title="Rollback"
        >
          <div className="space-y-2">
            {template.rollbackPlan.notes.slice(0, 3).map((note) => (
              <p
                className="rounded-md border border-border bg-background p-2 text-xs text-muted-foreground"
                key={note}
              >
                {note}
              </p>
            ))}
            <Button asChild size="sm" variant="outline">
              <a
                download={template.rollbackPlan.fileName}
                href={template.rollbackPlan.dataUrl}
              >
                <Download className="h-4 w-4" />
                Rollback packet
              </a>
            </Button>
          </div>
        </SectionBlock>
      </div>

      <form action={installWorkflowTemplateAction} className="mt-4 space-y-3">
        <input name="templateId" type="hidden" value={template.id} />
        <input
          name="version"
          type="hidden"
          value={template.currentVersion.version}
        />
        <Select name="workspaceId" defaultValue={firstWorkspace?.id}>
          <SelectTrigger aria-label="Workspace" className="w-full">
            <SelectValue placeholder="Select workspace" />
          </SelectTrigger>
          <SelectContent>
            {template.installableWorkspaces.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id}>
                {workspace.name} - {workspace.role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button disabled={!canInstall} type="submit">
          <Bot className="h-4 w-4" />
          Install template
        </Button>
      </form>

      <p className="mt-3 text-xs text-muted-foreground">
        {template.nextAction}
      </p>
    </article>
  );
}

function SectionBlock({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon: ReactNode;
  badge: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h4>
        <Badge variant="outline">{badge}</Badge>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: WorkflowTemplateMarketplaceStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <XCircle className={className} />;

  return <CircleAlert className={className} />;
}
