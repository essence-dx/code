"use client";

import { useState } from "react";
import { Play, Power, Puzzle, ShieldAlert, ShieldCheck, Sigma, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WorkbookAddInSandboxResult } from "@/features/spreadsheet/add-in-sandbox";
import type {
  WorkbookAddInManifest,
  WorkbookAutomationPermission,
  WorkbookCustomFunction,
} from "@/features/workbooks/types";

const ADD_IN_PERMISSIONS: WorkbookAutomationPermission[] = [
  "readWorkbook",
  "writeCells",
  "formatCells",
  "sortAndClean",
];

function permissionLabel(permission: WorkbookAutomationPermission) {
  return permission.replace(/([A-Z])/g, " $1").toLowerCase();
}

function signatureLabel(addIn: WorkbookAddInManifest) {
  if (addIn.signatureStatus === "verified") {
    return "Signature verified";
  }

  if (addIn.signatureStatus === "invalid") {
    return "Signature invalid";
  }

  return "Unsigned";
}

export function WorkbookExtensionPanel({
  addIns,
  customFunctions,
  disabled,
  onDeleteAddIn,
  onDeleteCustomFunction,
  onRegisterAddIn,
  onRunAddIn,
  onSaveCustomFunction,
  onSetAddInEnabled,
}: {
  addIns: WorkbookAddInManifest[];
  customFunctions: WorkbookCustomFunction[];
  disabled: boolean;
  onDeleteAddIn: (addInId: string) => void;
  onDeleteCustomFunction: (functionId: string) => void;
  onRegisterAddIn: (
    name: string,
    provider: string,
    permissions: WorkbookAutomationPermission[],
    description?: string,
  ) => void;
  onRunAddIn: (addInId: string) => WorkbookAddInSandboxResult | null;
  onSaveCustomFunction: (
    name: string,
    expression: string,
    description?: string,
  ) => void;
  onSetAddInEnabled: (addInId: string, enabled: boolean) => void;
}) {
  const [functionName, setFunctionName] = useState("CLEAN_TEXT");
  const [functionDescription, setFunctionDescription] = useState(
    "Normalize whitespace in a selected text value",
  );
  const [functionExpression, setFunctionExpression] = useState(
    '=TRIM(SUBSTITUTE(value,CHAR(160)," "))',
  );
  const [addInName, setAddInName] = useState("Workbook cleaner");
  const [addInProvider, setAddInProvider] = useState("Essence");
  const [selectedPermissions, setSelectedPermissions] = useState<
    WorkbookAutomationPermission[]
  >(["readWorkbook", "writeCells"]);

  function togglePermission(permission: WorkbookAutomationPermission) {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }

  return (
    <>
      <section className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <Sigma className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Custom functions</p>
        </div>
        <div className="space-y-2">
          <Input
            value={functionName}
            disabled={disabled}
            aria-label="Custom function name"
            onChange={(event) => setFunctionName(event.target.value)}
          />
          <Input
            value={functionDescription}
            disabled={disabled}
            aria-label="Custom function description"
            onChange={(event) => setFunctionDescription(event.target.value)}
          />
          <Textarea
            value={functionExpression}
            disabled={disabled}
            aria-label="Custom function expression"
            className="min-h-20 font-mono text-xs"
            onChange={(event) => setFunctionExpression(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() =>
              onSaveCustomFunction(
                functionName,
                functionExpression,
                functionDescription,
              )
            }
          >
            Save function
          </Button>
        </div>
        {customFunctions.length > 0 ? (
          <div className="mt-3 space-y-2">
            {customFunctions.map((customFunction) => (
              <div key={customFunction.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-mono text-sm font-medium">
                    {customFunction.name}
                  </p>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => onDeleteCustomFunction(customFunction.id)}
                  >
                    <Trash2 />
                    <span className="sr-only">Delete custom function</span>
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {customFunction.description}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <Puzzle className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Add-in manifests</p>
        </div>
        <div className="space-y-2">
          <Input
            value={addInName}
            disabled={disabled}
            aria-label="Add-in name"
            onChange={(event) => setAddInName(event.target.value)}
          />
          <Input
            value={addInProvider}
            disabled={disabled}
            aria-label="Add-in provider"
            onChange={(event) => setAddInProvider(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            {ADD_IN_PERMISSIONS.map((permission) => (
              <label
                key={permission}
                className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(permission)}
                  disabled={disabled}
                  onChange={() => togglePermission(permission)}
                />
                {permissionLabel(permission)}
              </label>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() =>
              onRegisterAddIn(
                addInName,
                addInProvider,
                selectedPermissions,
                "Permission-scoped workbook extension manifest",
              )
            }
          >
            Register add-in
          </Button>
        </div>
        {addIns.length > 0 ? (
          <div className="mt-3 space-y-2">
            {addIns.map((addIn) => (
              <div key={addIn.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{addIn.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {addIn.provider} / {addIn.version}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      disabled={disabled}
                      onClick={() => onDeleteAddIn(addIn.id)}
                    >
                      <Trash2 />
                      <span className="sr-only">Delete add-in</span>
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge
                    variant={
                      addIn.signatureStatus === "verified"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {addIn.signatureStatus === "verified" ? (
                      <ShieldCheck className="mr-1 size-3" />
                    ) : (
                      <ShieldAlert className="mr-1 size-3" />
                    )}
                    {signatureLabel(addIn)}
                  </Badge>
                  <Badge variant={addIn.enabled ? "default" : "outline"}>
                    {addIn.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  {addIn.permissions.map((permission) => (
                    <Badge key={permission} variant="outline">
                      {permissionLabel(permission)}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {addIn.sandboxCommands.length} sandbox command
                  {addIn.sandboxCommands.length === 1 ? "" : "s"} / package{" "}
                  <span className="font-mono">
                    {addIn.packageDigest.split(":").at(-1)}
                  </span>
                </p>
                {addIn.disabledReason && !addIn.enabled ? (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {addIn.disabledReason}
                  </p>
                ) : null}
                {addIn.lastRunAt ? (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Last run {addIn.lastRunStatus}: {addIn.lastRunMessage}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2"
                    disabled={disabled || addIn.signatureStatus !== "verified"}
                    onClick={() => onSetAddInEnabled(addIn.id, !addIn.enabled)}
                  >
                    <Power />
                    {addIn.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2"
                    disabled={
                      disabled ||
                      !addIn.enabled ||
                      addIn.signatureStatus !== "verified" ||
                      addIn.sandboxCommands.length === 0
                    }
                    onClick={() => onRunAddIn(addIn.id)}
                  >
                    <Play />
                    Run
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
