"use client";

import { useMemo } from "react";
import {
  Camera,
  Film,
  GitBranch,
  Hash,
  Palette,
  RotateCcw,
  ToggleLeft,
  Trash2,
  Type as TypeIcon,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getDefaultConditionValue } from "../../interactions/interaction-conditions";
import { isDynamicVariable } from "../../scene/dynamic-variables";
import { useEditorStore } from "../../store/editor-store";
import type {
  InteractionConditionOperator,
  MediaActionOperation,
  SceneObject,
  SceneState,
  SceneVariable,
  SceneVariableValue,
  VariableActionOperation,
} from "../../types";
import { AnimationActionSection } from "./animation-action-section";
import { CollisionTriggerControls } from "./collision-trigger-controls";
import { ControlsTriggerControls } from "./controls-trigger-controls";
import { DistanceTriggerControls } from "./distance-trigger-controls";
import { DragTriggerControls } from "./drag-trigger-controls";
import { GameControlsTriggerControls } from "./game-controls-trigger-controls";
import { KeyboardTriggerControls } from "./keyboard-trigger-controls";
import { NetworkActionSection } from "./network-action-section";
import { NetworkTriggerControls } from "./network-trigger-controls";
import { ObjectInstanceActionSection } from "./object-instance-action-section";
import { ObjectVisibilityActionSection } from "./object-visibility-action-section";
import { ParticleActionSection } from "./particle-action-section";
import { PointerTriggerControls } from "./pointer-trigger-controls";
import { PropertyToggleActionSection } from "./property-toggle-action-section";
import { SceneTransitionActionSection } from "./scene-transition-action-section";
import { ScrollTriggerControls } from "./scroll-trigger-controls";
import { StateChangeTriggerControls } from "./state-change-trigger-controls";
import { TransitionActionSection } from "./transition-action-section";
import { TriggerAreaControls } from "./trigger-area-controls";
import { VariableBindingsPanel } from "./variable-bindings-panel";
import { VariableChangeTriggerControls } from "./variable-change-trigger-controls";

const variableIcons = {
  number: Hash,
  boolean: ToggleLeft,
  text: TypeIcon,
  color: Palette,
} as const;

const mediaActionOperations: MediaActionOperation[] = [
  "toggle",
  "play",
  "pause",
  "restart",
];
const emptySceneStates: SceneState[] = [];
const emptySceneVariables: SceneVariable[] = [];
const variableActionOperationLabels: Record<VariableActionOperation, string> = {
  set: "Set",
  increment: "Add",
  decrement: "Subtract",
  multiply: "Multiply",
  toggle: "Toggle",
  cycle: "Cycle",
};
const conditionOperatorLabels: Record<InteractionConditionOperator, string> = {
  equals: "equals",
  greaterOrEqual: ">=",
  greaterThan: ">",
  lessOrEqual: "<=",
  lessThan: "<",
  notEquals: "not equals",
};

