import type {
  DesignDocument,
  DesignLayer,
  DesignVariableDefinition,
  DesignVariableScope,
  DesignVariableType,
} from "@/features/editor/types";
import {
  defaultVariableMode,
  getActiveVariableModeId,
  getVariableCollections,
  getVariableModes,
  variableBindableProperties,
} from "@/features/editor/variable-bindings";
import {
  variableGovernanceStatusRank,
  type VariableGovernanceCategory,
  type VariableGovernanceReviewReport,
  type VariableGovernanceReviewRow,
} from "@/features/editor/variable-governance-review-types";

type VariableUsageFacts = {
  bindingCountByVariableId: Map<string, number>;
  aliasDependentsByVariableId: Map<string, string[]>;
};

export function getVariableGovernanceReview(
  document: DesignDocument,
): VariableGovernanceReviewReport {
  const definitions = document.variableDefinitions ?? {};
  const variables = Object.values(definitions);
  const modes = getVariableModes({ variableModes: document.variableModes });
  const collections = getVariableCollections({
    variableCollections: document.variableCollections,
  });
  const usage = getVariableUsageFacts(document, variables);
  const rows = [
    ...getModeRows(document, variables),
    ...getAliasRows(variables),
    ...getModeCoverageRows(variables, modes),
    ...getCollectionRows(variables, collections),
    ...getDuplicateRows(variables),
    ...getOrphanRows(variables, usage),
  ].sort((first, second) => {
    if (first.status !== second.status) {
      return (
        variableGovernanceStatusRank[first.status] -
        variableGovernanceStatusRank[second.status]
      );
    }

    return first.category.localeCompare(second.category);
  });
  const finalRows = rows.length > 0 ? rows : [getReadyRow(variables.length)];
  const blockedCount = finalRows.filter((row) => row.status === "blocked").length;
  const reviewCount = finalRows.filter((row) => row.status === "review").length;
  const readyCount = finalRows.filter((row) => row.status === "ready").length;
  const aliasRows = finalRows.filter((row) => row.category === "alias");
  const score = Math.max(0, 100 - blockedCount * 20 - reviewCount * 7);

  return {
    score,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    modeCount: modes.length,
    collectionCount: Object.keys(collections).length,
    variableCount: variables.length,
    aliasCount: variables.filter((variable) => variable.aliasOf).length,
    dependencyEdgeCount: variables.filter((variable) => variable.aliasOf).length,
    brokenAliasCount: aliasRows.filter((row) => row.label === "Broken alias")
      .length,
    aliasCycleCount: aliasRows.filter((row) => row.label === "Alias cycle")
      .length,
    missingModeValueCount: finalRows
      .filter((row) => row.category === "coverage")
      .reduce((total, row) => total + row.metric, 0),
    orphanTokenCount: finalRows
      .filter((row) => row.category === "orphan")
      .reduce((total, row) => total + row.variableIds.length, 0),
    duplicateNameCount: finalRows
      .filter((row) => row.category === "duplicate")
      .reduce((total, row) => total + row.variableIds.length, 0),
    collectionMismatchCount: finalRows
      .filter((row) => row.category === "collection")
      .reduce((total, row) => total + row.variableIds.length, 0),
    repairableCount: finalRows.filter((row) => row.repairable).length,
    readyCount,
    reviewCount,
    blockedCount,
    rows: finalRows,
  };
}

