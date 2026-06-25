"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { createSocialFormatProjectResize } from "@/lib/editor/project-variants";
import { exportPresets } from "@/lib/editor/presets";
import { findSocialFormatPreset } from "@/lib/editor/social-format-presets";
import { findStarterWorkflowPreset, starterWorkflowPresets } from "@/lib/editor/starter-workflows";

export function StarterWorkflowPanel() {
  const [workflowId, setWorkflowId] = useState(starterWorkflowPresets[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const project = useEditorStore((state) => state.project);
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const loadProject = useEditorStore((state) => state.loadProject);
  const addTemplate = useEditorStore((state) => state.addTemplate);
  const queueExport = useEditorStore((state) => state.queueExport);
  const selectedWorkflow = findStarterWorkflowPreset(workflowId);
  const selectedSocialFormat = findSocialFormatPreset(selectedWorkflow.socialFormatId);
  const selectedExportPreset = exportPresets.find((preset) => preset.id === selectedWorkflow.exportPresetId) ?? exportPresets[0];

  function startWorkflow() {
    loadProject(createSocialFormatProjectResize(project, selectedSocialFormat), mediaAssets);
    selectedWorkflow.templateIds.forEach((templateId) => addTemplate(templateId));
    queueExport(selectedExportPreset.format, selectedExportPreset.id);
    setMessage(`${selectedWorkflow.label} started on ${selectedSocialFormat.label}; ${selectedExportPreset.label} queued.`);
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">Starter workflows</h4>
          <p className="text-xs text-muted-foreground">{selectedSocialFormat.label}</p>
        </div>
        <Badge variant="outline">{selectedExportPreset.label}</Badge>
      </div>
      <div className="grid gap-2">
        {starterWorkflowPresets.map((workflow) => (
          <button
            key={workflow.id}
            type="button"
            className={`rounded-md border p-2 text-left text-xs transition ${
              selectedWorkflow.id === workflow.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/60"
            }`}
            onClick={() => {
              setWorkflowId(workflow.id);
              setMessage(null);
            }}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium">{workflow.label}</span>
              <Badge variant="secondary">{workflow.templateIds.length} templates</Badge>
            </span>
            <span className="mt-1 block text-muted-foreground">{workflow.bestFor}</span>
          </button>
        ))}
      </div>
      <Button className="w-full" size="sm" onClick={startWorkflow}>
        Start workflow
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
