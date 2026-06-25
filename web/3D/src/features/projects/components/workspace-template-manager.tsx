"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Copy, History, Loader2, Pencil, Plus, RefreshCw, Rocket, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  cloneWorkspaceProjectTemplate,
  createProjectFromWorkspaceTemplate,
  createWorkspaceProjectTemplate,
  deleteWorkspaceProjectTemplate,
  updateWorkspaceProjectTemplate,
} from "@/features/projects/project-api";
import { projectExportPresetLabels, projectReviewPolicyPresetLabels } from "@/features/projects/project-templates";
import type { WorkspaceProjectTemplateSummary } from "@/features/projects/types";

export interface TemplateSourceProject {
  id: string;
  name: string;
  updatedAt: string;
}

interface TemplateDraft {
  description: string;
  folderName: string;
  name: string;
  sourceProjectId: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatMaybeDate(value: string | null) {
  return value ? formatDate(value) : "Never";
}

function formatVersionAction(action: WorkspaceProjectTemplateSummary["versionHistory"][number]["action"]) {
  switch (action) {
    case "cloned":
      return "Cloned";
    case "created":
      return "Created";
    case "refreshed":
      return "Refreshed";
    case "updated":
      return "Updated";
  }
}

function createDraft(template: WorkspaceProjectTemplateSummary): TemplateDraft {
  return {
    description: template.description,
    folderName: template.folderName,
    name: template.name,
    sourceProjectId: template.sourceProjectId ?? "",
  };
}

export function WorkspaceTemplateManager({
  initialTemplates,
  sourceProjects,
  workspaceId,
}: {
  initialTemplates: WorkspaceProjectTemplateSummary[];
  sourceProjects: TemplateSourceProject[];
  workspaceId: string;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [pending, setPending] = useState<string | null>(null);
  const [createDraftState, setCreateDraftState] = useState<TemplateDraft>({
    description: "",
    folderName: "Workspace Templates",
    name: sourceProjects[0] ? `${sourceProjects[0].name} Template` : "Workspace Template",
    sourceProjectId: sourceProjects[0]?.id ?? "",
  });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TemplateDraft | null>(null);
  const totalUses = templates.reduce((sum, template) => sum + template.useCount, 0);
  const usedTemplateCount = templates.filter((template) => template.useCount > 0).length;
  const newestVersion = templates.reduce((version, template) => Math.max(version, template.version), 0);
  const lastUsedTemplate = [...templates]
    .filter((template) => template.lastUsedAt)
    .sort((first, second) => new Date(second.lastUsedAt ?? 0).getTime() - new Date(first.lastUsedAt ?? 0).getTime())[0];

  async function handleCreateTemplate() {
    if (!createDraftState.sourceProjectId) {
      toast.error("Choose a source project first");
      return;
    }

    setPending("create");

    try {
      const response = await createWorkspaceProjectTemplate({
        description: createDraftState.description,
        folderName: createDraftState.folderName,
        name: createDraftState.name,
        sourceProjectId: createDraftState.sourceProjectId,
        workspaceId,
      });
      setTemplates((current) => [response.template, ...current]);
      toast.success(`${response.template.name} saved`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Template could not be saved");
    } finally {
      setPending(null);
    }
  }

  async function handleClone(templateId: string) {
    setPending(`clone:${templateId}`);

    try {
      const response = await cloneWorkspaceProjectTemplate(templateId);
      setTemplates((current) => [response.template, ...current]);
      toast.success(`${response.template.name} cloned`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Template could not be cloned");
    } finally {
      setPending(null);
    }
  }

  async function handleUseTemplate(template: WorkspaceProjectTemplateSummary) {
    setPending(`use:${template.id}`);

    try {
      const response = await createProjectFromWorkspaceTemplate(template.id, { name: template.name });
      toast.success(`${response.project.name} created`);
      router.push(`/?projectId=${response.project.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Project could not be created");
    } finally {
      setPending(null);
    }
  }

  async function handleUpdate(templateId: string) {
    if (!editDraft) {
      return;
    }

    setPending(`update:${templateId}`);

    try {
      const response = await updateWorkspaceProjectTemplate(templateId, {
        description: editDraft.description,
        folderName: editDraft.folderName,
        name: editDraft.name,
        sourceProjectId: editDraft.sourceProjectId || undefined,
      });
      setTemplates((current) => current.map((template) => (template.id === response.template.id ? response.template : template)));
      setEditingTemplateId(null);
      setEditDraft(null);
      toast.success(`${response.template.name} updated`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Template could not be updated");
    } finally {
      setPending(null);
    }
  }

  async function handleDelete(templateId: string) {
    setPending(`delete:${templateId}`);

    try {
      await deleteWorkspaceProjectTemplate(templateId);
      setTemplates((current) => current.filter((template) => template.id !== templateId));
      toast.success("Template deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Template could not be deleted");
    } finally {
      setPending(null);
    }
  }

  async function handleRefreshSource(template: WorkspaceProjectTemplateSummary) {
    if (!template.sourceProjectId) {
      toast.error("This template is not linked to a source project");
      return;
    }

    setPending(`refresh:${template.id}`);

    try {
      const response = await updateWorkspaceProjectTemplate(template.id, {
        sourceProjectId: template.sourceProjectId,
      });
      setTemplates((current) => current.map((entry) => (entry.id === response.template.id ? response.template : entry)));
      toast.success(`${response.template.name} refreshed`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Template could not be refreshed");
    } finally {
      setPending(null);
    }
  }

  function beginEdit(template: WorkspaceProjectTemplateSummary) {
    setEditingTemplateId(template.id);
    setEditDraft(createDraft(template));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TemplateMetric icon={<BarChart3 className="size-4" />} label="Custom templates" value={templates.length.toString()} />
        <TemplateMetric icon={<Rocket className="size-4" />} label="Total uses" value={totalUses.toString()} />
        <TemplateMetric icon={<History className="size-4" />} label="Used templates" value={`${usedTemplateCount}/${templates.length}`} />
        <TemplateMetric icon={<Save className="size-4" />} label="Newest version" value={`v${newestVersion || 1}`} />
      </div>

      <div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
        Last used template: <span className="font-medium text-foreground">{lastUsedTemplate ? `${lastUsedTemplate.name} on ${formatMaybeDate(lastUsedTemplate.lastUsedAt)}` : "None yet"}</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Save custom template</CardTitle>
            <CardDescription>Turn a workspace project into a reusable project starter.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="custom-template-source">Source project</Label>
              <Select value={createDraftState.sourceProjectId} onValueChange={(sourceProjectId) => setCreateDraftState((draft) => ({ ...draft, sourceProjectId: sourceProjectId ?? "" }))}>
                <SelectTrigger id="custom-template-source" className="w-full">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent align="start">
                  {sourceProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="custom-template-name">Name</Label>
              <Input id="custom-template-name" value={createDraftState.name} onChange={(event) => setCreateDraftState((draft) => ({ ...draft, name: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="custom-template-description">Description</Label>
              <Textarea
                id="custom-template-description"
                value={createDraftState.description}
                onChange={(event) => setCreateDraftState((draft) => ({ ...draft, description: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="custom-template-folder">Default folder</Label>
              <Input id="custom-template-folder" value={createDraftState.folderName} onChange={(event) => setCreateDraftState((draft) => ({ ...draft, folderName: event.target.value }))} />
            </div>
            <Button className="gap-2" disabled={pending === "create" || sourceProjects.length === 0} onClick={() => void handleCreateTemplate()}>
              {pending === "create" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Save template
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
        {templates.length === 0 ? (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>No custom templates</CardTitle>
              <CardDescription>Saved templates from this workspace will appear here.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          templates.map((template) => {
            const editing = editingTemplateId === template.id && editDraft;

            return (
              <Card key={template.id}>
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{template.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">{template.description || "Workspace template"}</CardDescription>
                    </div>
                    <Badge className="rounded-md" variant="secondary">
                      {template.objectCount} objects
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-1">{projectReviewPolicyPresetLabels[template.reviewPolicyPresetId]}</span>
                    <span className="rounded-md bg-muted px-2 py-1">{projectExportPresetLabels[template.exportPresetId]}</span>
                    <span className="rounded-md bg-muted px-2 py-1">{template.folderName}</span>
                    <span className="rounded-md bg-muted px-2 py-1">v{template.version}</span>
                    <span className="rounded-md bg-muted px-2 py-1">{template.useCount} uses</span>
                    <span className="rounded-md bg-muted px-2 py-1">Last used {formatMaybeDate(template.lastUsedAt)}</span>
                    <span className="rounded-md bg-muted px-2 py-1">Updated {formatDate(template.updatedAt)}</span>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {editing ? (
                    <div className="grid gap-3">
                      <Input value={editDraft.name} onChange={(event) => setEditDraft((draft) => (draft ? { ...draft, name: event.target.value } : draft))} />
                      <Textarea value={editDraft.description} onChange={(event) => setEditDraft((draft) => (draft ? { ...draft, description: event.target.value } : draft))} />
                      <Input value={editDraft.folderName} onChange={(event) => setEditDraft((draft) => (draft ? { ...draft, folderName: event.target.value } : draft))} />
                      <Select value={editDraft.sourceProjectId} onValueChange={(sourceProjectId) => setEditDraft((draft) => (draft ? { ...draft, sourceProjectId: sourceProjectId ?? "" } : draft))}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Refresh from project" />
                        </SelectTrigger>
                        <SelectContent align="start">
                          {sourceProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2">
                        <Button className="gap-2" disabled={pending === `update:${template.id}`} size="sm" onClick={() => void handleUpdate(template.id)}>
                          {pending === `update:${template.id}` ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTemplateId(null);
                            setEditDraft(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {template.versionHistory.length > 0 ? (
                        <div className="grid gap-1.5 rounded-md border border-border p-2 text-xs text-muted-foreground">
                          {template.versionHistory
                            .slice(-3)
                            .reverse()
                            .map((entry) => (
                              <div className="flex items-center justify-between gap-3" key={`${entry.version}:${entry.action}:${entry.at}`}>
                                <span>
                                  {formatVersionAction(entry.action)} v{entry.version}
                                </span>
                                <span>{formatDate(entry.at)}</span>
                              </div>
                            ))}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button className="gap-2" disabled={pending === `use:${template.id}`} size="sm" onClick={() => void handleUseTemplate(template)}>
                          {pending === `use:${template.id}` ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                          Use
                        </Button>
                        <Button className="gap-2" size="sm" variant="secondary" onClick={() => beginEdit(template)}>
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button className="gap-2" disabled={pending === `clone:${template.id}`} size="sm" variant="ghost" onClick={() => void handleClone(template.id)}>
                          {pending === `clone:${template.id}` ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                          Clone
                        </Button>
                        <Button className="gap-2" disabled={pending === `refresh:${template.id}`} size="sm" variant="ghost" onClick={() => void handleRefreshSource(template)}>
                          {pending === `refresh:${template.id}` ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                          Refresh
                        </Button>
                        <Button className="gap-2 text-destructive hover:text-destructive" disabled={pending === `delete:${template.id}`} size="sm" variant="ghost" onClick={() => void handleDelete(template.id)}>
                          {pending === `delete:${template.id}` ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
}

function TemplateMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}