function getModeRows(
  document: DesignDocument,
  variables: DesignVariableDefinition[],
): VariableGovernanceReviewRow[] {
  const modes = getVariableModes({ variableModes: document.variableModes });
  const activeModeId = getActiveVariableModeId({
    variableModes: document.variableModes,
    activeVariableModeId: document.activeVariableModeId,
  });
  const modeIds = new Set(modes.map((mode) => mode.id));
  const hasDefault = modeIds.has(defaultVariableMode.id);
  const duplicateModeNames = getDuplicateValues(modes.map((mode) => mode.name));
  const hasInvalidActiveMode = !modeIds.has(activeModeId);

  if (hasDefault && duplicateModeNames.length === 0 && !hasInvalidActiveMode) {
    return [];
  }

  return [
    createRow({
      status: hasInvalidActiveMode || !hasDefault ? "blocked" : "review",
      category: "modes",
      label: "Mode registry needs normalization",
      detail: [
        !hasDefault ? "default mode is missing" : null,
        hasInvalidActiveMode ? "active mode is invalid" : null,
        duplicateModeNames.length
          ? `${duplicateModeNames.length} duplicate mode name groups exist`
          : null,
      ]
        .filter(Boolean)
        .join(", "),
      recommendation:
        "Normalize mode ids, keep a default fallback, and make the active mode point to a real mode before exporting library tokens.",
      variableIds: variables.map((variable) => variable.id),
      variableNames: variables.map((variable) => variable.name),
      modeIds: modes.map((mode) => mode.id),
      action: "normalize-modes",
      actionLabel: "Normalize",
      metric:
        Number(!hasDefault) +
        Number(hasInvalidActiveMode) +
        duplicateModeNames.length,
    }),
  ];
}

function getAliasRows(
  variables: DesignVariableDefinition[],
): VariableGovernanceReviewRow[] {
  const byId = new Map(variables.map((variable) => [variable.id, variable]));
  const rows: VariableGovernanceReviewRow[] = [];

  for (const variable of variables) {
    if (!variable.aliasOf) {
      continue;
    }

    const target = byId.get(variable.aliasOf);

    if (!target) {
      rows.push(
        createRow({
          status: "blocked",
          category: "alias",
          label: "Broken alias",
          detail: `${variable.name} points to a missing variable id.`,
          recommendation:
            "Clear the alias or retarget it before publishing the token collection.",
          variableIds: [variable.id],
          variableNames: [variable.name],
          aliasPath: [variable.id, variable.aliasOf],
          action: "clear-alias",
          actionLabel: "Clear",
          metric: 1,
        }),
      );
      continue;
    }

    if (target.type !== variable.type) {
      rows.push(
        createRow({
          status: "blocked",
          category: "alias",
          label: "Alias type mismatch",
          detail: `${variable.name} is ${variable.type}, but aliases ${target.name} (${target.type}).`,
          recommendation:
            "Aliases should point to tokens of the same type so layer bindings resolve safely.",
          variableIds: [variable.id],
          variableNames: [variable.name, target.name],
          aliasPath: [variable.id, target.id],
          action: "clear-alias",
          actionLabel: "Clear",
          metric: 1,
        }),
      );
    }

    const cycle = getAliasCycle(variable, byId);

    if (cycle.length > 0) {
      rows.push(
        createRow({
          status: "blocked",
          category: "alias",
          label: "Alias cycle",
          detail: `${cycle.length} variables form a circular alias chain.`,
          recommendation:
            "Break the cycle so token resolution can produce deterministic mode values.",
          variableIds: cycle,
          variableNames: getVariableNames(cycle, byId),
          aliasPath: cycle,
          action: "clear-alias",
          actionLabel: "Break",
          metric: cycle.length,
        }),
      );
      continue;
    }

    const chain = getAliasChain(variable, byId);

    if (chain.length > 4) {
      rows.push(
        createRow({
          status: "review",
          category: "alias",
          label: "Deep alias chain",
          detail: `${variable.name} resolves through ${chain.length - 1} alias hops.`,
          recommendation:
            "Flatten deep aliases before release so downstream token exports are easier to audit.",
          variableIds: chain,
          variableNames: getVariableNames(chain, byId),
          aliasPath: chain,
          action: "select-variable",
          actionLabel: "Review",
          metric: chain.length - 1,
        }),
      );
    }
  }

  return dedupeRows(rows);
}

