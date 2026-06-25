"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileJson2,
  MailWarning,
  ShieldAlert,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAdminNotificationDigestSubscriptions } from "@/features/admin/actions";
import type {
  AdminNotificationDigestChannel,
  AdminNotificationDigestFrequency,
  AdminNotificationDigestSeverity,
  AdminNotificationDigestStatus,
  AdminNotificationDigestSubscriptionSettings,
  AdminNotificationDigestSubscriptionsReport,
  AdminNotificationDigestTopic,
} from "@/features/admin/admin-notification-digest-subscriptions";
import {
  adminNotificationDigestChannels,
  adminNotificationDigestFrequencies,
  adminNotificationDigestSeverities,
  adminNotificationDigestTopics,
} from "@/features/admin/admin-notification-digest-subscriptions";
import {
  getAdminNotificationDigestSubscriptionsCsv,
  getAdminNotificationDigestSubscriptionsJson,
  getAdminNotificationDigestSubscriptionsMarkdown,
} from "@/features/admin/admin-notification-digest-subscriptions-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminNotificationDigestSubscriptionsPanelProps = {
  report: AdminNotificationDigestSubscriptionsReport;
};

const topicLabels: Record<AdminNotificationDigestTopic, string> = {
  "failed-auth": "Failed auth",
  "email-delivery": "Email delivery",
  "deploy-smoke": "Deploy smoke",
  rollback: "Rollback",
  "risky-shares": "Risky shares",
};

