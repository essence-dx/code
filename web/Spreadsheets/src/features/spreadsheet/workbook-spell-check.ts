import { parseCellKey } from "@/features/workbooks/addresses";
import type {
  ChartRange,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type WorkbookSpellCheckIssueKind =
  | "misspelling"
  | "repeatedWord"
  | "spacing";

export type WorkbookSpellCheckIssue = {
  id: string;
  title: string;
  details: string;
  kind: WorkbookSpellCheckIssueKind;
  sheetId: string;
  sheetName: string;
  cellKey: string;
  range: ChartRange;
  word?: string;
  suggestion?: string;
  preview: string;
};

const MAX_SPELL_CHECK_ISSUES = 150;
const WORD_PATTERN = /[A-Za-z][A-Za-z'-]*/g;
const URL_PATTERN = /\b(?:https?:\/\/|www\.|mailto:|tel:)\S+/gi;
const EMAIL_PATTERN = /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g;
const MULTIPLE_SPACES_PATTERN = /(?:^ {2,}| {2,}$|[A-Za-z)] {2,}[A-Za-z(])/;

const COMMON_MISSPELLINGS: Record<string, string> = {
  accomodate: "accommodate",
  acheive: "achieve",
  adress: "address",
  alot: "a lot",
  arguement: "argument",
  begining: "beginning",
  beleive: "believe",
  benifit: "benefit",
  buisness: "business",
  calender: "calendar",
  comming: "coming",
  comittee: "committee",
  concensus: "consensus",
  definately: "definitely",
  dependancy: "dependency",
  enviroment: "environment",
  existance: "existence",
  febuary: "February",
  finaly: "finally",
  foriegn: "foreign",
  foward: "forward",
  goverment: "government",
  guarentee: "guarantee",
  happend: "happened",
  immediatly: "immediately",
  independant: "independent",
  maintainance: "maintenance",
  managment: "management",
  neccessary: "necessary",
  occured: "occurred",
  occurence: "occurrence",
  oportunity: "opportunity",
  recieve: "receive",
  recieved: "received",
  reciept: "receipt",
  refered: "referred",
  responsiblity: "responsibility",
  seperate: "separate",
  sucess: "success",
  sucessful: "successful",
  teh: "the",
  thier: "their",
  tommorow: "tomorrow",
  untill: "until",
  wich: "which",
  wierd: "weird",
  writting: "writing",
};

function cellRange(rowIndex: number, columnIndex: number): ChartRange {
  return {
    startRowIndex: rowIndex,
    startColumnIndex: columnIndex,
    endRowIndex: rowIndex,
    endColumnIndex: columnIndex,
  };
}

function getCellRange(sheet: SheetData, cellKey: string) {
  const position = parseCellKey(cellKey);

  if (
    !position ||
    position.rowIndex < 0 ||
    position.rowIndex >= sheet.rowCount ||
    position.columnIndex < 0 ||
    position.columnIndex >= sheet.columnCount
  ) {
    return null;
  }

  return cellRange(position.rowIndex, position.columnIndex);
}

function cleanText(value: string) {
  return value.replace(URL_PATTERN, " ").replace(EMAIL_PATTERN, " ");
}

function normalizeWord(value: string) {
  return value.toLowerCase().replace(/^'+|'+$/g, "");
}

function createPreview(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length > 100
    ? `${normalized.slice(0, 97).trimEnd()}...`
    : normalized;
}

function shouldCheckCell(raw: string) {
  const trimmed = raw.trim();

  return trimmed.length > 0 && !trimmed.startsWith("=") && /[A-Za-z]/.test(raw);
}

function addIssue(
  issues: WorkbookSpellCheckIssue[],
  issue: WorkbookSpellCheckIssue,
) {
  if (issues.length < MAX_SPELL_CHECK_ISSUES) {
    issues.push(issue);
  }
}

function addSpacingIssue(
  issues: WorkbookSpellCheckIssue[],
  sheet: SheetData,
  cellKey: string,
  range: ChartRange,
  raw: string,
) {
  if (!MULTIPLE_SPACES_PATTERN.test(raw)) {
    return;
  }

  addIssue(issues, {
    id: `spell:spacing:${sheet.id}:${cellKey}`,
    title: "Spacing needs review",
    details: "This text cell has leading, trailing, or repeated spaces.",
    kind: "spacing",
    sheetId: sheet.id,
    sheetName: sheet.name,
    cellKey,
    range,
    preview: createPreview(raw),
  });
}

function addMisspellingIssues(
  issues: WorkbookSpellCheckIssue[],
  sheet: SheetData,
  cellKey: string,
  range: ChartRange,
  raw: string,
) {
  const seenWords = new Set<string>();

  for (const match of cleanText(raw).matchAll(WORD_PATTERN)) {
    const word = match[0];
    const normalized = normalizeWord(word);
    const suggestion = COMMON_MISSPELLINGS[normalized];

    if (!suggestion || seenWords.has(normalized)) {
      continue;
    }

    seenWords.add(normalized);
    addIssue(issues, {
      id: `spell:misspelling:${sheet.id}:${cellKey}:${normalized}`,
      title: `Possible misspelling in ${cellKey}`,
      details: `Review "${word}" and consider "${suggestion}".`,
      kind: "misspelling",
      sheetId: sheet.id,
      sheetName: sheet.name,
      cellKey,
      range,
      word,
      suggestion,
      preview: createPreview(raw),
    });
  }
}

function addRepeatedWordIssues(
  issues: WorkbookSpellCheckIssue[],
  sheet: SheetData,
  cellKey: string,
  range: ChartRange,
  raw: string,
) {
  let previousWord: string | null = null;
  let previousOriginalWord: string | null = null;
  let repeatedIndex = 0;

  for (const match of cleanText(raw).matchAll(WORD_PATTERN)) {
    const word = match[0];
    const normalized = normalizeWord(word);

    if (normalized.length < 2) {
      previousWord = null;
      previousOriginalWord = null;
      continue;
    }

    if (previousWord === normalized && previousOriginalWord) {
      addIssue(issues, {
        id: `spell:repeated:${sheet.id}:${cellKey}:${normalized}:${repeatedIndex}`,
        title: `Repeated word in ${cellKey}`,
        details: `Review the repeated "${previousOriginalWord} ${word}" text.`,
        kind: "repeatedWord",
        sheetId: sheet.id,
        sheetName: sheet.name,
        cellKey,
        range,
        word,
        preview: createPreview(raw),
      });
      repeatedIndex += 1;
    }

    previousWord = normalized;
    previousOriginalWord = word;
  }
}

export function getWorkbookSpellCheckIssues(document: WorkbookDocument) {
  const issues: WorkbookSpellCheckIssue[] = [];

  for (const sheet of document.sheets) {
    for (const [cellKey, cell] of Object.entries(sheet.cells)) {
      if (issues.length >= MAX_SPELL_CHECK_ISSUES) {
        return issues;
      }

      if (!shouldCheckCell(cell.raw)) {
        continue;
      }

      const range = getCellRange(sheet, cellKey);

      if (!range) {
        continue;
      }

      addMisspellingIssues(issues, sheet, cellKey, range, cell.raw);
      addRepeatedWordIssues(issues, sheet, cellKey, range, cell.raw);
      addSpacingIssue(issues, sheet, cellKey, range, cell.raw);
    }
  }

  return issues;
}