function getModeCoverageRows(
  variables: DesignVariableDefinition[],
  modes: ReturnType<typeof getVariableModes>,
): VariableGovernanceReviewRow[] {
  const modeIds = modes.map((mode) => mode.id);
  const missing = variables.filter(
    (variable) =>
      !variable.aliasOf &&
      modeIds.some((modeId) => !String(variable.values[modeId] ?? "").trim()),
  );

  if (missing.length === 0) {
    return [];
  }

  const missingValueCount = missing.reduce(
    (total, variable) =>
      total +
      modeIds.filter((modeId) => !String(variable.values[modeId] ?? "").trim())
        .length,
    0,
  );

  return [
    createRow({
      status: missingValueCount > 8 ? "blocked" : "review",
      category: "coverage",
      label: "Mode value gaps",
      detail: `${missing.length} variables are missing ${missingValueCount} mode-specific values.`,
      recommendation:
        "Fill missing mode values from the active/default value before exporting CSS, Tailwind, Swift, or Android tokens.",
      variableIds: missing.map((variable) => variable.id),
      variableNames: missing.map((variable) => variable.name),
      modeIds,
      action: "fill-mode-values",
      actionLabel: "Fill",
      metric: missingValueCount,
    }),
  ];
}

function getCollectionRows(
  variables: DesignVariableDefinition[],
  collections: ReturnType<typeof getVariableCollections>,
) {
  const mismatches = variables.filter((variable) => {
    const collection = variable.collectionId
      ? collections[variable.collectionId]
      : undefined;

    return (
      !collection ||
      !getPreferredScopes(variable.type).includes(collection.scope)
    );
  });

  if (mismatches.length === 0) {
    return [];
  }

  return [
    createRow({
      status: mismatches.length > 10 ? "blocked" : "review",
      category: "collection",
      label: "Collection scope mismatch",
      detail: `${mismatches.length} variables are missing a collection or live in a scope that does not match their type.`,
      recommendation:
        "Move variables into matching paint, text, layout, or effect collections before publishing libraries.",
      variableIds: mismatches.map((variable) => variable.id),
      variableNames: mismatches.map((variable) => variable.name),
      collectionIds: mismatches
        .map((variable) => variable.collectionId)
        .filter((id): id is string => Boolean(id)),
      action: "move-collection",
      actionLabel: "Move",
      metric: mismatches.length,
    }),
  ];
}