export function AdminNotificationDigestSubscriptionsPanel({
  report,
}: AdminNotificationDigestSubscriptionsPanelProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(report.settings);
  const [recipientsText, setRecipientsText] = useState(
    report.settings.recipients.join(", "),
  );
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
  const savedAtLabel = useMemo(
    () =>
      report.settings.updatedAt
        ? new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(report.settings.updatedAt))
        : "Not saved yet",
    [report.settings.updatedAt],
  );

  function updateSetting<Key extends keyof AdminNotificationDigestSubscriptionSettings>(
    key: Key,
    value: AdminNotificationDigestSubscriptionSettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateTopic(topic: AdminNotificationDigestTopic, value: boolean) {
    setSettings((current) => ({
      ...current,
      topics: {
        ...current.topics,
        [topic]: value,
      },
    }));
  }

  function saveSubscriptions() {
    const { invalid, recipients } = parseRecipientsText(recipientsText);
    setMessage(null);
    setError(null);

    if (invalid.length > 0) {
      setError(`Invalid recipient emails: ${invalid.join(", ")}`);
      return;
    }

    startTransition(async () => {
      try {
        await updateAdminNotificationDigestSubscriptions({
          recipients,
          frequency: settings.frequency,
          channel: settings.channel,
          minimumSeverity: settings.minimumSeverity,
          includeResolved: settings.includeResolved,
          topics: settings.topics,
        });
        setMessage("Admin notification digest subscriptions saved.");
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Digest subscriptions could not be saved.",
        );
      }
    });
  }

  function exportJson() {
    downloadTextFile({
      content: getAdminNotificationDigestSubscriptionsJson(report),
      filename: "admin-notification-digest-subscriptions.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminNotificationDigestSubscriptionsCsv(report),
      filename: "admin-notification-digest-subscriptions.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminNotificationDigestSubscriptionsMarkdown(report),
      filename: "admin-notification-digest-subscriptions.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminNotificationDigestSubscriptionsMarkdown(report),
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
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

        <Card>
          <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="size-4" />
                Admin notification digest subscriptions
              </CardTitle>
              <CardDescription>
                Operational routing for failed auth, email delivery, deploy
                smoke, rollback, and risky public-share changes.
              </CardDescription>
            </div>
            <Badge variant={getStatusVariant(report.status)}>
              {report.status} {report.score}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
              <Metric label="Recipients" value={report.recipientCount} />
              <Metric label="Topics" value={report.subscribedTopicCount} />
              <Metric label="Active" value={report.activeSignalCount} />
              <Metric label="Blocked" value={report.blockedSignalCount} />
              <Metric
                label="Unrouted"
                value={report.unroutedActiveSignalCount}
              />
              <Metric label="Saved" value={savedAtLabel} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Recipients"
                detail="Separate administrator emails with commas, spaces, or semicolons."
              >
                <Input
                  value={recipientsText}
                  onChange={(event) => setRecipientsText(event.target.value)}
                  placeholder="admin@mail.com, ops@mail.com"
                  aria-label="Digest recipient emails"
                />
              </Field>

              <Field label="Frequency" detail="Delivery cadence for the digest.">
                <Select
                  value={settings.frequency}
                  onValueChange={(value) =>
                    updateSetting(
                      "frequency",
                      value as AdminNotificationDigestFrequency,
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adminNotificationDigestFrequencies.map((frequency) => (
                      <SelectItem key={frequency} value={frequency}>
                        {formatOption(frequency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Channel" detail="Where administrators receive it.">
                <Select
                  value={settings.channel}
                  onValueChange={(value) =>
                    updateSetting(
                      "channel",
                      value as AdminNotificationDigestChannel,
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adminNotificationDigestChannels.map((channel) => (
                      <SelectItem key={channel} value={channel}>
                        {formatOption(channel)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Minimum severity"
                detail="Review sends all signals; blocked only sends severe signals."
              >
                <Select
                  value={settings.minimumSeverity}
                  onValueChange={(value) =>
                    updateSetting(
                      "minimumSeverity",
                      value as AdminNotificationDigestSeverity,
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adminNotificationDigestSeverities.map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {formatOption(severity)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Resolved signals"
                detail="Include resolved/quiet signals for audit-oriented digests."
              >
                <Select
                  value={settings.includeResolved ? "true" : "false"}
                  onValueChange={(value) =>
                    updateSetting("includeResolved", value === "true")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Open signals only</SelectItem>
                    <SelectItem value="true">Include resolved</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label>Subscribed topics</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Toggle each operational signal routed to the digest.
                    </p>
                  </div>
                  <Badge variant="outline">
                    {
                      adminNotificationDigestTopics.filter(
                        (topic) => settings.topics[topic],
                      ).length
                    }{" "}
                    on
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {adminNotificationDigestTopics.map((topic) => (
                    <Button
                      key={topic}
                      type="button"
                      size="sm"
                      variant={settings.topics[topic] ? "secondary" : "outline"}
                      aria-pressed={settings.topics[topic]}
                      onClick={() => updateTopic(topic, !settings.topics[topic])}
                      className="justify-start"
                    >
                      {settings.topics[topic] ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : (
                        <MailWarning className="size-3.5" />
                      )}
                      {topicLabels[topic]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={saveSubscriptions}
                disabled={isPending}
              >
                {isPending ? "Saving..." : "Save subscriptions"}
              </Button>
              <Badge variant="outline">
                {report.settings.updatedBy ?? "Defaults"} / {savedAtLabel}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Digest routing review</CardTitle>
          <CardDescription>
            Active signals should have recipients, severity coverage, and an
            enabled topic.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
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
                    <Badge variant={row.subscribed ? "secondary" : "outline"}>
                      {row.subscribed ? "subscribed" : "off"}
                    </Badge>
                    {row.activeSignal ? (
                      <Badge variant="secondary">active</Badge>
                    ) : null}
                  </div>
                </div>
                <Badge variant="outline">{row.value}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{row.detail}</p>
              <p className="mt-2 text-xs">{row.recommendation}</p>
              {row.target ? (
                <div className="mt-2 truncate font-mono text-[10px] text-muted-foreground">
                  {row.target}
                </div>
              ) : null}
            </div>
          ))}

          <div className="grid grid-cols-4 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={exportJson}
            >
              <FileJson2 className="size-3.5" />
              JSON
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={exportCsv}
            >
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
        </CardContent>
      </Card>
    </div>
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

function getStatusVariant(status: AdminNotificationDigestStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function parseRecipientsText(value: string) {
  const tokens = value
    .split(/[\s,;]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const recipients = Array.from(new Set(tokens.filter(isEmail))).slice(0, 20);
  const invalid = tokens.filter((entry) => !isEmail(entry));

  return { invalid, recipients };
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatOption(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
