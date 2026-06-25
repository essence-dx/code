import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import { getActiveSheet } from "@/features/spreadsheet/state/document-state";
import { updateCellRaw } from "@/features/spreadsheet/state/edit-state";
import {
  forEachCellInRange,
  type CellRange,
} from "@/features/spreadsheet/state/selection-state";
import type {
  WhatIfScenario,
  WorkbookDocument,
} from "@/features/workbooks/types";

const maxScenarioCells = 32;

function normalizeScenarioName(
  name: string,
  existingScenarios: WhatIfScenario[],
) {
  const baseName =
    name.trim().replace(/\s+/g, " ").slice(0, 80) ||
    `Scenario ${existingScenarios.length + 1}`;
  const usedNames = new Set(
    existingScenarios.map((scenario) => scenario.name.toLowerCase()),
  );
  let candidate = baseName;
  let suffix = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    const suffixText = ` ${suffix}`;

    candidate = `${baseName.slice(0, 80 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  return candidate;
}

export function createWhatIfScenarioPlan({
  document,
  name,
  range,
}: {
  document: WorkbookDocument;
  name: string;
  range: CellRange;
}): { error: string; scenario?: never } | { error: null; scenario: WhatIfScenario } {
  const sheet = getActiveSheet(document);
  const area =
    (range.endRowIndex - range.startRowIndex + 1) *
    (range.endColumnIndex - range.startColumnIndex + 1);

  if (area > maxScenarioCells) {
    return {
      error: `Select ${maxScenarioCells} or fewer changing cells for a scenario.`,
    };
  }

  const values: WhatIfScenario["values"] = [];

  forEachCellInRange(range, (rowIndex, columnIndex) => {
    const key = cellKey(rowIndex, columnIndex);
    const raw = sheet.cells[key]?.raw ?? "";

    if (raw.trim().startsWith("=")) {
      return;
    }

    values.push({ cellKey: key, value: raw });
  });

  if (values.length === 0) {
    return {
      error: "Select at least one input cell. Formula cells are not scenario inputs.",
    };
  }

  const now = new Date().toISOString();
  const existingScenarios = (document.whatIfScenarios ?? []).filter(
    (scenario) => scenario.sheetId === document.activeSheetId,
  );

  return {
    error: null,
    scenario: {
      id: `scenario_${crypto.randomUUID()}`,
      sheetId: document.activeSheetId,
      name: normalizeScenarioName(name, existingScenarios),
      values,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export function addWhatIfScenarioToDocument(
  document: WorkbookDocument,
  scenario: WhatIfScenario,
) {
  document.whatIfScenarios ??= [];
  document.whatIfScenarios.push(scenario);
}

export function deleteWhatIfScenarioFromDocument(
  document: WorkbookDocument,
  scenarioId: string,
) {
  document.whatIfScenarios = (document.whatIfScenarios ?? []).filter(
    (scenario) =>
      scenario.id !== scenarioId || scenario.sheetId !== document.activeSheetId,
  );
}

export function applyWhatIfScenarioToDocument(
  document: WorkbookDocument,
  scenarioId: string,
) {
  const scenario = (document.whatIfScenarios ?? []).find(
    (item) => item.id === scenarioId && item.sheetId === document.activeSheetId,
  );

  if (!scenario) {
    return "Scenario was not found on this sheet.";
  }

  const sheet = getActiveSheet(document);

  scenario.values.forEach((value) => {
    const position = parseCellKey(value.cellKey);

    if (!position) {
      return;
    }

    updateCellRaw(sheet, position, value.value);
  });

  return null;
}
