"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Palette,
  TextCursorInput,
  Type,
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
  ProfessionalTypographyStatus,
  ProfessionalTypographySystemCenter,
  TypographyFontPairingGuidance,
  TypographyPageReport,
  TypographyProjectReport,
  TypographyReadabilityCheck,
  TypographyRepairPacket,
  TypographyScaleToken,
} from "@/features/creation/professional-typography-system";
import { cn } from "@/lib/utils";

type ProfessionalTypographySystemPanelProps = {
  center: ProfessionalTypographySystemCenter;
};

const statusLabels: Record<ProfessionalTypographyStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ProfessionalTypographyStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ProfessionalTypographySystemPanel({
  center,
}: ProfessionalTypographySystemPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Professional typography system
            </CardTitle>
            <CardDescription>
              Reusable type scales, font pairing guidance, readability checks,
              and brand-safe text repair packets for current designs.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.repairPackets.toLocaleString()} packets
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Projects" value={center.totals.projects} />
          <Metric label="Pages" value={center.totals.pages} />
          <Metric label="Text layers" value={center.totals.textLayers} />
          <Metric label="Scale tokens" value={center.totals.typeScaleTokens} />
          <Metric label="Pairings" value={center.totals.fontPairings} />
          <Metric label="Checks" value={center.totals.readabilityChecks} />
          <Metric label="Blocked" value={center.totals.blockedPages} />
          <Metric label="Review" value={center.totals.reviewPages} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <PanelBlock
            title="Reusable type scale"
            badge={`${center.typeScale.tokens.length} tokens`}
            icon={<Palette className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
              {center.typeScale.tokens.map((token) => (
                <ScaleTokenCell key={token.id} token={token} />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {center.typeScale.summary}
            </p>
          </PanelBlock>

          <div className="space-y-4">
            <PanelBlock
              title="Font pairing guidance"
              badge={`${center.fontPairings.length} pairs`}
              icon={
                <TextCursorInput className="h-4 w-4 text-muted-foreground" />
              }
            >
              <div className="grid gap-2">
                {center.fontPairings.map((pairing) => (
                  <FontPairingRow key={pairing.id} pairing={pairing} />
                ))}
              </div>
            </PanelBlock>

            <PanelBlock
              title="Readability findings"
              badge={`${center.readabilityChecks.length} checks`}
              icon={<Type className="h-4 w-4 text-muted-foreground" />}
            >
              <div className="grid gap-2">
                {center.readabilityChecks.slice(0, 4).map((check) => (
                  <ReadabilityCheckRow key={check.id} check={check} />
                ))}
              </div>
            </PanelBlock>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <PanelBlock
            title="Project typography readiness"
            badge={`${center.projectReports.length} projects`}
            icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
          >
            {center.projectReports.length ? (
              <ScrollArea className="h-[330px]">
                <div className="grid gap-2 pr-3">
                  {center.projectReports.map((project) => (
                    <ProjectReportCard key={project.id} project={project} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyLine>No project text layers are available.</EmptyLine>
            )}
          </PanelBlock>

          <PanelBlock
            title="Page readiness"
            badge={`${center.pageReports.length} pages`}
            icon={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-2">
              {center.pageReports.slice(0, 5).map((page) => (
                <PageReportRow key={page.id} page={page} />
              ))}
            </div>
          </PanelBlock>
        </div>

        <PanelBlock
          title="Brand-safe text repair packets"
          badge={`${center.repairPackets.length} packets`}
          icon={<Download className="h-4 w-4 text-muted-foreground" />}
        >
          {center.repairPackets.length ? (
            <div className="grid gap-2 xl:grid-cols-3">
              {center.repairPackets.map((packet) => (
                <RepairPacketCard key={packet.id} packet={packet} />
              ))}
            </div>
          ) : (
            <EmptyLine>
              No brand-safe text repair packets are needed right now.
            </EmptyLine>
          )}
        </PanelBlock>

        <section className="rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            Typography next actions
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

function ScaleTokenCell({ token }: { token: TypographyScaleToken }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{token.label}</p>
        <Badge variant={token.source === "brand" ? "secondary" : "outline"}>
          {token.source}
        </Badge>
      </div>
      <p className="mt-2 truncate text-xs text-muted-foreground">
        {token.fontFamily}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {token.fontSize}px / {token.fontWeight} / {token.lineHeight}
      </p>
    </div>
  );
}

function FontPairingRow({
  pairing,
}: {
  pairing: TypographyFontPairingGuidance;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {pairing.headingFontFamily} + {pairing.bodyFontFamily}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{pairing.detail}</p>
        </div>
        <Badge variant={statusVariants[pairing.status]}>
          {statusLabels[pairing.status]}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {pairing.recommendation}
      </p>
    </div>
  );
}

function ProjectReportCard({ project }: { project: TypographyProjectReport }) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={project.status} />
            <h3 className="truncate text-sm font-semibold">
              {project.projectName}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {project.nextAction}
          </p>
        </div>
        <Badge variant={statusVariants[project.status]}>
          {project.score}/100
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <MiniStat label="Pages" value={project.pageCount} />
        <MiniStat label="Text" value={project.textLayerCount} />
        <MiniStat label="Packets" value={project.repairPacketIds.length} />
      </div>
    </article>
  );
}

function PageReportRow({ page }: { page: TypographyPageReport }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{page.pageName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {page.textLayerCount} text layers / {page.repairPacketIds.length}{" "}
            packets
          </p>
        </div>
        <Badge variant={statusVariants[page.status]}>{page.score}/100</Badge>
      </div>
    </div>
  );
}

function ReadabilityCheckRow({ check }: { check: TypographyReadabilityCheck }) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/20 p-3",
        check.status === "blocked" && "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{check.issue}</p>
        <Badge variant={statusVariants[check.status]}>
          {statusLabels[check.status]}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{check.detail}</p>
      <p className="mt-2 text-xs text-muted-foreground">{check.repairAction}</p>
    </div>
  );
}

function RepairPacketCard({ packet }: { packet: TypographyRepairPacket }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{packet.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {packet.operations.length} operations
          </p>
        </div>
        <Badge variant={statusVariants[packet.status]}>
          {statusLabels[packet.status]}
        </Badge>
      </div>
      <div className="mt-3 grid gap-1">
        {packet.operations.slice(0, 3).map((operation) => (
          <p key={operation.kind} className="text-xs text-muted-foreground">
            {operation.description}
          </p>
        ))}
      </div>
      <Button asChild size="sm" variant="outline" className="mt-3 w-full">
        <a href={packet.dataUrl} download={packet.fileName}>
          <Download className="h-4 w-4" />
          Repair packet
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

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function StatusIcon({ status }: { status: ProfessionalTypographyStatus }) {
  if (status === "blocked") {
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  }

  if (status === "review") {
    return <Type className="h-4 w-4 text-muted-foreground" />;
  }

  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
}
