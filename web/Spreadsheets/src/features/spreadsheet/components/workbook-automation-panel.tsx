"use client";

import { useState } from "react";
import { FileCode2, ListChecks, Play, ShieldAlert, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkbookExtensionPanel } from "@/features/spreadsheet/components/workbook-extension-panel";
import type {
  WorkbookAddInManifest,
  WorkbookAutomationPermission,
  WorkbookAutomationScript,
  WorkbookCustomFunction,
  WorkbookMacroProject,
} from "@/features/workbooks/types";
import type { WorkbookAutomationRunResult } from "@/features/spreadsheet/automation-runtime";
import type { WorkbookAddInSandboxResult } from "@/features/spreadsheet/add-in-sandbox";

function statusLabel(script: WorkbookAutomationScript) {
  if (script.status === "recording") {
    return "Recording";
  }

  if (script.status === "ready") {
    return "Ready";
  }

  return "Disabled";
}

function permissionLabel(permission: WorkbookAutomationPermission) {
  return permission.replace(/([A-Z])/g, " $1").toLowerCase();
}

export function WorkbookAutomationPanel({
  addIns,
  customFunctions,
  disabled,
  macroProjects,
  scripts,
  onDeleteAddIn,
  onDeleteCustomFunction,
  onDeleteScript,
  onRegisterAddIn,
  onRunAddIn,
  onRunScript,
  onSaveCustomFunction,
  onSetAddInEnabled,
  onStartRecording,
  onStopRecording,
}: {
  addIns: WorkbookAddInManifest[];
  customFunctions: WorkbookCustomFunction[];
  disabled: boolean;
  macroProjects: WorkbookMacroProject[];
  scripts: WorkbookAutomationScript[];
  onDeleteAddIn: (addInId: string) => void;
  onDeleteCustomFunction: (functionId: string) => void;
  onDeleteScript: (scriptId: string) => void;
  onRegisterAddIn: (
    name: string,
    provider: string,
    permissions: WorkbookAutomationPermission[],
    description?: string,
  ) => void;
  onRunAddIn: (addInId: string) => WorkbookAddInSandboxResult | null;
  onRunScript: (scriptId: string) => WorkbookAutomationRunResult | null;
  onSaveCustomFunction: (
    name: string,
    expression: string,
    description?: string,
  ) => void;
  onSetAddInEnabled: (addInId: string, enabled: boolean) => void;
  onStartRecording: (name: string) => void;
  onStopRecording: (scriptId: string) => void;
}) {
  const [scriptName, setScriptName] = useState("Recorded cleanup");
  const recordingScript =
    scripts.find((script) => script.status === "recording") ?? null;

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Macros and scripts</h2>
        <Badge variant="secondary" className="font-mono">
          {macroProjects.length + scripts.length + customFunctions.length + addIns.length}
        </Badge>
      </div>

      <div className="space-y-3">
        <section className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium">Preserved macro projects</p>
          </div>
          {macroProjects.length === 0 ? (
            <p className="text-xs leading-5 text-muted-foreground">
              No imported VBA project is stored in this workbook.
            </p>
          ) : (
            <div className="space-y-2">
              {macroProjects.map((project) => (
                <div key={project.id} className="rounded-md border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {project.name}
                    </p>
                    <Badge variant="outline">Disabled</Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {project.sourceFormat.toUpperCase()} VBA,{" "}
                    {Math.ceil(project.binarySize / 1024)} KB, preserved for
                    export only.
                  </p>
                  {project.sheetCodeNames.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {project.sheetCodeNames.length} sheet code name
                      {project.sheetCodeNames.length === 1 ? "" : "s"} kept.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <FileCode2 className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium">Safe script runtime</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={scriptName}
              disabled={disabled || recordingScript !== null}
              aria-label="Script recording name"
              onChange={(event) => setScriptName(event.target.value)}
            />
            {recordingScript ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onStopRecording(recordingScript.id)}
              >
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={disabled}
                onClick={() => onStartRecording(scriptName)}
              >
                Record
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Recorded commands can run only through the workbook permission gate.
          </p>
          {scripts.length > 0 ? (
            <div className="mt-3 space-y-2">
              {scripts.map((script) => (
                <div key={script.id} className="rounded-md border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {script.name}
                    </p>
                    <Badge
                      variant={
                        script.status === "recording" ? "secondary" : "outline"
                      }
                    >
                      {statusLabel(script)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {script.steps.length} recorded step
                    {script.steps.length === 1 ? "" : "s"}
                  </p>
                  {script.permissions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {script.permissions.map((permission) => (
                        <Badge key={permission} variant="outline">
                          {permissionLabel(permission)}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {script.lastRunAt ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last run {script.lastRunStatus}: {script.lastRunMessage}
                    </p>
                  ) : null}
                  {script.steps.length > 0 ? (
                    <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {script.steps.slice(-4).map((step) => (
                        <li key={step.id} className="flex gap-2">
                          <ListChecks className="mt-0.5 size-3 shrink-0" />
                          <span className="min-w-0 truncate">
                            {step.label}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-2 h-7 px-2"
                    disabled={disabled || script.status !== "ready"}
                    onClick={() => onRunScript(script.id)}
                  >
                    <Play />
                    Run
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-2 mt-2 h-7 px-2"
                    disabled={script.status === "recording"}
                    onClick={() => onDeleteScript(script.id)}
                  >
                    <Trash2 />
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <WorkbookExtensionPanel
          addIns={addIns}
          customFunctions={customFunctions}
          disabled={disabled}
          onDeleteAddIn={onDeleteAddIn}
          onDeleteCustomFunction={onDeleteCustomFunction}
          onRegisterAddIn={onRegisterAddIn}
          onRunAddIn={onRunAddIn}
          onSaveCustomFunction={onSaveCustomFunction}
          onSetAddInEnabled={onSetAddInEnabled}
        />
      </div>
    </section>
  );
}
