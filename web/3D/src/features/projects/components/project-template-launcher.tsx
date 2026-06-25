"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject } from "@/features/projects/project-api";
import { projectExportPresetLabels, projectReviewPolicyPresetLabels, projectTemplateOptions } from "@/features/projects/project-templates";
import { cn } from "@/lib/utils";

export function ProjectTemplateLauncher({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(projectTemplateOptions[0]?.id ?? "");
  const selectedTemplate = useMemo(() => projectTemplateOptions.find((template) => template.id === selectedTemplateId) ?? projectTemplateOptions[0], [selectedTemplateId]);
  const [name, setName] = useState(selectedTemplate?.defaultName ?? "Untitled Scene");

  async function handleCreate() {
    if (!selectedTemplate) {
      return;
    }

    setPending(true);

    try {
      const response = await createProject({
        exportPresetId: selectedTemplate.exportPresetId,
        name: name.trim() || selectedTemplate.defaultName,
        reviewPolicyPresetId: selectedTemplate.reviewPolicyPresetId,
        templateId: selectedTemplate.id,
        workspaceId,
      });
      toast.success(`${response.project.name} created`);
      setOpen(false);
      router.push(`/?projectId=${response.project.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Template creation failed");
    } finally {
      setPending(false);
    }
  }

  function handleSelect(templateId: string) {
    const template = projectTemplateOptions.find((entry) => entry.id === templateId);

    setSelectedTemplateId(templateId);

    if (template) {
      setName(template.defaultName);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2" variant="secondary">
            <LayoutTemplate className="size-4" />
            Templates
          </Button>
        }
      />
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Start from template</DialogTitle>
          <DialogDescription>Choose a scene starter with review policy, export preset, and workspace folder defaults.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          {projectTemplateOptions.map((template) => (
            <Button
              key={template.id}
              className={cn(
                "h-auto items-start justify-start rounded-lg border bg-background p-3 text-left transition hover:border-primary/60",
                selectedTemplateId === template.id ? "border-primary ring-2 ring-primary/15" : "border-border",
              )}
              type="button"
              variant="ghost"
              onClick={() => handleSelect(template.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{template.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.summary}</p>
                </div>
                <Badge className="shrink-0 rounded-md" variant="secondary">
                  {template.workspaceDefaults.namePrefix}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-1">{projectReviewPolicyPresetLabels[template.reviewPolicyPresetId]}</span>
                <span className="rounded-md bg-muted px-2 py-1">{projectExportPresetLabels[template.exportPresetId]}</span>
                <span className="rounded-md bg-muted px-2 py-1">{template.workspaceDefaults.folderName}</span>
              </div>
            </Button>
          ))}
        </div>
        <div className="grid gap-2">
          <Label className="text-xs font-medium text-muted-foreground" htmlFor="template-project-name">
            Project name
          </Label>
          <Input id="template-project-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button className="gap-2" disabled={pending || !selectedTemplate} onClick={() => void handleCreate()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
