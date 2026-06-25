"use client";

import {
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  Download,
  FileWarning,
  Globe2,
  Mail,
  Rows3,
  ShieldAlert,
  Share2,
  Table2,
  TextCursorInput,
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
  ContentDatabaseBinding,
  ContentDatabaseCenter,
  ContentDatabaseRecord,
  ContentDatabaseStatus,
  ContentDatabaseSurfaceCoverage,
  ContentTemplateSurface,
} from "@/features/content-database/content-database";

type ContentDatabasePanelProps = {
  center: ContentDatabaseCenter;
};

const statusLabels: Record<ContentDatabaseStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ContentDatabaseStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ContentDatabasePanel({ center }: ContentDatabasePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DatabaseZap className="h-5 w-5" />
              Reusable content database
            </CardTitle>
            <CardDescription>
              Brand copy, offers, people, events, and campaign variables with
              traceable template bindings.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a href={center.packet.dataUrl} download={center.packet.fileName}>
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Records" value={center.totals.records} />
          <Metric label="Variables" value={center.totals.variables} />
          <Metric label="Bindings" value={center.totals.bindings} />
          <Metric label="Sources" value={center.totals.sources} />
          <Metric label="Ready" value={center.totals.readyRecords} />
          <Metric label="Merged" value={center.totals.duplicateEvidence} />
        </div>

        <PanelBlock
          title="Surface coverage"
          badge={`${center.surfaceCoverage.filter((surface) => surface.recordCount > 0).length}/5 live`}
          icon={<Rows3 className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            {center.surfaceCoverage.map((surface) => (
              <SurfaceCoverageCard key={surface.surface} surface={surface} />
            ))}
          </div>
        </PanelBlock>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <PanelBlock
            title="Reusable records"
            badge={`${center.records.length} records`}
            icon={<DatabaseZap className="h-4 w-4 text-muted-foreground" />}
          >
            {center.records.length ? (
              <div className="grid gap-2 xl:grid-cols-2">
                {center.records.slice(0, 10).map((record) => (
                  <RecordCard key={record.id} record={record} />
                ))}
              </div>
            ) : (
              <EmptyLine>No reusable content records are available.</EmptyLine>
            )}
          </PanelBlock>

          <PanelBlock
            title="Binding trace"
            badge={`${center.bindings.length} bindings`}
            icon={<Share2 className="h-4 w-4 text-muted-foreground" />}
          >
            {center.bindings.length ? (
              <ScrollArea className="h-[420px]">
                <div className="grid gap-2 pr-3">
                  {center.bindings.slice(0, 24).map((binding) => (
                    <BindingTraceRow key={binding.id} binding={binding} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyLine>No template bindings have been mapped yet.</EmptyLine>
            )}
          </PanelBlock>
        </div>

        <PanelBlock
          title="Next actions"
          badge={`${center.nextActions.length} actions`}
          icon={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="grid gap-2 md:grid-cols-2">
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
      </CardContent>
    </Card>
  );
}

function SurfaceCoverageCard({
  surface,
}: {
  surface: ContentDatabaseSurfaceCoverage;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SurfaceIcon surface={surface.surface} />
            <p className="truncate text-sm font-medium">{surface.label}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {surface.recordCount} records, {surface.bindingCount} bindings
          </p>
        </div>
        <Badge variant={statusVariants[surface.status]}>
          {statusLabels[surface.status]}
        </Badge>
      </div>
    </div>
  );
}

function RecordCard({ record }: { record: ContentDatabaseRecord }) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={record.status} />
            <p className="truncate text-sm font-medium">{record.label}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {record.value}
          </p>
        </div>
        <Badge variant="outline">{record.kind}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="secondary">{`{{${record.variableKey}}}`}</Badge>
        {record.targetSurfaces.map((surface) => (
          <Badge key={surface} variant="outline">
            {surface}
          </Badge>
        ))}
        <Badge variant="outline">{record.sources.length} sources</Badge>
      </div>
    </article>
  );
}

function BindingTraceRow({ binding }: { binding: ContentDatabaseBinding }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{binding.sourceLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {binding.sourceType} to {binding.surfaceLabel}
          </p>
        </div>
        <Badge variant="secondary">{binding.usageCount}</Badge>
      </div>
      <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
        {`{{${binding.variableKey}}}`}
      </p>
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

function StatusIcon({ status }: { status: ContentDatabaseStatus }) {
  if (status === "ready") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "review") return <FileWarning className="h-4 w-4" />;

  return <ShieldAlert className="h-4 w-4" />;
}

function SurfaceIcon({ surface }: { surface: ContentTemplateSurface }) {
  if (surface === "text") {
    return <TextCursorInput className="h-4 w-4 text-muted-foreground" />;
  }

  if (surface === "table") {
    return <Table2 className="h-4 w-4 text-muted-foreground" />;
  }

  if (surface === "website") {
    return <Globe2 className="h-4 w-4 text-muted-foreground" />;
  }

  if (surface === "email") {
    return <Mail className="h-4 w-4 text-muted-foreground" />;
  }

  return <Share2 className="h-4 w-4 text-muted-foreground" />;
}
