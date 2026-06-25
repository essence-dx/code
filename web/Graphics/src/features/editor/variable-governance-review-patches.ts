import type {
  DesignDocument,
  DesignVariableDefinition,
  DesignVariableMode,
} from "@/features/editor/types";
import {
  defaultVariableMode,
  getActiveVariableModeId,
  getVariableCollections,
  getVariableModes,
} from "@/features/editor/variable-bindings";
import type { VariableGovernanceReviewRow } from "@/features/editor/variable-governance-review-types";

type VariableSystemPatch = Partial<
  Pick<
    DesignDocument,
    | "variables"
    | "variableModes"
    | "activeVariableModeId"
    | "variableDefinitions"
    | "variableCollections"
  >
>;

export function getVariableGovernancePatch(
  document: DesignDocument,
  rows: VariableGovernanceReviewRow[],
): VariableSystemPatch {
  const modes = getVariableModes({ variableModes: document.variableModes });
  const collections = getVariableCollections({
    variableCollections: document.variableCollections,
  });
  let nextModes = modes;
  let nextActiveModeId = getActiveVariableModeId({
    variableModes: document.variableModes,
    activeVariableModeId: document.activeVariableModeId,
  });
  let nextDefinitions = { ...(document.variableDefinitions ?? {}) };
  let changed = false;

  for (const row of rows) {
    if (!row.repairable || row.status === "ready") {
      continue;
    }

    if (row.action === "normalize-modes") {
      const normalized = getNormalizedModes(nextModes);
      nextModes = normalized.modes;
      nextActiveModeId = normalized.modes.some(
        (mode) => mode.id === nextActiveModeId,
      )
        ? nextActiveModeId
        : normalized.modes[0]?.id ?? defaultVariableMode.id;
      nextDefinitions = fillMissingModeValues(
        nextDefinitions,
        normalized.modes,
      );
      changed = true;
    }

    if (row.action === "fill-mode-values") {
      nextDefinitions = fillMissingModeValues(
        nextDefinitions,
        nextModes,
        new Set(row.variableIds),
      );
      changed = true;
    }

    if (row.action === "clear-alias") {
      nextDefinitions = Object.fromEntries(
        Object.entries(nextDefinitions).map(([id, variable]) => [
          id,
          row.variableIds.includes(id)
            ? { ...variable, aliasOf: undefined, updatedAt: new Date().toISOString() }
            : variable,
        ]),
      );
      changed = true;
    }

    if (row.action === "move-collection") {
      nextDefinitions = Object.fromEntries(
        Object.entries(nextDefinitions).map(([id, variable]) => [
          id,
          row.variableIds.includes(id)
            ? {
                ...variable,
                collectionId: getPreferredCollectionId(
                  variable,
                  collections,
                ),
                updatedAt: new Date().toISOString(),
              }
            : variable,
        ]),
      );
      changed = true;
    }

    if (row.action === "remove-orphans") {
      nextDefinitions = Object.fromEntries(
        Object.entries(nextDefinitions).filter(
          ([id]) => !row.variableIds.includes(id),
        ),
      );
      changed = true;
    }
  }

  if (!changed) {
    return {};
  }

  return {
    variableModes: nextModes,
    activeVariableModeId: nextActiveModeId,
    variableDefinitions: nextDefinitions,
    variableCollections: collections,
    variables: getFlatResolvedValues(nextDefinitions, nextModes, nextActiveModeId),
  };
}

function getNormalizedModes(modes: DesignVariableMode[]) {
  const seenNames = new Set<string>();
  const uniqueModes = modes.filter((mode) => {
    const key = mode.name.trim().toLowerCase();

    if (seenNames.has(key)) {
      return false;
    }

    seenNames.add(key);
    return true;
  });
  const modesWithDefault = uniqueModes.some(
    (mode) => mode.id === defaultVariableMode.id,
  )
    ? uniqueModes
    : [defaultVariableMode, ...uniqueModes];

  return { modes: modesWithDefault };
}

function fillMissingModeValues(
  definitions: Record<string, DesignVariableDefinition>,
  modes: DesignVariableMode[],
  variableIds?: Set<string>,
) {
  return Object.fromEntries(
    Object.entries(definitions).map(([id, variable]) => {
      if (variableIds && !variableIds.has(id)) {
        return [id, variable];
      }

      if (variable.aliasOf) {
        return [id, variable];
      }

      const fallback =
        variable.values[defaultVariableMode.id] ??
        Object.values(variable.values).find((value) => value.trim()) ??
        "";
      const nextValues = { ...variable.values };
      let changed = false;

      for (const mode of modes) {
        if (!String(nextValues[mode.id] ?? "").trim()) {
          nextValues[mode.id] = fallback;
          changed = true;
        }
      }

      return [
        id,
        changed
          ? { ...variable, values: nextValues, updatedAt: new Date().toISOString() }
          : variable,
      ];
    }),
  );
}

function getPreferredCollectionId(
  variable: DesignVariableDefinition,
  collections: NonNullable<DesignDocument["variableCollections"]>,
) {
  const preferredScopes =
    variable.type === "color"
      ? ["paint", "effect"]
      : variable.type === "number"
        ? ["layout", "text", "effect"]
        : ["text", "component", "prototype", "dev"];
  const match = Object.values(collections).find((collection) =>
    preferredScopes.includes(collection.scope),
  );

  return match?.id ?? variable.collectionId;
}

function getFlatResolvedValues(
  definitions: Record<string, DesignVariableDefinition>,
  modes: DesignVariableMode[],
  activeModeId: string,
) {
  const context = {
    variableDefinitions: definitions,
    variableModes: modes,
    activeVariableModeId: activeModeId,
  };

  return Object.fromEntries(
    Object.values(definitions)
      .map((variable) => [variable.name, resolveValue(variable.id, context)] as const)
      .filter((entry): entry is [string, string] => entry[1] !== null),
  );
}

function resolveValue(
  variableId: string,
  context: Pick<
    DesignDocument,
    "variableDefinitions" | "variableModes" | "activeVariableModeId"
  >,
  visited = new Set<string>(),
): string | null {
  const variable = context.variableDefinitions?.[variableId];

  if (!variable || visited.has(variableId)) {
    return null;
  }

  if (variable.aliasOf) {
    visited.add(variableId);
    return resolveValue(variable.aliasOf, context, visited);
  }

  return (
    variable.values[context.activeVariableModeId ?? ""] ??
    variable.values[defaultVariableMode.id] ??
    Object.values(variable.values)[0] ??
    null
  );
}
