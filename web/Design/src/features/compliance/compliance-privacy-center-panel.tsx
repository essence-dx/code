"use client";

import {
  CheckCircle2,
  CircleAlert,
  Download,
  FileLock2,
  ShieldAlert,
  ShieldCheck,
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
  AccountDataPacket,
  CompliancePrivacyCenter,
  CompliancePrivacyStatus,
  ConsentCaptureSignal,
  PublicFormSafetyCheck,
} from "@/features/compliance/compliance-privacy-center";
import { cn } from "@/lib/utils";

type CompliancePrivacyCenterPanelProps = {
  center: CompliancePrivacyCenter;
};

const statusLabels: Record<CompliancePrivacyStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  CompliancePrivacyStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function CompliancePrivacyCenterPanel({
  center,
}: CompliancePrivacyCenterPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileLock2 className="h-5 w-5" />
              Compliance and privacy operations
            </CardTitle>
            <CardDescription>
              Consent capture, public-form safety, account data packets, and
              audit retention readiness.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Forms" value={center.totals.publishedForms} />
          <Metric label="Submissions" value={center.totals.submissions} />
          <Metric label="Consent ready" value={center.totals.consentReadyForms} />
          <Metric label="Sensitive fields" value={center.totals.sensitiveFieldIssues} />
          <Metric label="Packets" value={center.totals.accountPackets} />
          <Metric label="Audit logs" value={center.totals.auditLogs} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="space-y-3">
            <FormSafetyChecks checks={center.formSafetyChecks} />
            <ConsentSignals signals={center.consentSignals} />
          </section>
          <div className="space-y-4">
            <AccountPackets packets={center.accountPackets} />
            <section className="rounded-md border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Audit retention</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {center.auditRetention.detail}
                  </p>
                </div>
                <Badge variant={statusVariants[center.auditRetention.status]}>
                  {center.auditRetention.score}/100
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Metric
                  label="Retention"
                  value={`${center.auditRetention.retentionDays}d`}
                  compact
                />
                <Metric
                  label="Outside"
                  value={center.auditRetention.logsOutsideRetention}
                  compact
                />
                <Metric
                  label="Oldest"
                  value={
                    center.auditRetention.oldestLogAt
                      ? formatDate(center.auditRetention.oldestLogAt)
                      : "None"
                  }
                  compact
                />
              </div>
            </section>
          </div>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CircleAlert className="h-4 w-4 text-muted-foreground" />
              Next privacy actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p key={action} className="text-xs text-muted-foreground">
                  {action}
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FormSafetyChecks({ checks }: { checks: PublicFormSafetyCheck[] }) {
  return (
    <section className="rounded-md border border-border p-4">
      <h3 className="text-sm font-semibold">Public-form safety</h3>
      <div className="mt-3 grid gap-2">
        {checks.map((check) => (
          <div
            key={check.id}
            className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/20 p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ReadinessIcon status={check.status} />
                <p className="text-sm font-medium">{check.label}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {check.detail}
              </p>
            </div>
            <Badge variant={statusVariants[check.status]}>{check.score}/100</Badge>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConsentSignals({ signals }: { signals: ConsentCaptureSignal[] }) {
  return (
    <section className="rounded-md border border-border p-4">
      <h3 className="text-sm font-semibold">Consent capture</h3>
      <div className="mt-3 grid gap-2">
        {signals.length ? (
          signals.slice(0, 6).map((signal) => (
            <div
              key={signal.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {signal.websiteTitle}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {signal.detail}
                  </p>
                </div>
                <Badge variant={statusVariants[signal.status]}>
                  {signal.score}/100
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">{signal.submissionCount} submissions</Badge>
                <Badge variant="outline">{signal.consentFieldCount} consent</Badge>
                <Badge variant="outline">{signal.fields.length} fields</Badge>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            Publish a website with a public form before consent capture appears.
          </p>
        )}
      </div>
    </section>
  );
}

function AccountPackets({ packets }: { packets: AccountDataPacket[] }) {
  return (
    <section className="rounded-md border border-border p-4">
      <h3 className="text-sm font-semibold">Account data packets</h3>
      <div className="mt-3 grid gap-2">
        {packets.map((packet) => (
          <div
            key={packet.id}
            className="rounded-md border border-border bg-muted/20 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{packet.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {packet.detail}
                </p>
              </div>
              <Badge variant={statusVariants[packet.status]}>
                {packet.score}/100
              </Badge>
            </div>
            <div className="mt-3 grid gap-2">
              {packet.checklist.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <a download={packet.fileName} href={packet.dataUrl}>
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
          </div>
        ))}
      </div>
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={cn("mt-1 font-semibold", compact ? "text-sm" : "text-lg")}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function ReadinessIcon({ status }: { status: CompliancePrivacyStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
