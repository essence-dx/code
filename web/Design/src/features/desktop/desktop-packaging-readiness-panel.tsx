"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  FileText,
  PackageCheck,
  Rocket,
  ShieldAlert,
} from "lucide-react";

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
  DesktopPackagingCheck,
  DesktopPackagingGate,
  DesktopPackagingReadinessCenter,
  DesktopPackagingStatus,
} from "@/features/desktop/desktop-packaging-readiness";
import { cn } from "@/lib/utils";

type DesktopPackagingReadinessPanelProps = {
  center: DesktopPackagingReadinessCenter;
};

const statusLabels: Record<DesktopPackagingStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  DesktopPackagingStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function DesktopPackagingReadinessPanel({
  center,
}: DesktopPackagingReadinessPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" />
              Desktop packaging readiness
            </CardTitle>
            <CardDescription>
              Tauri signing, release channels, installer QA, updater posture,
              desktop evidence, and production release notes.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                download={center.releasePacket.download.fileName}
                href={center.releasePacket.download.href}
              >
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a
                download={center.releaseNotes.download.fileName}
                href={center.releaseNotes.download.href}
              >
                <FileText className="h-4 w-4" />
                Notes
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Checks" value={center.totals.checks} />
          <Metric label="Blocked" value={center.totals.blockedChecks} />
          <Metric label="Review" value={center.totals.reviewChecks} />
          <Metric label="Channels" value={center.totals.releaseChannels} />
          <Metric label="Targets" value={center.totals.installerTargets} />
          <Metric label="QA evidence" value={center.totals.qaEvidence} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {center.gates.map((gate) => (
            <GateCard key={gate.id} gate={gate} />
          ))}
        </div>

        <section className="rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Production release notes
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {center.releaseNotes.title}
              </p>
            </div>
            <Badge variant="outline">
              {center.totals.releaseNoteSections} sections
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {center.releaseNotes.sections.map((section) => (
              <div
                key={section.title}
                className="rounded-md border border-border bg-background p-3"
              >
                <p className="text-xs font-semibold">{section.title}</p>
                <div className="mt-2 grid gap-1">
                  {section.items.slice(0, 2).map((item) => (
                    <p
                      key={item}
                      className="line-clamp-2 text-xs text-muted-foreground"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Desktop release actions
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

function GateCard({ gate }: { gate: DesktopPackagingGate }) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <StatusIcon status={gate.status} />
            <span className="truncate">{gate.title}</span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {gate.description}
          </p>
        </div>
        <Badge variant={statusVariants[gate.status]}>{gate.score}/100</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">
          {gate.metricValue} {gate.metricLabel}
        </Badge>
        <Badge variant={statusVariants[gate.status]}>
          {statusLabels[gate.status]}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {gate.checks.slice(0, 4).map((check) => (
          <CheckRow key={`${gate.id}-${check.id}`} check={check} />
        ))}
      </div>
    </section>
  );
}

function CheckRow({ check }: { check: DesktopPackagingCheck }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <StatusIcon status={check.status} />
            <span className="truncate">{check.title}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {check.detail}
          </p>
        </div>
        <Badge variant={statusVariants[check.status]} className="shrink-0">
          {check.badge}
        </Badge>
      </div>
      {check.meta.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {check.meta.slice(0, 3).map((meta) => (
            <Badge key={meta} variant="outline">
              {meta}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Rocket className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: DesktopPackagingStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}
