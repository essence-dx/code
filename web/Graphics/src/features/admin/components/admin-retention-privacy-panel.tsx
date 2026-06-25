"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileJson2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAdminRetentionPrivacy } from "@/features/admin/actions";
import type {
  RetentionPrivacyMode,
  RetentionPrivacyReport,
  RetentionPrivacySettings,
  RetentionPrivacyStatus,
} from "@/features/admin/admin-retention-privacy";
import { retentionPrivacyModes } from "@/features/admin/admin-retention-privacy";
import {
  getRetentionPrivacyCsv,
  getRetentionPrivacyJson,
  getRetentionPrivacyMarkdown,
} from "@/features/admin/admin-retention-privacy-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminRetentionPrivacyPanelProps = {
  report: RetentionPrivacyReport;
};

export function AdminRetentionPrivacyPanel({
  report,
}: AdminRetentionPrivacyPanelProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(report.settings);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const rows = useMemo(
    () =>
      report.rows
        .filter((row) => row.status !== "ready")
        .concat(report.rows.filter((row) => row.status === "ready")),
    [report.rows],
  );
  const savedAtLabel = report.settings.updatedAt
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(report.settings.updatedAt))
    : "Not saved yet";

  function updateSetting<Key extends keyof RetentionPrivacySettings>(
    key: Key,
    value: RetentionPrivacySettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function savePolicy() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await updateAdminRetentionPrivacy({
          auditLogRetentionDays: settings.auditLogRetentionDays,
          collaborationPresenceRetentionDays:
            settings.collaborationPresenceRetentionDays,
          notificationDeliveryRetentionDays:
            settings.notificationDeliveryRetentionDays,
          supportBundleRetentionDays: settings.supportBundleRetentionDays,
          supportBundlePrivacyMode: settings.supportBundlePrivacyMode,
          includeSupportBundleNetworkDetails:
            settings.includeSupportBundleNetworkDetails,
          includeSupportBundleNotificationReasons:
            settings.includeSupportBundleNotificationReasons,
          includeSupportBundleAuditMetadata:
            settings.includeSupportBundleAuditMetadata,
        });
        setMessage("Retention and privacy controls saved.");
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Retention and privacy controls could not be saved.",
        );
      }
    });
  }

  function exportJson() {
    downloadTextFile({
      content: getRetentionPrivacyJson(report),
      filename: "retention-privacy-controls.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getRetentionPrivacyCsv(report),
      filename: "retention-privacy-controls.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getRetentionPrivacyMarkdown(report),
      filename: "retention-privacy-controls.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(getRetentionPrivacyMarkdown(report));
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Retention and privacy controls
          </CardTitle>
          <CardDescription>
            Audit logs, collaboration presence, notification delivery records,
            and support bundle redaction policy.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        {message ? (
          <Alert>
            <CheckCircle2 className="size-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <ShieldAlert className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Audit" value={report.auditEventsEligibleForCleanup} />
          <Metric
            label="Presence"
            value={report.collaborationRecordsEligibleForCleanup}
          />
          <Metric
            label="Email rows"
            value={report.notificationDeliveriesEligibleForCleanup}
          />
          <Metric
            label="Sensitive sessions"
            value={report.supportBundleSensitiveSessionCount}
          />
          <Metric
            label="Sensitive audit"
            value={report.supportBundleSensitiveAuditMetadataCount}
          />
          <Metric label="Saved" value={savedAtLabel} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Audit logs" detail="Loaded audit events older than this window are marked for cleanup review.">
            <NumberInput
              value={settings.auditLogRetentionDays}
              min={7}
              max={730}
              step={1}
              onChange={(value) =>
                updateSetting("auditLogRetentionDays", value)
              }
              aria-label="Audit log retention days"
            />
          </Field>

          <Field label="Collaboration presence" detail="Durable room chat and presence records older than this window are marked for cleanup.">
            <NumberInput
              value={settings.collaborationPresenceRetentionDays}
              min={1}
              max={365}
              step={1}
              onChange={(value) =>
                updateSetting("collaborationPresenceRetentionDays", value)
              }
              aria-label="Collaboration presence retention days"
            />
          </Field>

          <Field label="Notification delivery" detail="Comment email delivery evidence older than this window is marked for cleanup.">
            <NumberInput
              value={settings.notificationDeliveryRetentionDays}
              min={7}
              max={365}
              step={1}
              onChange={(value) =>
                updateSetting("notificationDeliveryRetentionDays", value)
              }
              aria-label="Notification delivery retention days"
            />
          </Field>

          <Field label="Support bundle lifetime" detail="Maximum intended lifetime for generated support bundle artifacts.">
            <NumberInput
              value={settings.supportBundleRetentionDays}
              min={1}
              max={90}
              step={1}
              onChange={(value) =>
                updateSetting("supportBundleRetentionDays", value)
              }
              aria-label="Support bundle retention days"
            />
          </Field>

          <Field label="Bundle privacy mode" detail="Diagnostic keeps direct evidence; redacted masks identities; minimal strips extra context.">
            <Select
              value={settings.supportBundlePrivacyMode}
              onValueChange={(value) =>
                updateSetting(
                  "supportBundlePrivacyMode",
                  value as RetentionPrivacyMode,
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {retentionPrivacyModes.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {formatOption(mode)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Support bundle fields" detail="Control sensitive details included in generated support exports.">
            <div className="grid gap-2 sm:grid-cols-3">
              <BooleanButton
                active={settings.includeSupportBundleNetworkDetails}
                label="Network"
                onClick={() =>
                  updateSetting(
                    "includeSupportBundleNetworkDetails",
                    !settings.includeSupportBundleNetworkDetails,
                  )
                }
              />
              <BooleanButton
                active={settings.includeSupportBundleNotificationReasons}
                label="Reasons"
                onClick={() =>
                  updateSetting(
                    "includeSupportBundleNotificationReasons",
                    !settings.includeSupportBundleNotificationReasons,
                  )
                }
              />
              <BooleanButton
                active={settings.includeSupportBundleAuditMetadata}
                label="Metadata"
                onClick={() =>
                  updateSetting(
                    "includeSupportBundleAuditMetadata",
                    !settings.includeSupportBundleAuditMetadata,
                  )
                }
              />
            </div>
          </Field>
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{row.label}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{row.kind}</Badge>
                    <Badge variant={getStatusVariant(row.status)}>
                      {row.status}
                    </Badge>
                    <Badge variant="outline">
                      {row.eligibleForCleanupCount} cleanup
                    </Badge>
                  </div>
                </div>
                <Badge variant="outline">{row.value}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{row.detail}</p>
              <p className="mt-2 text-xs">{row.recommendation}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <Badge variant="outline">
            {report.settings.updatedBy ?? "Defaults"} / {savedAtLabel}
          </Badge>
          <div className="grid grid-cols-5 gap-2">
            <Button type="button" onClick={savePolicy} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={exportJson}>
              <FileJson2 className="size-3.5" />
              JSON
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
              <Download className="size-3.5" />
              CSV
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={exportMarkdown}
            >
              <Download className="size-3.5" />
              MD
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyMarkdown}
            >
              <ClipboardCopy className="size-3.5" />
              Copy
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  children,
  detail,
  label,
}: {
  children: ReactNode;
  detail: string;
  label: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <Label>{label}</Label>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function BooleanButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "outline"}
      aria-pressed={active}
      onClick={onClick}
      className="justify-start"
    >
      {active ? <CheckCircle2 className="size-3.5" /> : null}
      {label}
    </Button>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono text-sm text-foreground">
        {value}
      </div>
    </div>
  );
}

function getStatusVariant(status: RetentionPrivacyStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatOption(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
