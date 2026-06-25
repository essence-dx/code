import {
  countSources,
  createBindings,
  createDraftState,
  createGeneratedAt,
  createNextActions,
  createPacket,
  createSurfaceCoverage,
  finalizeRecords,
  scoreCenter,
  scoreStatus,
} from "@/features/content-database/content-database-builder";
import {
  collectBrandRecords,
  collectCampaignRecords,
  collectProjectRecords,
  collectScheduleRecords,
  collectTemplateRecords,
  collectWebsiteRecords,
} from "@/features/content-database/content-database-collectors";
import type {
  ContentDatabaseCenter,
  ContentDatabaseInput,
} from "@/features/content-database/content-database-types";

export type {
  ContentDatabaseBinding,
  ContentDatabaseCenter,
  ContentDatabaseInput,
  ContentDatabasePacket,
  ContentDatabaseRecord,
  ContentDatabaseRecordKind,
  ContentDatabaseSourceRef,
  ContentDatabaseStatus,
  ContentDatabaseSurfaceCoverage,
  ContentTemplateSurface,
} from "@/features/content-database/content-database-types";

export function createContentDatabaseCenter(
  input: ContentDatabaseInput,
): ContentDatabaseCenter {
  const state = createDraftState();

  collectBrandRecords(state, input);
  collectTemplateRecords(state, input);
  collectProjectRecords(state, input);
  collectCampaignRecords(state, input);
  collectScheduleRecords(state, input);
  collectWebsiteRecords(state, input);

  const records = finalizeRecords(state.records);
  const bindings = createBindings(records);
  const surfaceCoverage = createSurfaceCoverage(records, bindings);
  const sources = countSources(records);
  const score = scoreCenter({
    records,
    surfaceCoverage,
    sources,
  });
  const status = scoreStatus(score, surfaceCoverage, records);
  const generatedAt = input.generatedAt ?? createGeneratedAt(input);
  const nextActions = createNextActions({
    surfaceCoverage,
    records,
    duplicateEvidence: state.duplicateEvidence,
  });
  const totals = {
    records: records.length,
    readyRecords: records.filter((record) => record.status === "ready").length,
    reviewRecords: records.filter((record) => record.status === "review")
      .length,
    blockedRecords: records.filter((record) => record.status === "blocked")
      .length,
    variables: new Set(records.map((record) => record.variableKey)).size,
    bindings: bindings.length,
    sources,
    duplicateEvidence: state.duplicateEvidence,
  };
  const packet = createPacket({
    generatedAt,
    status,
    score,
    records,
    bindings,
    surfaceCoverage,
    nextActions,
    totals,
  });

  return {
    status,
    score,
    generatedAt,
    records,
    bindings,
    surfaceCoverage,
    packet,
    nextActions,
    totals,
  };
}
