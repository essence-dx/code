"use client";

import {
  ArrowRight,
  BadgeCheck,
  Download,
  Layers3,
  LibraryBig,
  Route,
  Sparkles,
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
  FirstPartyTemplateLibraryExpansion,
  TemplateLibraryCurationLane,
  TemplateLibraryExpansionStatus,
  TemplateLibraryIndustryPack,
  TemplateLibraryQaGate,
  TemplateLibraryStarterSystem,
} from "@/features/templates/first-party-template-library-expansion";

type FirstPartyTemplateLibraryExpansionPanelProps = {
  expansion: FirstPartyTemplateLibraryExpansion;
};

const statusLabels: Record<TemplateLibraryExpansionStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  TemplateLibraryExpansionStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

const systemIcons: Record<string, LucideIcon> = {
  campaign: Sparkles,
  website: LibraryBig,
  document: Layers3,
  print: Layers3,
  email: Route,
  social: Sparkles,
  motion: Sparkles,
  workshop: Route,
  brand: BadgeCheck,
};

export function FirstPartyTemplateLibraryExpansionPanel({
  expansion,
}: FirstPartyTemplateLibraryExpansionPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LibraryBig className="h-5 w-5" />
              First-party template library
            </CardTitle>
            <CardDescription>
              Industry packs, componentized starter systems, QA gates, and
              curation lanes for original catalog growth.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[expansion.status]}>
              {expansion.score}/100 {statusLabels[expansion.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                download={expansion.libraryPacket.fileName}
                href={expansion.libraryPacket.dataUrl}
              >
                <Download className="h-4 w-4" />
                Library packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
          <Metric label="Catalog" value={expansion.totals.catalogTemplates} />
          <Metric label="Packs" value={expansion.totals.industryPacks} />
          <Metric label="Ready" value={expansion.totals.readyPacks} />
          <Metric label="Review" value={expansion.totals.reviewPacks} />
          <Metric label="Blocked" value={expansion.totals.blockedPacks} />
          <Metric label="Systems" value={expansion.totals.componentSystems} />
          <Metric
            label="Provenance"
            value={`${expansion.totals.provenanceReadyPercent}%`}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={Sparkles}
              title="Industry packs"
              detail="Original catalog coverage grouped into practical starter packs."
            />
            <div className="mt-3 grid gap-3">
              {expansion.industryPacks.slice(0, 5).map((pack) => (
                <IndustryPackRow key={pack.id} pack={pack} />
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={Route}
              title="Curation lanes"
              detail="Marketplace publish, QA, backfill, and promotion workflow."
            />
            <div className="mt-3 grid gap-2">
              {expansion.curationLanes
                .filter((lane) => lane.status !== "ready")
                .slice(0, 4)
                .map((lane) => (
                  <CurationLaneRow
                    key={`${lane.id}-${lane.label}`}
                    lane={lane}
                  />
                ))}
              {expansion.curationLanes.every(
                (lane) => lane.status === "ready",
              ) ? (
                <EmptyState text="All library curation lanes are ready for this pass." />
              ) : null}
            </div>
          </section>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {expansion.industryPacks.slice(0, 3).map((pack) => (
            <section
              key={`${pack.id}-systems`}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <SectionHeader
                icon={Layers3}
                title={pack.industry}
                detail={`${pack.starterSystems.length} starter systems, ${pack.formatCoverage.length} formats.`}
              />
              <div className="mt-3 grid gap-2">
                {pack.starterSystems.slice(0, 3).map((system) => (
                  <StarterSystemRow key={system.id} system={system} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {expansion.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Library next actions
            </div>
            <div className="mt-2 grid gap-2">
              {expansion.nextActions.map((action) => (
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

function IndustryPackRow({ pack }: { pack: TemplateLibraryIndustryPack }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{pack.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {pack.description}
          </p>
        </div>
        <Badge variant={statusVariants[pack.status]}>
          {pack.score}/100 {statusLabels[pack.status]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {pack.formatCoverage.map((format) => (
          <Badge key={format} variant="outline">
            {format}
          </Badge>
        ))}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {pack.qaGates.slice(0, 4).map((gate) => (
          <QaGatePill key={gate.id} gate={gate} />
        ))}
      </div>
      <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{pack.nextAction}</span>
      </p>
    </div>
  );
}

function QaGatePill({ gate }: { gate: TemplateLibraryQaGate }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium">{gate.label}</p>
        <Badge variant={statusVariants[gate.status]}>{gate.score}</Badge>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {gate.detail}
      </p>
    </div>
  );
}

function StarterSystemRow({
  system,
}: {
  system: TemplateLibraryStarterSystem;
}) {
  const Icon = systemIcons[system.kind] ?? Layers3;

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{system.label}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {system.detail}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {system.formats.map((format) => (
          <Badge key={format} variant="outline">
            {format}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function CurationLaneRow({ lane }: { lane: TemplateLibraryCurationLane }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{lane.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {lane.templateIds.length} templates routed
          </p>
        </div>
        <Badge variant={statusVariants[lane.status]}>
          {statusLabels[lane.status]}
        </Badge>
      </div>
      <div className="mt-2 grid gap-1">
        {lane.actions.slice(0, 2).map((action) => (
          <p key={action} className="flex gap-2 text-xs text-muted-foreground">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{action}</span>
          </p>
        ))}
      </div>
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
    <div>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
