"use client";

import {
  ClipboardCopy,
  Download,
  Eye,
  FileJson2,
  LockKeyhole,
  MousePointerClick,
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
  AccessibilityPrivacyReleaseChecklist,
  AccessibilityPrivacyReleaseStatus,
  AccessibilityPrivacyReleaseSurface,
} from "@/features/admin/admin-accessibility-privacy-release";
import {
  getAccessibilityPrivacyReleaseCsv,
  getAccessibilityPrivacyReleaseJson,
  getAccessibilityPrivacyReleaseMarkdown,
} from "@/features/admin/admin-accessibility-privacy-release-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminAccessibilityPrivacyReleasePanelProps = {
  report: AccessibilityPrivacyReleaseChecklist;
};

export function AdminAccessibilityPrivacyReleasePanel({
  report,
}: AdminAccessibilityPrivacyReleasePanelProps) {
  const rows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getAccessibilityPrivacyReleaseJson(report),
      filename: "accessibility-privacy-release-checklist.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAccessibilityPrivacyReleaseCsv(report),
      filename: "accessibility-privacy-release-checklist.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAccessibilityPrivacyReleaseMarkdown(report),
      filename: "accessibility-privacy-release-checklist.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAccessibilityPrivacyReleaseMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Accessibility and privacy release checklist
          </CardTitle>
          <CardDescription>
            Editor, admin, share, and prototype readiness for accessible,
            privacy-safe production handoffs.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Documents" value={report.documentCount} />
          <Metric label="Layers" value={report.checkedLayerCount} />
          <Metric label="Text" value={report.textLayerCount} />
          <Metric label="Interactive" value={report.interactiveLayerCount} />
          <Metric label="A11y high" value={report.highAccessibilityIssueCount} />
          <Metric label="Prototype issues" value={report.prototypeIssueCount} />
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {rows.map((row) => {
            const Icon = getSurfaceIcon(row.surface);

            return (
              <div
                key={row.id}
                className="rounded-md border border-border bg-muted/20 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <Icon className="size-4" />
                      {row.label}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline">{row.surface}</Badge>
                      <Badge variant={getStatusVariant(row.status)}>
                        {row.status}
                      </Badge>
                      <Badge variant="outline">{row.value}</Badge>
                    </div>
                  </div>
                  <Badge variant="outline">{row.evidenceCount} evidence</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {row.detail}
                </p>
                <p className="mt-2 text-xs">{row.recommendation}</p>
              </div>
            );
          })}
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
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function getSurfaceIcon(surface: AccessibilityPrivacyReleaseSurface) {
  if (surface === "admin") {
    return LockKeyhole;
  }

  if (surface === "prototype") {
    return MousePointerClick;
  }

  if (surface === "share") {
    return Eye;
  }

  return ShieldCheck;
}

function getStatusVariant(status: AccessibilityPrivacyReleaseStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
