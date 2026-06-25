"use client";

import {
  ArrowRight,
  Box,
  CheckCircle2,
  CircleAlert,
  GitBranch,
  Globe2,
  Network,
  PackageCheck,
  ShieldAlert,
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
  ProjectDependencyCluster,
  ProjectDependencyGraph,
  ProjectDependencyGraphStatus,
  ProjectDependencyNode,
  ProjectDependencyRisk,
} from "@/features/projects/project-dependency-graph";
import { cn } from "@/lib/utils";

type ProjectDependencyGraphPanelProps = {
  graph: ProjectDependencyGraph;
};

const statusLabels: Record<ProjectDependencyGraphStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ProjectDependencyGraphStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

const nodeIcons: Record<ProjectDependencyNode["type"], LucideIcon> = {
  project: Box,
  package: PackageCheck,
  export: ArrowRight,
  website: Globe2,
  campaign: GitBranch,
  "public-link": Network,
};

export function ProjectDependencyGraphPanel({
  graph,
}: ProjectDependencyGraphPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Project dependency graph
            </CardTitle>
            <CardDescription>
              Source designs, variants, packages, exports, websites, campaigns,
              and public links connected in one release-risk map.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[graph.status]}>
            {graph.score}/100 {statusLabels[graph.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Projects" value={graph.totals.projects} />
          <Metric label="Variants" value={graph.totals.variants} />
          <Metric label="Packages" value={graph.totals.packages} />
          <Metric label="Exports" value={graph.totals.exports} />
          <Metric label="Public links" value={graph.totals.publicLinks} />
          <Metric label="Risks" value={graph.totals.risks} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={GitBranch}
              title="Dependency clusters"
              detail={`${graph.totals.edges} dependency edges across the active workspace.`}
            />
            <div className="mt-3 grid gap-3">
              {graph.clusters.length ? (
                graph.clusters.map((cluster) => (
                  <ClusterCard key={cluster.projectId} cluster={cluster} />
                ))
              ) : (
                <EmptyState text="Create projects or packages to start the dependency graph." />
              )}
            </div>
          </section>

          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={ShieldAlert}
              title="Graph risk queue"
              detail="Lineage, export, website, and share-link issues that need review."
            />
            <div className="mt-3 grid gap-2">
              {graph.risks.length ? (
                graph.risks
                  .slice(0, 6)
                  .map((risk) => <RiskCard key={risk.id} risk={risk} />)
              ) : (
                <EmptyState text="No dependency risks are visible in the current graph." />
              )}
            </div>
          </section>
        </div>

        {graph.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Dependency next actions
            </div>
            <div className="mt-2 grid gap-2">
              {graph.nextActions.map((action) => (
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

function ClusterCard({ cluster }: { cluster: ProjectDependencyCluster }) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <StatusIcon status={cluster.status} />
            <span className="truncate">{cluster.projectName}</span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {cluster.nodes.length} nodes, {cluster.edges.length} edges,
            {cluster.riskCount} risks
          </p>
        </div>
        <Badge variant={statusVariants[cluster.status]}>
          {statusLabels[cluster.status]}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {cluster.nodes.slice(0, 6).map((node) => (
          <NodeBadge key={node.id} node={node} />
        ))}
      </div>

      <div className="mt-3 grid gap-2">
        {cluster.edges.slice(0, 4).map((edge) => (
          <div
            key={edge.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5 text-xs"
          >
            <span className="truncate">{edge.label}</span>
            <Badge variant={statusVariants[edge.status]}>{edge.type}</Badge>
          </div>
        ))}
      </div>
    </article>
  );
}

function RiskCard({ risk }: { risk: ProjectDependencyRisk }) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{risk.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {risk.detail}
          </p>
        </div>
        <Badge variant={statusVariants[risk.status]} className="shrink-0">
          {formatRiskKind(risk.kind)}
        </Badge>
      </div>
      {risk.href ? (
        <Button asChild size="sm" variant="ghost" className="mt-2 px-0">
          <a href={risk.href}>
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      ) : null}
    </article>
  );
}

function NodeBadge({ node }: { node: ProjectDependencyNode }) {
  const Icon = nodeIcons[node.type];

  return (
    <Badge variant={statusVariants[node.status]} className="max-w-full">
      <Icon className="h-3 w-3" />
      <span className="truncate">{node.label}</span>
    </Badge>
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
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      {text}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Network className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: ProjectDependencyGraphStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}

function formatRiskKind(kind: ProjectDependencyRisk["kind"]) {
  return kind
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