function MediaObjectIcon({ kind }: { kind: SceneObject["kind"] }) {
  const Icon = kind === "audio" ? Volume2 : Film;

  return <Icon className="size-3.5 shrink-0" />;
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getAllowedOperations(
  variable?: SceneVariable,
): VariableActionOperation[] {
  if (!variable) {
    return ["set"];
  }

  if (variable.type === "number") {
    return ["set", "increment", "decrement", "multiply"];
  }

  if (variable.type === "boolean") {
    return ["set", "toggle"];
  }

  if (variable.type === "text" || variable.type === "color") {
    return ["set", "cycle"];
  }

  return ["set"];
}

function getAllowedConditionOperators(
  variable?: SceneVariable,
): InteractionConditionOperator[] {
  if (variable?.type === "number") {
    return [
      "equals",
      "notEquals",
      "greaterThan",
      "lessThan",
      "greaterOrEqual",
      "lessOrEqual",
    ];
  }

  return ["equals", "notEquals"];
}

function getDefaultActionValue(
  variable: SceneVariable,
  operation: VariableActionOperation,
): SceneVariableValue {
  if (variable.type === "number") {
    if (operation === "multiply") {
      return 2;
    }

    if (operation === "increment" || operation === "decrement") {
      return 1;
    }

    return variable.value;
  }

  if (operation === "cycle") {
    if (variable.type === "color") {
      return `${variable.value} | #f97316 | #8b5cf6`;
    }

    if (variable.type === "text") {
      const firstValue = String(variable.value || "State 1");

      return `${firstValue} | State 2 | State 3`;
    }

    return variable.value;
  }

  return variable.value;
}

function readActionValue(
  variable: SceneVariable,
  operation: VariableActionOperation,
  value: SceneVariableValue | undefined,
) {
  return value ?? getDefaultActionValue(variable, operation);
}

function getNumericActionValueLabel(operation: VariableActionOperation) {
  if (operation === "increment" || operation === "decrement") {
    return "Amount";
  }

  if (operation === "multiply") {
    return "Factor";
  }

  return "Value";
}

function getCycleOptions(actionValue: SceneVariableValue) {
  return typeof actionValue === "string" ? actionValue : "";
}

function readConditionValue(
  variable: SceneVariable,
  value: SceneVariableValue | undefined,
) {
  return value ?? getDefaultConditionValue(variable);
}

function ConditionValueControl({
  object,
  variable,
}: {
  object: SceneObject;
  variable: SceneVariable;
}) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const condition = object.interaction?.condition;

  if (variable.type === "boolean") {
    return (
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={readConditionValue(variable, condition?.value) === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              condition: {
                ...condition,
                variableId: variable.id,
                operator: condition?.operator ?? "equals",
                value: checked === true,
              },
            })
          }
        />
        Compare with true
      </Label>
    );
  }

  if (variable.type === "color") {
    const colorValue = readConditionValue(variable, condition?.value);

    return (
      <div className="grid grid-cols-[1fr_44px] items-center gap-3">
        <Label htmlFor={`condition-${object.id}-color`}>Value</Label>
        <Input
          id={`condition-${object.id}-color`}
          className="h-9 p-1"
          type="color"
          value={
            typeof colorValue === "string" && /^#[0-9a-f]{6}$/i.test(colorValue)
              ? colorValue
              : "#51e0c3"
          }
          onChange={(event) =>
            updateInteraction(object.id, {
              condition: {
                ...condition,
                variableId: variable.id,
                operator: condition?.operator ?? "equals",
                value: event.target.value,
              },
            })
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={`condition-${object.id}-value`}>Value</Label>
      <Input
        id={`condition-${object.id}-value`}
        type="text"
        value={String(readConditionValue(variable, condition?.value))}
        onChange={(event) =>
          updateInteraction(object.id, {
            condition: {
              ...condition,
              variableId: variable.id,
              operator: condition?.operator ?? "equals",
              value:
                variable.type === "number"
                  ? toNumber(
                      event.target.value,
                      Number(readConditionValue(variable, condition?.value)) ||
                        0,
                    )
                  : event.target.value,
            },
          })
        }
      />
    </div>
  );
}

function VariableActionValueControl({
  object,
  operation,
  variable,
}: {
  object: SceneObject;
  operation: VariableActionOperation;
  variable: SceneVariable;
}) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const action = object.interaction?.variableAction;

  if (operation === "toggle") {
    return null;
  }

  if (operation === "cycle") {
    const actionValue =
      action?.expression ??
      getCycleOptions(readActionValue(variable, operation, action?.value));

    return (
      <div className="space-y-1">
        <Label htmlFor={`interaction-${object.id}-cycle-options`}>
          Options
        </Label>
        <Input
          id={`interaction-${object.id}-cycle-options`}
          type="text"
          value={actionValue}
          placeholder={
            variable.type === "color"
              ? "#51e0c3 | #f97316 | #8b5cf6"
              : "State 1 | State 2 | State 3"
          }
          onChange={(event) =>
            updateInteraction(object.id, {
              variableAction: {
                ...action,
                variableId: variable.id,
                operation,
                expression: event.target.value.trim()
                  ? event.target.value
                  : undefined,
                value: undefined,
              },
            })
          }
        />
      </div>
    );
  }

  if (variable.type === "number") {
    return (
      <div className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor={`interaction-${object.id}-value`}>
            {getNumericActionValueLabel(operation)}
          </Label>
          <Input
            id={`interaction-${object.id}-value`}
            inputMode="decimal"
            type="number"
            value={String(readActionValue(variable, operation, action?.value))}
            onChange={(event) =>
              updateInteraction(object.id, {
                variableAction: {
                  ...action,
                  variableId: variable.id,
                  operation,
                  value: toNumber(
                    event.target.value,
                    Number(
                      readActionValue(variable, operation, action?.value),
                    ) || 0,
                  ),
                },
              })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`interaction-${object.id}-expression`}>
            Expression
          </Label>
          <Input
            id={`interaction-${object.id}-expression`}
            placeholder="Optional, e.g. {{Variable 1}} * 2"
            value={action?.expression ?? ""}
            onChange={(event) =>
              updateInteraction(object.id, {
                variableAction: {
                  ...action,
                  variableId: variable.id,
                  operation,
                  expression: event.target.value.trim()
                    ? event.target.value
                    : undefined,
                },
              })
            }
          />
        </div>
      </div>
    );
  }

  if (variable.type === "boolean") {
    return (
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={readActionValue(variable, operation, action?.value) === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              variableAction: {
                ...action,
                variableId: variable.id,
                operation,
                value: checked === true,
              },
            })
          }
        />
        Set to true
      </Label>
    );
  }

  if (variable.type === "color") {
    const colorValue = readActionValue(variable, operation, action?.value);

    return (
      <div className="grid grid-cols-[1fr_44px] items-center gap-3">
        <Label htmlFor={`interaction-${object.id}-color`}>Value</Label>
        <Input
          id={`interaction-${object.id}-color`}
          className="h-9 p-1"
          type="color"
          value={
            typeof colorValue === "string" && /^#[0-9a-f]{6}$/i.test(colorValue)
              ? colorValue
              : "#51e0c3"
          }
          onChange={(event) =>
            updateInteraction(object.id, {
              variableAction: {
                ...action,
                variableId: variable.id,
                operation,
                value: event.target.value,
              },
            })
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={`interaction-${object.id}-value`}>Value</Label>
      <Input
        id={`interaction-${object.id}-value`}
        type="text"
        value={String(readActionValue(variable, operation, action?.value))}
        onChange={(event) =>
          updateInteraction(object.id, {
            variableAction: {
              ...action,
              variableId: variable.id,
              operation,
              value: event.target.value,
            },
          })
        }
      />
    </div>
  );
}

export function ObjectInteractionsPanel({ object }: { object: SceneObject }) {
  const objects = useEditorStore((state) => state.document.objects);
  const sceneStatesSource = useEditorStore(
    (state) => state.document.sceneStates,
  );
  const variablesSource = useEditorStore((state) => state.document.variables);
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const cameras = useMemo(
    () => objects.filter((entry) => entry.kind === "camera"),
    [objects],
  );
  const mediaObjects = useMemo(
    () =>
      objects.filter(
        (entry) => entry.kind === "audio" || entry.kind === "video",
      ),
    [objects],
  );
  const sceneStates = sceneStatesSource ?? emptySceneStates;
  const variables = variablesSource ?? emptySceneVariables;
  const action = object.interaction?.variableAction;
  const cameraAction = object.interaction?.cameraAction;
  const condition = object.interaction?.condition;
  const localStorageAction = object.interaction?.localStorageAction;
  const mediaAction = object.interaction?.mediaAction;
  const resetAction = object.interaction?.resetAction;
  const resizeTrigger = object.interaction?.resizeTrigger;
  const startTrigger = object.interaction?.startTrigger;
  const manualVariables = variables.filter(
    (variable) => !isDynamicVariable(variable),
  );
  const hasLocalVariables = manualVariables.some(
    (variable) => variable.scope === "local",
  );
  const selectedConditionVariable = variables.find(
    (variable) => variable.id === condition?.variableId,
  );
  const selectedMediaObject = mediaObjects.find(
    (mediaObject) => mediaObject.id === mediaAction?.targetObjectId,
  );
  const selectedVariable = manualVariables.find(
    (variable) => variable.id === action?.variableId,
  );
  const allowedConditionOperators = getAllowedConditionOperators(
    selectedConditionVariable,
  );
  const conditionOperator =
    condition?.operator &&
    allowedConditionOperators.includes(condition.operator)
      ? condition.operator
      : allowedConditionOperators[0];
  const allowedOperations = getAllowedOperations(selectedVariable);
  const operation =
    action?.operation && allowedOperations.includes(action.operation)
      ? action.operation
      : allowedOperations[0];

  function chooseVariable(variable: SceneVariable) {
    updateInteraction(object.id, {
      variableAction: {
        variableId: variable.id,
        operation: "set",
        value: getDefaultActionValue(variable, "set"),
      },
    });
  }

  function chooseConditionVariable(variable: SceneVariable) {
    updateInteraction(object.id, {
      condition: {
        variableId: variable.id,
        operator: "equals",
        value: getDefaultConditionValue(variable),
      },
    });
  }

  function chooseMediaObject(mediaObject: SceneObject) {
    updateInteraction(object.id, {
      mediaAction: {
        targetObjectId: mediaObject.id,
        operation: mediaAction?.operation ?? "toggle",
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Interaction
      </div>
      <VariableBindingsPanel object={object} variables={variables} />

      <Separator />

      <div className="space-y-1">
        <Label htmlFor="object-link-url">Click link</Label>
        <div className="grid grid-cols-[1fr_36px] gap-2">
          <Input
            id="object-link-url"
            inputMode="url"
            placeholder="https://example.com"
            value={object.interaction?.linkUrl ?? ""}
            onChange={(event) =>
              updateInteraction(object.id, { linkUrl: event.target.value })
            }
          />
          <Button
            aria-label="Clear click link"
            className="size-9"
            size="icon"
            variant="ghost"
            onClick={() => updateInteraction(object.id, { linkUrl: "" })}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={startTrigger?.enabled === true}
            onCheckedChange={(checked) =>
              updateInteraction(object.id, {
                startTrigger: checked === true ? { enabled: true } : undefined,
              })
            }
          />
          Run on start
        </Label>

        <Label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={resizeTrigger?.enabled === true}
            onCheckedChange={(checked) =>
              updateInteraction(object.id, {
                resizeTrigger: checked === true ? { enabled: true } : undefined,
              })
            }
          />
          Run on resize
        </Label>

        <ControlsTriggerControls object={object} />
        <CollisionTriggerControls object={object} objects={objects} />
        <DistanceTriggerControls object={object} />
        <PointerTriggerControls object={object} />
        <DragTriggerControls object={object} />
        <GameControlsTriggerControls object={object} />
        <NetworkTriggerControls object={object} />
        <ScrollTriggerControls object={object} />
        <StateChangeTriggerControls object={object} sceneStates={sceneStates} />
        <TriggerAreaControls object={object} objects={objects} />
        <VariableChangeTriggerControls object={object} variables={variables} />
      </div>

      <Separator />

      <KeyboardTriggerControls object={object} />

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Run condition</Label>
          {condition?.variableId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                updateInteraction(object.id, { condition: undefined })
              }
            >
              Clear
            </Button>
          ) : null}
        </div>
        {variables.length ? (
          <div className="grid grid-cols-2 gap-2">
            {variables.map((variable) => {
              const Icon = variableIcons[variable.type];

              return (
                <Button
                  key={variable.id}
                  className="min-w-0 justify-start gap-2"
                  size="sm"
                  variant={
                    variable.id === condition?.variableId
                      ? "default"
                      : "outline"
                  }
                  onClick={() => chooseConditionVariable(variable)}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{variable.name}</span>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            Create a scene variable before assigning a click condition.
          </div>
        )}
      </div>

      {selectedConditionVariable ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GitBranch className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate">
              {selectedConditionVariable.name}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {allowedConditionOperators.map((operator) => (
              <Button
                key={operator}
                size="sm"
                variant={conditionOperator === operator ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    condition: {
                      variableId: selectedConditionVariable.id,
                      operator,
                      value: readConditionValue(
                        selectedConditionVariable,
                        condition?.value,
                      ),
                    },
                  })
                }
              >
                {conditionOperatorLabels[operator]}
              </Button>
            ))}
          </div>
          <ConditionValueControl
            object={object}
            variable={selectedConditionVariable}
          />
        </div>
      ) : null}

      <Separator />

      <ObjectVisibilityActionSection object={object} />

      <Separator />

      <PropertyToggleActionSection object={object} />

      <Separator />

      <ParticleActionSection object={object} />

      <Separator />

      <ObjectInstanceActionSection object={object} />

      <Separator />

      <AnimationActionSection object={object} />

      <Separator />

      <TransitionActionSection object={object} />

      <Separator />

      <SceneTransitionActionSection object={object} />

      <Separator />

      <NetworkActionSection object={object} />

      <Separator />

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={resetAction?.enabled === true}
            onCheckedChange={(checked) =>
              updateInteraction(object.id, {
                resetAction: checked === true ? { enabled: true } : undefined,
              })
            }
          />
          <RotateCcw className="size-3.5 text-muted-foreground" />
          Reset scene state
        </Label>
        <p className="text-xs text-muted-foreground">
          Restores play camera and variables to their session baseline.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={localStorageAction?.clearLocalVariables === true}
            onCheckedChange={(checked) =>
              updateInteraction(object.id, {
                localStorageAction:
                  checked === true ? { clearLocalVariables: true } : undefined,
              })
            }
          />
          <Trash2 className="size-3.5 text-muted-foreground" />
          Clear local variable storage
        </Label>
        <p className="text-xs text-muted-foreground">
          {hasLocalVariables
            ? "Removes browser-stored local values for this scene when the object is clicked."
            : "Create a local-scope variable before assigning this action."}
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Switch camera</Label>
          {cameraAction?.targetCameraId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                updateInteraction(object.id, { cameraAction: undefined })
              }
            >
              Clear
            </Button>
          ) : null}
        </div>
        {cameras.length ? (
          <div className="grid grid-cols-2 gap-2">
            {cameras.map((camera) => (
              <Button
                key={camera.id}
                className="min-w-0 justify-start gap-2"
                size="sm"
                variant={
                  camera.id === cameraAction?.targetCameraId
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  updateInteraction(object.id, {
                    cameraAction: { targetCameraId: camera.id },
                  })
                }
              >
                <Camera className="size-3.5 shrink-0" />
                <span className="truncate">{camera.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            Add a camera object before assigning a switch-camera action.
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Media action</Label>
          {mediaAction?.targetObjectId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                updateInteraction(object.id, { mediaAction: undefined })
              }
            >
              Clear
            </Button>
          ) : null}
        </div>
        {mediaObjects.length ? (
          <div className="grid grid-cols-2 gap-2">
            {mediaObjects.map((mediaObject) => (
              <Button
                key={mediaObject.id}
                className="min-w-0 justify-start gap-2"
                size="sm"
                variant={
                  mediaObject.id === mediaAction?.targetObjectId
                    ? "default"
                    : "outline"
                }
                onClick={() => chooseMediaObject(mediaObject)}
              >
                <MediaObjectIcon kind={mediaObject.kind} />
                <span className="truncate">{mediaObject.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            Import an audio or video object before assigning a media action.
          </div>
        )}
      </div>

      {selectedMediaObject ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MediaObjectIcon kind={selectedMediaObject.kind} />
            <span className="min-w-0 truncate">{selectedMediaObject.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {mediaActionOperations.map((operation) => (
              <Button
                key={operation}
                size="sm"
                variant={
                  (mediaAction?.operation ?? "toggle") === operation
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  updateInteraction(object.id, {
                    mediaAction: {
                      targetObjectId: selectedMediaObject.id,
                      operation,
                    },
                  })
                }
              >
                {operation}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Variable action</Label>
          {action?.variableId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                updateInteraction(object.id, { variableAction: undefined })
              }
            >
              Clear
            </Button>
          ) : null}
        </div>
        {manualVariables.length ? (
          <div className="grid grid-cols-2 gap-2">
            {manualVariables.map((variable) => {
              const Icon = variableIcons[variable.type];

              return (
                <Button
                  key={variable.id}
                  className="min-w-0 justify-start gap-2"
                  size="sm"
                  variant={
                    variable.id === action?.variableId ? "default" : "outline"
                  }
                  onClick={() => chooseVariable(variable)}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{variable.name}</span>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            Create a manual variable before assigning a variable action.
          </div>
        )}
      </div>

      {selectedVariable ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            {allowedOperations.map((allowedOperation) => {
              const nextValue = readActionValue(
                selectedVariable,
                allowedOperation,
                action?.operation === allowedOperation
                  ? action.value
                  : undefined,
              );

              return (
                <Button
                  key={allowedOperation}
                  size="sm"
                  variant={
                    operation === allowedOperation ? "default" : "outline"
                  }
                  onClick={() =>
                    updateInteraction(object.id, {
                      variableAction: {
                        variableId: selectedVariable.id,
                        operation: allowedOperation,
                        value:
                          allowedOperation === "cycle" ? undefined : nextValue,
                        expression:
                          allowedOperation === "cycle"
                            ? (action?.expression ?? getCycleOptions(nextValue))
                            : selectedVariable.type === "number"
                              ? action?.expression
                              : undefined,
                      },
                    })
                  }
                >
                  {variableActionOperationLabels[allowedOperation]}
                </Button>
              );
            })}
          </div>
          <VariableActionValueControl
            object={object}
            operation={operation}
            variable={selectedVariable}
          />
        </div>
      ) : null}
    </div>
  );
}