function getDuplicateRows(variables: DesignVariableDefinition[]) {
  const groups = new Map<string, DesignVariableDefinition[]>();

  for (const variable of variables) {
    const key = `${variable.type}:${variable.name.trim().toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), variable]);
  }

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) =>
      createRow({
        status: "blocked",
        category: "duplicate",
        label: "Duplicate token names",
        detail: `${group.length} ${group[0]?.type ?? "token"} variables share the same export name.`,
        recommendation:
          "Rename duplicates before library release so generated token artifacts do not overwrite values.",
        variableIds: group.map((variable) => variable.id),
        variableNames: group.map((variable) => variable.name),
        action: "select-variable",
        actionLabel: "Review",
        metric: group.length,
      }),
    );
}

function getOrphanRows(
  variables: DesignVariableDefinition[],
  usage: VariableUsageFacts,
) {
  const orphaned = variables.filter((variable) => {
    const bindingCount = usage.bindingCountByVariableId.get(variable.id) ?? 0;
    const dependentCount = usage.aliasDependentsByVariableId.get(variable.id)?.length ?? 0;

    return bindingCount === 0 && dependentCount === 0 && !variable.aliasOf;
  });

  if (orphaned.length === 0) {
    return [];
  }

  return [
    createRow({
      status: orphaned.length > 16 ? "blocked" : "review",
      category: "orphan",
      label: "Orphaned variables",
      detail: `${orphaned.length} variables have no layer bindings and no alias dependents.`,
      recommendation:
        "Remove unused draft variables or bind them before publishing the library package.",
      variableIds: orphaned.map((variable) => variable.id),
      variableNames: orphaned.map((variable) => variable.name),
      action: "remove-orphans",
      actionLabel: "Remove",
      metric: orphaned.length,
    }),
  ];
}

function getVariableUsageFacts(
  document: DesignDocument,
  variables: DesignVariableDefinition[],
): VariableUsageFacts {
  const bindingCountByVariableId = new Map<string, number>();
  const aliasDependentsByVariableId = new Map<string, string[]>();
  const variableIds = new Set(variables.map((variable) => variable.id));

  for (const page of document.pages) {
    for (const layer of page.layers) {
      for (const variableId of getLayerBindingIds(layer)) {
        if (!variableIds.has(variableId)) {
          continue;
        }

        bindingCountByVariableId.set(
          variableId,
          (bindingCountByVariableId.get(variableId) ?? 0) + 1,
        );
      }
    }
  }

  for (const variable of variables) {
    if (!variable.aliasOf || !variableIds.has(variable.aliasOf)) {
      continue;
    }

    aliasDependentsByVariableId.set(variable.aliasOf, [
      ...(aliasDependentsByVariableId.get(variable.aliasOf) ?? []),
      variable.id,
    ]);
  }

  return { bindingCountByVariableId, aliasDependentsByVariableId };
}

function getLayerBindingIds(layer: DesignLayer) {
  return variableBindableProperties
    .map(({ property }) => layer.variableBindings?.[property])
    .filter((variableId): variableId is string => Boolean(variableId));
}

function getAliasCycle(
  variable: DesignVariableDefinition,
  byId: Map<string, DesignVariableDefinition>,
) {
  const seen = new Set<string>();
  let current: DesignVariableDefinition | undefined = variable;

  while (current?.aliasOf) {
    if (seen.has(current.id)) {
      return [...seen, current.id];
    }

    seen.add(current.id);
    current = byId.get(current.aliasOf);
  }

  return [];
}

function getAliasChain(
  variable: DesignVariableDefinition,
  byId: Map<string, DesignVariableDefinition>,
) {
  const chain = [variable.id];
  let current = variable;

  while (current.aliasOf) {
    const next = byId.get(current.aliasOf);

    if (!next || chain.includes(next.id)) {
      break;
    }

    chain.push(next.id);
    current = next;
  }

  return chain;
}

function getPreferredScopes(type: DesignVariableType): DesignVariableScope[] {
  if (type === "color") {
    return ["paint", "effect"];
  }

  if (type === "number") {
    return ["layout", "text", "effect"];
  }

  return ["text", "component", "prototype", "dev"];
}

function createRow(
  input: Omit<
    VariableGovernanceReviewRow,
    | "id"
    | "modeIds"
    | "collectionIds"
    | "aliasPath"
    | "repairable"
  > &
    Partial<Pick<VariableGovernanceReviewRow, "modeIds" | "collectionIds" | "aliasPath">>,
): VariableGovernanceReviewRow {
  return {
    id: `${input.category}:${input.label}:${input.variableIds.join("-")}`,
    modeIds: input.modeIds ?? [],
    collectionIds: input.collectionIds ?? [],
    aliasPath: input.aliasPath ?? [],
    repairable:
      input.action !== "select-variable" && input.status !== "ready",
    ...input,
  };
}

function getReadyRow(variableCount: number): VariableGovernanceReviewRow {
  return {
    id: "variable-governance-ready",
    status: "ready",
    category: "ready",
    label: "Variable governance ready",
    detail:
      "Modes, aliases, collections, usage, and export names are ready for library release.",
    recommendation:
      "Attach variable governance exports to design-system release handoffs.",
    variableIds: [],
    variableNames: [],
    modeIds: [],
    collectionIds: [],
    aliasPath: [],
    action: "select-variable",
    actionLabel: "Ready",
    repairable: false,
    metric: variableCount,
  };
}

function getVariableNames(
  variableIds: string[],
  byId: Map<string, DesignVariableDefinition>,
) {
  return variableIds
    .map((variableId) => byId.get(variableId)?.name ?? variableId)
    .slice(0, 12);
}

function getDuplicateValues(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const key = value.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

function dedupeRows(rows: VariableGovernanceReviewRow[]) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    if (seen.has(row.id)) {
      return false;
    }

    seen.add(row.id);
    return true;
  });
}
