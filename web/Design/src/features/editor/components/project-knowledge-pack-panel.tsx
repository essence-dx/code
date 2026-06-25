"use client";

import { BookOpenCheck, Download, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatStatus,
  getStatusVariant,
  KnowledgeTextField,
  PanelSectionHeader,
} from "@/features/editor/components/project-knowledge-pack-controls";
import {
  EditableAudienceProfiles,
  EditableConstraints,
  EditableDecisionLogs,
  EditableReferences,
} from "@/features/editor/components/project-knowledge-pack-section-editors";
import {
  createProjectKnowledgePack,
  createProjectKnowledgePackChecks,
  createProjectKnowledgePackSummary,
  normalizeProjectKnowledgePack,
  projectKnowledgePackTemplates,
  type ProjectKnowledgePackTemplateId,
} from "@/features/editor/project-knowledge-pack";
import { createProjectKnowledgePackMarkdown } from "@/features/editor/project-knowledge-pack-markdown";
import {
  addAudienceProfile,
  addConstraint,
  addDecisionLog,
  addReference,
  removeAudienceProfile,
  removeConstraint,
  removeDecisionLog,
  removeReference,
  updateAudienceProfile,
  updateConstraint,
  updateDecisionLog,
  updateReference,
} from "@/features/editor/project-knowledge-pack-mutators";
import type {
  DesignDocument,
  DesignDocumentMetadata,
  ProjectKnowledgeBrief,
  ProjectKnowledgePack,
} from "@/features/editor/types";

type ProjectKnowledgePackPanelProps = {
  projectName: string;
  document: DesignDocument;
  onUpdateMetadata: (updates: Partial<DesignDocumentMetadata>) => void;
};

export function ProjectKnowledgePackPanel({
  projectName,
  document,
  onUpdateMetadata,
}: ProjectKnowledgePackPanelProps) {
  const [templateId, setTemplateId] =
    useState<ProjectKnowledgePackTemplateId>("campaign-launch");
  const hasSavedPack = Boolean(document.metadata?.projectKnowledgePack);
  const pack = useMemo(
    () =>
      normalizeProjectKnowledgePack(
        document.metadata?.projectKnowledgePack ??
          createProjectKnowledgePack({ templateId, projectName }),
      ),
    [document.metadata?.projectKnowledgePack, projectName, templateId],
  );
  const summary = useMemo(() => createProjectKnowledgePackSummary(pack), [pack]);
  const checks = useMemo(() => createProjectKnowledgePackChecks(pack), [pack]);

  function savePack(nextPack: ProjectKnowledgePack) {
    const now = new Date().toISOString();

    onUpdateMetadata({
      projectKnowledgePack: normalizeProjectKnowledgePack(nextPack, { now }),
    });
  }

  function applyTemplate() {
    onUpdateMetadata({
      projectKnowledgePack: createProjectKnowledgePack({
        templateId,
        projectName,
      }),
    });
  }

  function updateBrief(field: keyof ProjectKnowledgeBrief, value: string) {
    savePack({
      ...pack,
      brief: {
        ...pack.brief,
        [field]: value,
      },
    });
  }

  function downloadMarkdown() {
    const markdown = createProjectKnowledgePackMarkdown(pack, projectName);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");

    link.href = url;
    link.download = `${slugify(projectName)}-knowledge-pack.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <details className="group rounded-md border border-border bg-muted/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex min-w-0 items-center gap-2">
          <BookOpenCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">Knowledge pack</span>
        </span>
        <Badge variant={getStatusVariant(summary.status)}>
          {summary.score}%
        </Badge>
      </summary>

      <div className="space-y-3 border-t border-border p-3">
        <p className="text-xs text-muted-foreground">
          Briefs, audience context, constraints, references, and decisions saved
          with this design.
        </p>

        <div className="grid gap-2">
          <Select
            value={templateId}
            onValueChange={(value) =>
              setTemplateId(value as ProjectKnowledgePackTemplateId)
            }
          >
            <SelectTrigger
              className="w-full"
              aria-label="Knowledge pack template"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projectKnowledgePackTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={hasSavedPack ? "outline" : "default"}
              className="h-8 min-w-0 justify-start px-2 text-xs"
              onClick={applyTemplate}
            >
              <RefreshCcw className="h-4 w-4" />
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 min-w-0 justify-start px-2 text-xs"
              onClick={downloadMarkdown}
            >
              <Download className="h-4 w-4" />
              Markdown
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {checks.map((check) => (
            <div
              key={check.id}
              className="min-w-0 rounded-md border border-border bg-background p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium">{check.label}</p>
                <Badge variant={getStatusVariant(check.status)}>
                  {formatStatus(check.status)}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {check.detail}
              </p>
            </div>
          ))}
        </div>

        <BriefFields pack={pack} onChange={updateBrief} />
        <EditableAudienceProfiles
          profiles={pack.audienceProfiles}
          onAdd={() => savePack(addAudienceProfile(pack))}
          onUpdate={(id, updates) =>
            savePack(updateAudienceProfile(pack, id, updates))
          }
          onRemove={(id) => savePack(removeAudienceProfile(pack, id))}
        />
        <EditableConstraints
          constraints={pack.constraints}
          onAdd={() => savePack(addConstraint(pack))}
          onUpdate={(id, updates) =>
            savePack(updateConstraint(pack, id, updates))
          }
          onRemove={(id) => savePack(removeConstraint(pack, id))}
        />
        <EditableReferences
          references={pack.references}
          onAdd={() => savePack(addReference(pack))}
          onUpdate={(id, updates) =>
            savePack(updateReference(pack, id, updates))
          }
          onRemove={(id) => savePack(removeReference(pack, id))}
        />
        <EditableDecisionLogs
          logs={pack.decisionLogs}
          onAdd={() => savePack(addDecisionLog(pack))}
          onUpdate={(id, updates) =>
            savePack(updateDecisionLog(pack, id, updates))
          }
          onRemove={(id) => savePack(removeDecisionLog(pack, id))}
        />
      </div>
    </details>
  );
}

function BriefFields({
  pack,
  onChange,
}: {
  pack: ProjectKnowledgePack;
  onChange: (field: keyof ProjectKnowledgeBrief, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <PanelSectionHeader title="Brief" />
      <KnowledgeTextField
        label="Title"
        value={pack.brief.title}
        onChange={(value) => onChange("title", value)}
      />
      <KnowledgeTextField
        label="Goal"
        value={pack.brief.goal}
        as="textarea"
        onChange={(value) => onChange("goal", value)}
      />
      <KnowledgeTextField
        label="Audience promise"
        value={pack.brief.audiencePromise}
        as="textarea"
        onChange={(value) => onChange("audiencePromise", value)}
      />
      <KnowledgeTextField
        label="Success metric"
        value={pack.brief.successMetric}
        onChange={(value) => onChange("successMetric", value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <KnowledgeTextField
          label="Owner"
          value={pack.brief.owner}
          onChange={(value) => onChange("owner", value)}
        />
        <KnowledgeTextField
          label="Due date"
          type="date"
          value={pack.brief.dueDate}
          onChange={(value) => onChange("dueDate", value)}
        />
      </div>
    </div>
  );
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "project"
  );
}
