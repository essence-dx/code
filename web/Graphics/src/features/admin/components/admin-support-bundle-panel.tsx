"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ClipboardCopy,
  Download,
  FileArchive,
  FileJson2,
  LifeBuoy,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminSupportBundleScopes,
  createAdminSupportBundleFromDashboard,
  type AdminSupportBundleScope,
} from "@/features/admin/admin-support-bundle";
import {
  getAdminSupportBundleCsv,
  getAdminSupportBundleJson,
  getAdminSupportBundleMarkdown,
} from "@/features/admin/admin-support-bundle-export";
import type { AdminDashboardData } from "@/features/admin/admin-data";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminSupportBundlePanelProps = {
  data: AdminDashboardData;
};

const scopeLabels: Record<AdminSupportBundleScope, string> = {
  workspace: "Workspace",
  user: "Selected user",
  file: "Selected file",
  share: "Selected share",
};

export function AdminSupportBundlePanel({
  data,
}: AdminSupportBundlePanelProps) {
  const [scope, setScope] =
    useState<AdminSupportBundleScope>("workspace");
  const [selectedUserId, setSelectedUserId] = useState(
    data.users[0]?.id ?? "none",
  );
  const [selectedFileId, setSelectedFileId] = useState(
    data.files[0]?.id ?? "none",
  );
  const [selectedShareId, setSelectedShareId] = useState(
    data.shares[0]?.id ?? "none",
  );
  const bundle = useMemo(
    () =>
      createAdminSupportBundleFromDashboard({
        data,
        scope,
        selectedFileId: selectedFileId === "none" ? undefined : selectedFileId,
        selectedShareId:
          selectedShareId === "none" ? undefined : selectedShareId,
        selectedUserId: selectedUserId === "none" ? undefined : selectedUserId,
      }),
    [data, scope, selectedFileId, selectedShareId, selectedUserId],
  );
  const sortedFindings = bundle.findings
    .filter((finding) => finding.status !== "ready")
    .concat(bundle.findings.filter((finding) => finding.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getAdminSupportBundleJson(bundle),
      filename: getBundleFilename(bundle.target.label, "json"),
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminSupportBundleCsv(bundle),
      filename: getBundleFilename(bundle.target.label, "csv"),
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminSupportBundleMarkdown(bundle),
      filename: getBundleFilename(bundle.target.label, "md"),
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(getAdminSupportBundleMarkdown(bundle));
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <LifeBuoy className="size-4" />
            Support bundle
          </CardTitle>
          <CardDescription>
            Export selected workspace evidence for account, file, share, auth,
            notification, audit, and rollback reviews.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(bundle.status)}>
          {bundle.score}/100 {bundle.status}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <ControlCard label="Scope">
            <Select
              value={scope}
              onValueChange={(value) =>
                setScope(value as AdminSupportBundleScope)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adminSupportBundleScopes.map((option) => (
                  <SelectItem key={option} value={option}>
                    {scopeLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlCard>

          <ControlCard label="User">
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={scope !== "user" || data.users.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.users.length === 0 ? (
                  <SelectItem value="none">No users</SelectItem>
                ) : (
                  data.users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </ControlCard>

          <ControlCard label="File">
            <Select
              value={selectedFileId}
              onValueChange={setSelectedFileId}
              disabled={scope !== "file" || data.files.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.files.length === 0 ? (
                  <SelectItem value="none">No files</SelectItem>
                ) : (
                  data.files.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </ControlCard>

          <ControlCard label="Share">
            <Select
              value={selectedShareId}
              onValueChange={setSelectedShareId}
              disabled={scope !== "share" || data.shares.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.shares.length === 0 ? (
                  <SelectItem value="none">No shares</SelectItem>
                ) : (
                  data.shares.map((share) => (
                    <SelectItem key={share.id} value={share.id}>
                      {share.fileName} / {share.permissionPreset}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </ControlCard>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <Metric label="Users" value={bundle.summary.users} />
          <Metric label="Files" value={bundle.summary.files} />
          <Metric label="Shares" value={bundle.summary.shares} />
          <Metric label="Sessions" value={bundle.summary.sessions} />
          <Metric label="Audits" value={bundle.summary.auditEvents} />
          <Metric
            label="Notifications"
            value={bundle.summary.notificationDeliveries}
          />
          <Metric label="Failed email" value={bundle.summary.failedNotifications} />
          <Metric label="Rollback" value={bundle.summary.rollbackRows} />
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Privacy {bundle.privacy.mode}</Badge>
            <Badge variant={bundle.privacy.emailsRedacted ? "secondary" : "outline"}>
              {bundle.privacy.emailsRedacted ? "emails masked" : "emails visible"}
            </Badge>
            <Badge variant={bundle.privacy.networkDetailsIncluded ? "outline" : "secondary"}>
              {bundle.privacy.networkDetailsIncluded
                ? "network included"
                : "network redacted"}
            </Badge>
            <Badge variant="outline">{bundle.privacy.retentionDays} day lifetime</Badge>
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {sortedFindings.map((finding) => (
            <div
              key={finding.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{finding.label}</div>
                <Badge variant={getStatusVariant(finding.status)}>
                  {finding.status}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {finding.value}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {finding.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">
              {bundle.target.label}
            </div>
            <div className="mt-1">
              Includes matching user records, design files, public share links,
              sessions, audit events, notification deliveries, and rollback
              readiness evidence.
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
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
              <FileArchive className="size-3.5" />
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

function ControlCard({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2 text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: "ready" | "review" | "blocked") {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "ready" ? "secondary" : "outline";
}

function getBundleFilename(label: string, extension: string) {
  const slug =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace";

  return `essence-support-${slug}.${extension}`;
}
