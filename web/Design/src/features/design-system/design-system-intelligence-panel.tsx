"use client";

import {
  ArrowRight,
  CheckCircle2,
  Component,
  Download,
  ExternalLink,
  FileWarning,
  GitBranch,
  Palette,
  ShieldAlert,
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
  DesignSystemComponentDefinition,
  DesignSystemIntelligenceCenter,
  DesignSystemIntelligenceStatus,
  DesignSystemRefactorPacket,
  DesignSystemTokenDriftReport,
  DesignSystemUsageMap,
} from "@/features/design-system/design-system-intelligence";

type DesignSystemIntelligencePanelProps = {
  center: DesignSystemIntelligenceCenter;
};

const statusLabels: Record<DesignSystemIntelligenceStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  DesignSystemIntelligenceStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function DesignSystemIntelligencePanel({
  center,
}: DesignSystemIntelligencePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Component className="h-5 w-5" />
              Design system intelligence
            </CardTitle>
            <CardDescription>
              Component definitions, token drift, usage maps, and refactor
              packets for reusable creative systems.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Components" value={center.totals.components} />
          <Metric label="Ready" value={center.totals.readyComponents} />
          <Metric label="Token drift" value={center.totals.tokenDrift} />
          <Metric label="Usage maps" value={center.totals.usageMaps} />
          <Metric label="Packets" value={center.totals.refactorPackets} />
          <Metric label="Audits" value={center.totals.auditEvents} />
        </div>

        <PanelBlock
          title="Component definitions"
          badge={`${center.componentDefinitions.length} definitions`}
          icon={<Component className="h-4 w-4 text-muted-foreground" />}
        >
          {center.componentDefinitions.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {center.componentDefinitions.slice(0, 8).map((component) => (
                <ComponentDefinitionCard
                  key={component.id}
                  component={component}
                />
              ))}
            </div>
          ) : (
            <EmptyLine>
              Save templates before defining reusable components.
            </EmptyLine>
          )}
        </PanelBlock>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <PanelBlock
            title="Token drift"
            badge={`${center.tokenDriftReports.length} reports`}
            icon={<Palette className="h-4 w-4 text-muted-foreground" />}
          >
            {center.tokenDriftReports.length ? (
              <div className="grid gap-2">
                {center.tokenDriftReports.map((report) => (
                  <TokenDriftRow key={report.id} report={report} />
                ))}
              </div>
            ) : (
              <EmptyLine>
                Brand tokens are aligned with project audits.
              </EmptyLine>
            )}
          </PanelBlock>

          <PanelBlock
            title="Usage maps"
            badge={`${center.usageMaps.length} maps`}
            icon={<GitBranch className="h-4 w-4 text-muted-foreground" />}
          >
            {center.usageMaps.length ? (
              <ScrollArea className="h-[330px]">
                <div className="grid gap-2 pr-3">
                  {center.usageMaps.map((map) => (
                    <UsageMapRow key={map.id} map={map} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyLine>No component usage maps are available yet.</EmptyLine>
            )}
          </PanelBlock>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <PanelBlock
            title="Refactor packets"
            badge={`${center.refactorPackets.length} packets`}
            icon={<Download className="h-4 w-4 text-muted-foreground" />}
          >
            {center.refactorPackets.length ? (
              <div className="grid gap-2">
                {center.refactorPackets.map((packet) => (
                  <RefactorPacketRow key={packet.id} packet={packet} />
                ))}
              </div>
            ) : (
              <EmptyLine>No design-system refactor packet is needed.</EmptyLine>
            )}
          </PanelBlock>

          <PanelBlock
            title="Next actions"
            badge={`${center.nextActions.length} actions`}
            icon={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-2">
              {center.nextActions.map((action) => (
                <p
                  key={action}
                  className="flex gap-2 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{action}</span>
                </p>
              ))}
            </div>
          </PanelBlock>
        </div>
      </CardContent>
    </Card>
  );
}

function ComponentDefinitionCard({
  component,
}: {
  component: DesignSystemComponentDefinition;
}) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={component.status} />
            <p className="truncate text-sm font-medium">{component.name}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {component.recommendation}
          </p>
        </div>
        <Badge variant={statusVariants[component.status]}>
          {component.score}/100
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{component.kind}</Badge>
        <Badge variant="outline">
          {component.usage.projectIds.length} projects
        </Badge>
        <Badge variant="outline">{component.tokenCoverage.colors} colors</Badge>
        <Badge variant="outline">{component.tokenCoverage.fonts} fonts</Badge>
        <Badge variant="outline">{component.tokenCoverage.logos} logos</Badge>
      </div>
      <Button asChild size="sm" variant="ghost" className="mt-2 px-0">
        <a href={component.href}>
          Open
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
    </article>
  );
}

function TokenDriftRow({ report }: { report: DesignSystemTokenDriftReport }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{report.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{report.detail}</p>
        </div>
        <Badge variant={statusVariants[report.status]}>
          {report.driftCount}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {report.recommendedFix}
      </p>
    </div>
  );
}

function UsageMapRow({ map }: { map: DesignSystemUsageMap }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{map.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{map.detail}</p>
        </div>
        <Badge variant={statusVariants[map.status]}>
          {map.coverageScore}/100
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{map.relation}</Badge>
        <Badge variant="outline">{map.templateIds.length} templates</Badge>
        <Badge variant="outline">{map.projectIds.length} projects</Badge>
      </div>
    </div>
  );
}

function RefactorPacketRow({ packet }: { packet: DesignSystemRefactorPacket }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{packet.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {packet.affectedProjectIds.length} projects, {packet.steps.length}{" "}
            steps
          </p>
        </div>
        <Badge variant={statusVariants[packet.status]}>
          {statusLabels[packet.status]}
        </Badge>
      </div>
      <Button asChild size="sm" variant="outline" className="mt-3">
        <a href={packet.dataUrl} download={packet.fileName}>
          <Download className="h-4 w-4" />
          Packet
        </a>
      </Button>
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
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </div>
        <Badge variant="outline">{badge}</Badge>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({ status }: { status: DesignSystemIntelligenceStatus }) {
  if (status === "ready") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "review") return <FileWarning className="h-4 w-4" />;

  return <ShieldAlert className="h-4 w-4" />;
}
