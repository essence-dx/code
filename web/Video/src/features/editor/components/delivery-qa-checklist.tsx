"use client";

import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createExportQaSummary, type ExportQaSection } from "@/lib/editor/export-qa-summary";
import { createDeliveryQaReport, type DeliveryQaIssue } from "@/lib/editor/delivery-qa";
import type { EditorProject, MediaAsset } from "@/lib/editor/types";
import type { RenderPlan } from "@/lib/render/export-planner";
import type { RenderHandoffReport } from "@/lib/render/render-handoff";

export function DeliveryQaChecklist({
  project,
  mediaAssets,
  plan,
  handoff,
}: {
  project: EditorProject;
  mediaAssets: MediaAsset[];
  plan: RenderPlan;
  handoff: RenderHandoffReport;
}) {
  const report = createDeliveryQaReport(project, mediaAssets);
  const exportSummary = createExportQaSummary({ project, mediaAssets, plan, handoff });
  const isReady = report.status === "ready" && exportSummary.status === "ready";
  const issueCount = exportSummary.blockedCount + exportSummary.reviewCount + report.issues.length;
  const buttonLabel = isReady ? "Export QA ready" : `${issueCount} export QA ${issueCount === 1 ? "item" : "items"}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={isReady ? "outline" : "secondary"} aria-label="Open export QA summary">
          {isReady ? <ShieldCheck className="size-4" /> : <AlertTriangle className="size-4" />}
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pre-export QA</DialogTitle>
          <DialogDescription>Review format, safe zones, captions, audio, media, and render route before exporting.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          {exportSummary.sections.map((section) => (
            <ExportQaSectionRow key={section.id} section={section} />
          ))}
        </div>
        {report.issues.length === 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>No hidden or muted delivery risks, unresolved review items, or visible timeline gaps found.</span>
          </div>
        ) : (
          <div className="space-y-2" aria-label="Delivery checklist details">
            {report.issues.map((issue) => (
              <QaIssueRow key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ExportQaSectionRow({ section }: { section: ExportQaSection }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{section.label}</div>
        <Badge variant={section.status === "blocked" ? "destructive" : section.status === "review" ? "secondary" : "outline"}>
          {section.status === "blocked" ? "Blocked" : section.status === "review" ? "Review" : "Ready"}
        </Badge>
      </div>
      <div className="mt-2 text-xs font-medium">{section.summary}</div>
      <p className="mt-1 text-xs text-muted-foreground">{section.detail}</p>
    </div>
  );
}

function QaIssueRow({ issue }: { issue: DeliveryQaIssue }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{issue.label}</div>
        <Badge variant={issue.severity === "blocker" ? "destructive" : "secondary"}>
          {issue.count} {issue.severity === "blocker" ? "blocker" : "warning"}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{issue.detail}</p>
    </div>
  );
}
