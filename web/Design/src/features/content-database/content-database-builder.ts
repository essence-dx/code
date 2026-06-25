import type {
  ContentDatabaseBinding,
  ContentDatabaseCenter,
  ContentDatabaseInput,
  ContentDatabaseRecord,
  ContentDatabaseSourceRef,
  ContentDatabaseStatus,
  ContentDatabaseSurfaceCoverage,
  ContentTemplateSurface,
  DraftRecord,
  DraftState,
} from "@/features/content-database/content-database-types";
import {
  getSurfaceLabel,
  mergeStatus,
  normalizeContentValue,
  normalizeDedupeValue,
  normalizeVariableKey,
  recordKindOrder,
  slugify,
  sortSurfaces,
  surfaceDefinitions,
  trimText,
  uniqueSurfaces,
} from "@/features/content-database/content-database-utils";

export function createDraftState(): DraftState {
  return {
    records: new Map(),
    duplicateEvidence: 0,
  };
}

export function upsertRecord(
  state: DraftState,
  input: {
    kind: DraftRecord["kind"];
    label: string;
    variableKey: string;
    value: string | null | undefined;
    surfaces: ContentTemplateSurface[];
    status?: ContentDatabaseStatus;
    source: Omit<ContentDatabaseSourceRef, "surfaces">;
  },
) {
  const value = normalizeContentValue(input.value);

  if (!value) return;

  const variableKey = normalizeVariableKey(input.variableKey || input.label);
  const key = `${input.kind}:${variableKey}:${normalizeDedupeValue(value)}`;
  const source: ContentDatabaseSourceRef = {
    ...input.source,
    excerpt: trimText(input.source.excerpt || value, 220),
    surfaces: uniqueSurfaces(input.surfaces),
  };
  const existing = state.records.get(key);

  if (existing) {
    state.duplicateEvidence += 1;
    existing.sources.push(source);
    source.surfaces.forEach((surface) => existing.targetSurfaces.add(surface));
    existing.status = mergeStatus(existing.status, input.status ?? "ready");
    existing.label = existing.label || input.label;
    return;
  }

  state.records.set(key, {
    kind: input.kind,
    label: trimText(input.label, 80),
    variableKey,
    value,
    status: input.status ?? "ready",
    targetSurfaces: new Set(source.surfaces),
    sources: [source],
  });
}

export function finalizeRecords(records: Map<string, DraftRecord>) {
  const usedIds = new Map<string, number>();

  return Array.from(records.values())
    .sort((left, right) => {
      const kindDiff = recordKindOrder[left.kind] - recordKindOrder[right.kind];

      if (kindDiff !== 0) return kindDiff;

      return left.label.localeCompare(right.label);
    })
    .map((record) => {
      const baseId = `${record.kind}-${slugify(record.variableKey)}`;
      const count = usedIds.get(baseId) ?? 0;
      usedIds.set(baseId, count + 1);

      return {
        id: count ? `${baseId}-${count + 1}` : baseId,
        kind: record.kind,
        label: record.label,
        variableKey: record.variableKey,
        value: record.value,
        status: record.status,
        targetSurfaces: sortSurfaces([...record.targetSurfaces]),
        sources: record.sources,
      };
    });
}

export function createBindings(records: ContentDatabaseRecord[]) {
  const bindings: ContentDatabaseBinding[] = [];

  records.forEach((record) => {
    const groups = new Map<
      string,
      Omit<ContentDatabaseBinding, "id" | "usageCount"> & {
        usageCount: number;
      }
    >();

    record.sources.forEach((source) => {
      source.surfaces.forEach((surface) => {
        const key = `${record.id}:${surface}:${source.type}:${source.id}:${source.field}`;
        const existing = groups.get(key);

        if (existing) {
          existing.usageCount += 1;
          return;
        }

        groups.set(key, {
          recordId: record.id,
          variableKey: record.variableKey,
          surface,
          surfaceLabel: getSurfaceLabel(surface),
          sourceType: source.type,
          sourceId: source.id,
          sourceLabel: source.label,
          usageCount: 1,
        });
      });
    });

    bindings.push(
      ...Array.from(groups.values()).map((binding) => ({
        id: `${binding.recordId}-${binding.surface}-${slugify(binding.sourceType)}-${slugify(binding.sourceId)}-${slugify(binding.sourceLabel)}`,
        ...binding,
      })),
    );
  });

  return bindings.sort((left, right) =>
    `${left.surface}:${left.variableKey}`.localeCompare(
      `${right.surface}:${right.variableKey}`,
    ),
  );
}

