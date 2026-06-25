"use client";

import { nanoid } from "nanoid";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultVariableMode,
  getActiveVariableModeId,
  getFlatVariableMap,
  getVariableCollections,
  getVariableModes,
} from "@/features/editor/variable-bindings";
import { VariableCollectionsEditor } from "@/features/editor/components/variable-collections-editor";
import type {
  DesignDocument,
  DesignVariableCollection,
  DesignVariableDefinition,
  DesignVariableMode,
  DesignVariableType,
} from "@/features/editor/types";

type DocumentVariablesSectionProps = {
  variables: Record<string, string>;
  variableDefinitions: Record<string, DesignVariableDefinition>;
  variableCollections: Record<string, DesignVariableCollection>;
  variableModes: DesignVariableMode[];
  activeVariableModeId?: string;
  onUpdateVariableSystem: (
    patch: Partial<
      Pick<
        DesignDocument,
        | "variables"
        | "variableModes"
        | "activeVariableModeId"
        | "variableDefinitions"
        | "variableCollections"
      >
    >,
    applyBindings?: boolean,
  ) => void;
};

export function DocumentVariablesSection({
  variables,
  variableDefinitions,
  variableCollections,
  variableModes,
  activeVariableModeId,
  onUpdateVariableSystem,
}: DocumentVariablesSectionProps) {
  const modes = getVariableModes({ variableModes });
  const modeId = getActiveVariableModeId({ variableModes, activeVariableModeId });
  const collections = getVariableCollections({ variableCollections });
  const collectionList = Object.values(collections).sort((first, second) =>
    first.name.localeCompare(second.name),
  );
  const definitions = getVariableDefinitions(variables, variableDefinitions);
  const definitionList = Object.values(definitions).sort((first, second) =>
    first.name.localeCompare(second.name),
  );

  function commit(
    patch: Partial<
      Pick<
        DesignDocument,
        | "variables"
        | "variableModes"
        | "activeVariableModeId"
        | "variableDefinitions"
        | "variableCollections"
      >
    >,
    applyBindings = true,
  ) {
    const nextContext = {
      variableModes: patch.variableModes ?? modes,
      activeVariableModeId: patch.activeVariableModeId ?? modeId,
      variableDefinitions: patch.variableDefinitions ?? definitions,
      variableCollections: patch.variableCollections ?? collections,
    };

    onUpdateVariableSystem(
      {
        ...patch,
        variables: getFlatVariableMap(nextContext),
      },
      applyBindings,
    );
  }

  function addMode() {
    const nextMode = {
      id: nanoid(),
      name: `Mode ${modes.length + 1}`,
    };

    commit({
      variableModes: [...modes, nextMode],
      activeVariableModeId: nextMode.id,
      variableDefinitions: Object.fromEntries(
        Object.values(definitions).map((variable) => [
          variable.id,
          {
            ...variable,
            values: {
              ...variable.values,
              [nextMode.id]:
                variable.values[modeId] ??
                variable.values[defaultVariableMode.id] ??
                "",
            },
          },
        ]),
      ),
    });
  }

  function addCollection() {
    const id = nanoid();
    const now = new Date().toISOString();

    commit(
      {
        variableCollections: {
          ...collections,
          [id]: {
            id,
            name: `Collection ${collectionList.length + 1}`,
            scope: "paint",
            createdAt: now,
            updatedAt: now,
          },
        },
      },
      false,
    );
  }

  function updateCollection(
    collectionId: string,
    patch: Partial<DesignVariableCollection>,
  ) {
    const collection = collections[collectionId];

    if (!collection) {
      return;
    }

    commit(
      {
        variableCollections: {
          ...collections,
          [collectionId]: {
            ...collection,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        },
      },
      false,
    );
  }

  function setActiveMode(nextModeId: string) {
    commit({ activeVariableModeId: nextModeId }, true);
  }

  function addVariable(type: DesignVariableType) {
    const id = nanoid();
    const now = new Date().toISOString();
    const name = `${type}/new-${definitionList.length + 1}`;
    const value = type === "color" ? "#5eead4" : type === "number" ? "8" : "Text";
    const collectionId = getDefaultCollectionId(type, collectionList);

    commit({
      variableDefinitions: {
        ...definitions,
        [id]: {
          id,
          name,
          type,
          collectionId,
          values: Object.fromEntries(modes.map((mode) => [mode.id, value])),
          createdAt: now,
          updatedAt: now,
        },
      },
    });
  }

  function updateVariable(
    variableId: string,
    patch: Partial<DesignVariableDefinition>,
  ) {
    const variable = definitions[variableId];

    if (!variable) {
      return;
    }

    commit({
      variableDefinitions: {
        ...definitions,
        [variableId]: {
          ...variable,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  }

  function updateModeValue(variable: DesignVariableDefinition, value: string) {
    updateVariable(variable.id, {
      values: {
        ...variable.values,
        [modeId]: value,
      },
    });
  }

  function removeVariable(variableId: string) {
    const nextDefinitions = { ...definitions };
    delete nextDefinitions[variableId];

    commit({ variableDefinitions: nextDefinitions });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Variables
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-7 gap-1 px-2 text-xs"
          onClick={addMode}
        >
          <Plus className="size-3" />
          Mode
        </Button>
      </div>
      <Select value={modeId} onValueChange={setActiveMode}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {modes.map((mode) => (
            <SelectItem key={mode.id} value={mode.id}>
              {mode.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-3 gap-1">
        <Button type="button" variant="secondary" className="h-7 text-xs" onClick={() => addVariable("color")}>
          Color
        </Button>
        <Button type="button" variant="secondary" className="h-7 text-xs" onClick={() => addVariable("number")}>
          Number
        </Button>
        <Button type="button" variant="secondary" className="h-7 text-xs" onClick={() => addVariable("text")}>
          Text
        </Button>
      </div>
      <VariableCollectionsEditor
        collections={collectionList}
        onAddCollection={addCollection}
        onUpdateCollection={updateCollection}
      />
      <div className="space-y-2">
        {definitionList.map((variable) => (
          <VariableDefinitionRow
            key={variable.id}
            variable={variable}
            modeId={modeId}
            collections={collectionList}
            variables={definitionList}
            onUpdateVariable={updateVariable}
            onUpdateModeValue={updateModeValue}
            onRemoveVariable={removeVariable}
          />
        ))}
      </div>
    </div>
  );
}

function VariableDefinitionRow({
  variable,
  modeId,
  collections,
  variables,
  onUpdateVariable,
  onUpdateModeValue,
  onRemoveVariable,
}: {
  variable: DesignVariableDefinition;
  modeId: string;
  collections: DesignVariableCollection[];
  variables: DesignVariableDefinition[];
  onUpdateVariable: (
    variableId: string,
    patch: Partial<DesignVariableDefinition>,
  ) => void;
  onUpdateModeValue: (variable: DesignVariableDefinition, value: string) => void;
  onRemoveVariable: (variableId: string) => void;
}) {
  const modeValue = variable.values[modeId] ?? "";
  const aliasTargets = variables.filter(
    (target) => target.id !== variable.id && target.type === variable.type,
  );

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/40 p-2">
      <div className="flex items-center gap-2">
        <Input
          value={variable.name}
          className="h-8"
          onChange={(event) =>
            onUpdateVariable(variable.id, { name: event.target.value })
          }
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Remove ${variable.name}`}
          onClick={() => onRemoveVariable(variable.id)}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <VariableValueInput
          variable={variable}
          value={modeValue}
          disabled={Boolean(variable.aliasOf)}
          onChange={(value) => onUpdateModeValue(variable, value)}
        />
        <Select
          value={variable.aliasOf ?? "__none__"}
          onValueChange={(aliasOf) =>
            onUpdateVariable(variable.id, {
              aliasOf: aliasOf === "__none__" ? undefined : aliasOf,
            })
          }
        >
          <SelectTrigger className="h-8 min-w-0">
            <SelectValue placeholder="Alias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No alias</SelectItem>
            {aliasTargets.map((target) => (
              <SelectItem key={target.id} value={target.id}>
                {target.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Select
        value={variable.collectionId ?? "__none__"}
        onValueChange={(collectionId) =>
          onUpdateVariable(variable.id, {
            collectionId: collectionId === "__none__" ? undefined : collectionId,
          })
        }
      >
        <SelectTrigger className="h-8 min-w-0">
          <SelectValue placeholder="Collection" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">No collection</SelectItem>
          {collections.map((collection) => (
            <SelectItem key={collection.id} value={collection.id}>
              {collection.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function VariableValueInput({
  variable,
  value,
  disabled,
  onChange,
}: {
  variable: DesignVariableDefinition;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (variable.type === "color") {
    return (
      <ColorPicker
        value={value || "#000000"}
        onChange={onChange}
        className={disabled ? "pointer-events-none opacity-50" : undefined}
      />
    );
  }

  if (variable.type === "number") {
    return (
      <NumberInput
        value={Number(value) || 0}
        onChange={(nextValue) => onChange(String(nextValue))}
        disabled={disabled}
      />
    );
  }

  return (
    <Input
      value={value}
      className="h-8"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function getVariableDefinitions(
  variables: Record<string, string>,
  definitions: Record<string, DesignVariableDefinition>,
) {
  const now = new Date().toISOString();

  return {
    ...Object.fromEntries(
      Object.entries(variables).map(([name, value]) => [
        name,
        createLegacyVariableDefinition(name, value, now),
      ]),
    ),
    ...definitions,
  };
}

function createLegacyVariableDefinition(
  name: string,
  value: string,
  now: string,
) {
  const type = inferVariableType(value);

  return {
    id: name,
    name,
    type,
    collectionId: type === "color" ? "paint" : type === "text" ? "text" : "layout",
    values: { [defaultVariableMode.id]: value },
    createdAt: now,
    updatedAt: now,
  } satisfies DesignVariableDefinition;
}

function getDefaultCollectionId(
  type: DesignVariableType,
  collections: DesignVariableCollection[],
) {
  const scope = type === "color" ? "paint" : type === "text" ? "text" : "layout";

  return (
    collections.find((collection) => collection.scope === scope)?.id ??
    collections[0]?.id
  );
}

function inferVariableType(value: string): DesignVariableType {
  if (value.startsWith("#") || value.startsWith("rgb") || value === "transparent") {
    return "color";
  }

  return Number.isFinite(Number(value)) ? "number" : "text";
}
