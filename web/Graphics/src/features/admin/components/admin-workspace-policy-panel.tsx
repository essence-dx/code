"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  FileJson,
  FileText,
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
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAdminWorkspacePolicy } from "@/features/admin/actions";
import {
  createWorkspacePolicyCsv,
  createWorkspacePolicyJson,
  createWorkspacePolicyMarkdown,
} from "@/features/admin/workspace-policy-export";
import type {
  WorkspacePolicyInviteMode,
  WorkspacePolicyReviewReport,
  WorkspacePolicySessionMode,
  WorkspacePolicySettings,
} from "@/features/admin/workspace-policy";
import type { CollaboratorRole } from "@/features/files/permissions";

type AdminWorkspacePolicyPanelProps = {
  report: WorkspacePolicyReviewReport;
};

const booleanOptions = [
  { value: "true", label: "Allow" },
  { value: "false", label: "Block" },
] as const;

const inviteModeOptions: Array<{
  value: WorkspacePolicyInviteMode;
  label: string;
}> = [
  { value: "any-existing-user", label: "Any registered user" },
  { value: "same-domain-only", label: "Same email domain" },
  { value: "admins-only", label: "Administrators only" },
];

const roleOptions: Array<{ value: CollaboratorRole; label: string }> = [
  { value: "viewer", label: "Can view" },
  { value: "commenter", label: "Can comment" },
  { value: "editor", label: "Can edit" },
];

const sessionModeOptions: Array<{
  value: WorkspacePolicySessionMode;
  label: string;
}> = [
  { value: "monitor", label: "Monitor only" },
  { value: "review-stale", label: "Review stale sessions" },
  { value: "revoke-expired", label: "Revoke expired sessions" },
];

export function AdminWorkspacePolicyPanel({
  report,
}: AdminWorkspacePolicyPanelProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(report.settings);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
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

  function updateSetting<Key extends keyof WorkspacePolicySettings>(
    key: Key,
    value: WorkspacePolicySettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function savePolicy() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await updateAdminWorkspacePolicy({
          defaultShareExpiryDays: settings.defaultShareExpiryDays,
          allowPublicDownloads: settings.allowPublicDownloads,
          allowPublicComments: settings.allowPublicComments,
          inviteMode: settings.inviteMode,
          maxInviteRole: settings.maxInviteRole,
          sessionMode: settings.sessionMode,
          staleSessionDays: settings.staleSessionDays,
        });
        setMessage("Workspace policy saved and applied to new shares and invites.");
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Workspace policy could not be saved.",
        );
      }
    });
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
              <CardTitle>Workspace policy controls</CardTitle>
              <CardDescription>
                Defaults for public links, collaborator invites, and session review.
              </CardDescription>
            </div>
            <Badge variant={getStatusVariant(report.status)}>
              {report.score}/100 {report.status}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <PolicyField
              label="Default share expiry"
              detail="Use 0 when links should stay live until manually revoked."
            >
              <NumberInput
                value={settings.defaultShareExpiryDays}
                min={0}
                max={365}
                step={1}
                onChange={(value) =>
                  updateSetting("defaultShareExpiryDays", value)
                }
                aria-label="Default share expiry in days"
              />
            </PolicyField>

            <PolicyField
              label="Public downloads"
              detail="Controls whether new handoff links can expose downloadable assets."
            >
              <BooleanSelect
                value={settings.allowPublicDownloads}
                onValueChange={(value) =>
                  updateSetting("allowPublicDownloads", value)
                }
              />
            </PolicyField>

            <PolicyField
              label="Public comments"
              detail="Controls whether new review links can collect comments."
            >
              <BooleanSelect
                value={settings.allowPublicComments}
                onValueChange={(value) =>
                  updateSetting("allowPublicComments", value)
                }
              />
            </PolicyField>

            <PolicyField
              label="Invite restriction"
              detail="Limits who file owners can invite to private files."
            >
              <Select
                value={settings.inviteMode}
                onValueChange={(value) =>
                  updateSetting(
                    "inviteMode",
                    value as WorkspacePolicyInviteMode,
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inviteModeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PolicyField>

            <PolicyField
              label="Maximum invite role"
              detail="Prevents file owners from granting stronger roles than approved."
            >
              <Select
                value={settings.maxInviteRole}
                onValueChange={(value) =>
                  updateSetting("maxInviteRole", value as CollaboratorRole)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PolicyField>

            <PolicyField
              label="Session hygiene"
              detail="Sets the expected admin posture for stale and expired sessions."
            >
              <Select
                value={settings.sessionMode}
                onValueChange={(value) =>
                  updateSetting(
                    "sessionMode",
                    value as WorkspacePolicySessionMode,
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sessionModeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PolicyField>

            <PolicyField
              label="Stale session age"
              detail="Sessions older than this review window are flagged."
            >
              <NumberInput
                value={settings.staleSessionDays}
                min={1}
                max={365}
                step={1}
                onChange={(value) => updateSetting("staleSessionDays", value)}
                aria-label="Stale session age in days"
              />
            </PolicyField>

            <div className="flex flex-col justify-end gap-2 md:items-end">
              <div className="text-xs text-muted-foreground">
                Last saved by {report.settings.updatedBy ?? "workspace default"} ·{" "}
                {savedAtLabel}
              </div>
              <Button type="button" onClick={savePolicy} disabled={isPending}>
                {isPending ? "Saving..." : "Save policy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policy review</CardTitle>
            <CardDescription>
              Current workspace exposure compared with the saved policy.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {report.findings.map((finding) => (
              <div
                key={finding.id}
                className="rounded-md border border-border bg-muted/30 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{finding.label}</div>
                  <Badge variant={getStatusVariant(finding.status)}>
                    {finding.status}
                  </Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {finding.value}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {finding.detail}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="self-start">
        <CardHeader>
          <CardTitle>Governance export</CardTitle>
          <CardDescription>
            Capture the current policy, findings, and review counts for support.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <MetricRow label="Active shares" value={report.activeShareCount} />
          <MetricRow label="Download links" value={report.downloadShareCount} />
          <MetricRow label="Comment links" value={report.commentShareCount} />
          <MetricRow label="Expired links" value={report.expiredShareCount} />
          <MetricRow label="Stale sessions" value={report.staleSessionCount} />
          <MetricRow label="Expired sessions" value={report.expiredSessionCount} />
          <div className="grid gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                downloadText(
                  "essence-workspace-policy.json",
                  createWorkspacePolicyJson(report),
                  "application/json;charset=utf-8",
                )
              }
            >
              <FileJson className="size-4" />
              Export JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                downloadText(
                  "essence-workspace-policy.csv",
                  createWorkspacePolicyCsv(report),
                  "text/csv;charset=utf-8",
                )
              }
            >
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                downloadText(
                  "essence-workspace-policy.md",
                  createWorkspacePolicyMarkdown(report),
                  "text/markdown;charset=utf-8",
                )
              }
            >
              <FileText className="size-4" />
              Export Markdown
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PolicyField({
  children,
  detail,
  label,
}: {
  children: ReactNode;
  detail: string;
  label: string;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-3">
      <Label>{label}</Label>
      <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
      {children}
    </div>
  );
}

function BooleanSelect({
  onValueChange,
  value,
}: {
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <Select
      value={String(value)}
      onValueChange={(nextValue) => onValueChange(nextValue === "true")}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {booleanOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}

function getStatusVariant(status: WorkspacePolicyReviewReport["status"]) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "ready" ? "secondary" : "outline";
}

function downloadText(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