export function createSurfaceCoverage(
  records: ContentDatabaseRecord[],
  bindings: ContentDatabaseBinding[],
): ContentDatabaseSurfaceCoverage[] {
  return surfaceDefinitions.map((definition) => {
    const recordCount = records.filter((record) =>
      record.targetSurfaces.includes(definition.surface),
    ).length;
    const bindingCount = bindings.filter(
      (binding) => binding.surface === definition.surface,
    ).length;
    const status: ContentDatabaseStatus =
      recordCount === 0 ? "blocked" : bindingCount < 2 ? "review" : "ready";

    return {
      ...definition,
      recordCount,
      bindingCount,
      status,
    };
  });
}

export function scoreCenter(input: {
  records: ContentDatabaseRecord[];
  surfaceCoverage: ContentDatabaseSurfaceCoverage[];
  sources: number;
}) {
  if (!input.records.length) return 0;

  const coveredSurfaces = input.surfaceCoverage.filter(
    (surface) => surface.recordCount > 0,
  ).length;
  const representedKinds = new Set(input.records.map((record) => record.kind))
    .size;
  const readyRatio =
    input.records.filter((record) => record.status === "ready").length /
    input.records.length;
  const sourceScore = Math.min(1, input.sources / 8);
  const score =
    (coveredSurfaces / surfaceDefinitions.length) * 45 +
    (representedKinds / 6) * 25 +
    readyRatio * 20 +
    sourceScore * 10;

  return Math.round(score);
}

export function scoreStatus(
  score: number,
  surfaceCoverage: ContentDatabaseSurfaceCoverage[],
  records: ContentDatabaseRecord[],
): ContentDatabaseStatus {
  if (
    !records.length ||
    surfaceCoverage.some((surface) => surface.status === "blocked")
  ) {
    return "blocked";
  }

  return score >= 85 && records.every((record) => record.status !== "blocked")
    ? "ready"
    : "review";
}

export function createNextActions(input: {
  surfaceCoverage: ContentDatabaseSurfaceCoverage[];
  records: ContentDatabaseRecord[];
  duplicateEvidence: number;
}) {
  const actions: string[] = [];
  const coveredSurfaces = input.surfaceCoverage.filter(
    (surface) => surface.recordCount > 0,
  );

  if (coveredSurfaces.length === surfaceDefinitions.length) {
    actions.push(
      "Content database can populate text, table, website, email, and social templates.",
    );
  } else {
    const missing = input.surfaceCoverage
      .filter((surface) => surface.recordCount === 0)
      .map((surface) => surface.label.toLowerCase());

    actions.push(`Add reusable source fields for ${missing.join(", ")}.`);
  }

  const reviewRecords = input.records.filter(
    (record) => record.status !== "ready",
  );

  if (reviewRecords.length) {
    actions.push(
      `Review ${reviewRecords.length} records before using them in locked templates.`,
    );
  }

  if (input.duplicateEvidence) {
    actions.push(
      `Merged ${input.duplicateEvidence} duplicate source values so templates reuse one record instead of copied text.`,
    );
  }

  if (!input.records.some((record) => record.kind === "pricing")) {
    actions.push(
      "Add pricing values so table and offer templates can bind live.",
    );
  }

  return actions;
}

export function createPacket(input: {
  generatedAt: string;
  status: ContentDatabaseStatus;
  score: number;
  records: ContentDatabaseRecord[];
  bindings: ContentDatabaseBinding[];
  surfaceCoverage: ContentDatabaseSurfaceCoverage[];
  nextActions: string[];
  totals: ContentDatabaseCenter["totals"];
}) {
  const payload = {
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    totals: input.totals,
    records: input.records,
    bindings: input.bindings,
    surfaceCoverage: input.surfaceCoverage,
    nextActions: input.nextActions,
  };

  return {
    fileName: "essence-content-database-center.json",
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2),
    )}`,
  };
}

export function countSources(records: ContentDatabaseRecord[]) {
  return new Set(
    records.flatMap((record) =>
      record.sources.map((source) => `${source.type}:${source.id}`),
    ),
  ).size;
}

export function createGeneratedAt(input: ContentDatabaseInput) {
  const timestamps = [
    ...input.brandColors.map((item) => item.updatedAt),
    ...input.brandFonts.map((item) => item.updatedAt),
    ...input.brandLogos.map((item) => item.updatedAt),
    ...input.templates.map((item) => item.updatedAt),
    ...input.projects.map((item) => item.updatedAt),
    ...input.campaigns.map((item) => item.updatedAt),
    ...input.contentScheduleItems.map((item) => item.updatedAt),
    ...input.websitePublishes.map((item) => item.updatedAt),
  ]
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  return new Date(
    timestamps.length ? Math.max(...timestamps) : Date.now(),
  ).toISOString();
}
