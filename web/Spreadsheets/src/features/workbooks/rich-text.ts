import { cellFontFamilyToCss } from "@/features/workbooks/font-families";
import type {
  CellFontFamily,
  CellRichTextRun,
  CellStyle,
} from "@/features/workbooks/types";

const MAX_RICH_TEXT_RUNS = 100;
const MAX_RICH_TEXT_LENGTH = 5000;
const fontFamilies = new Set<CellFontFamily>([
  "arial",
  "calibri",
  "georgia",
  "times",
  "verdana",
  "mono",
]);

function normalizeFontFamily(value: unknown) {
  return typeof value === "string" && fontFamilies.has(value as CellFontFamily)
    ? (value as CellFontFamily)
    : undefined;
}

function normalizeFontSize(value: unknown) {
  const size = Number(value);

  return Number.isFinite(size)
    ? Math.min(Math.max(Math.round(size), 8), 72)
    : undefined;
}

function normalizeColor(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 80)
    : undefined;
}

function normalizeRun(value: unknown): CellRichTextRun | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<CellRichTextRun>;
  const text = typeof candidate.text === "string" ? candidate.text : "";

  if (!text) {
    return null;
  }

  return {
    text: text.slice(0, MAX_RICH_TEXT_LENGTH),
    ...(candidate.bold === true ? { bold: true } : {}),
    ...(candidate.italic === true ? { italic: true } : {}),
    ...(candidate.underline === true ? { underline: true } : {}),
    ...(candidate.strikethrough === true ? { strikethrough: true } : {}),
    ...(normalizeColor(candidate.foreground)
      ? { foreground: normalizeColor(candidate.foreground) }
      : {}),
    ...(normalizeFontFamily(candidate.fontFamily)
      ? { fontFamily: normalizeFontFamily(candidate.fontFamily) }
      : {}),
    ...(normalizeFontSize(candidate.fontSize)
      ? { fontSize: normalizeFontSize(candidate.fontSize) }
      : {}),
  };
}

export function normalizeCellRichTextRuns(
  value: unknown,
  fallbackText = "",
): CellRichTextRun[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const runs: CellRichTextRun[] = [];
  let totalLength = 0;

  for (const item of value) {
    const run = normalizeRun(item);

    if (!run) {
      continue;
    }

    const remainingLength = MAX_RICH_TEXT_LENGTH - totalLength;

    if (remainingLength <= 0) {
      break;
    }

    const text = run.text.slice(0, remainingLength);

    runs.push({
      ...run,
      text,
    });
    totalLength += text.length;

    if (runs.length >= MAX_RICH_TEXT_RUNS) {
      break;
    }
  }

  const expectedText = fallbackText.slice(0, MAX_RICH_TEXT_LENGTH);
  const runText = getCellRichTextPlainText(runs);

  return expectedText && runText && runText !== expectedText ? [] : runs;
}

export function getCellRichTextPlainText(runs: CellRichTextRun[]) {
  return runs.map((run) => run.text).join("");
}

export function createCellRichTextRunsFromStyle(
  text: string,
  style: CellStyle,
): CellRichTextRun[] {
  const normalizedText = text.slice(0, MAX_RICH_TEXT_LENGTH);

  if (!normalizedText) {
    return [];
  }

  const run: CellRichTextRun = {
    text: normalizedText,
    ...(style.bold ? { bold: true } : {}),
    ...(style.italic ? { italic: true } : {}),
    ...(style.underline ? { underline: true } : {}),
    ...(style.strikethrough ? { strikethrough: true } : {}),
    ...(style.foreground ? { foreground: style.foreground } : {}),
    ...(style.fontFamily ? { fontFamily: style.fontFamily } : {}),
    ...(style.fontSize ? { fontSize: style.fontSize } : {}),
  };

  return [run];
}

export function cellRichTextRunCss(run: CellRichTextRun) {
  return [
    run.bold ? "font-weight:700" : null,
    run.italic ? "font-style:italic" : null,
    run.underline || run.strikethrough
      ? `text-decoration:${[
          run.underline ? "underline" : null,
          run.strikethrough ? "line-through" : null,
        ]
          .filter(Boolean)
          .join(" ")}`
      : null,
    run.foreground ? `color:${run.foreground}` : null,
    run.fontFamily ? `font-family:${cellFontFamilyToCss(run.fontFamily)}` : null,
    run.fontSize ? `font-size:${run.fontSize}px` : null,
  ].filter(Boolean) as string[];
}

export function cellRichTextRunsToHtml(
  runs: CellRichTextRun[],
  escapeHtml: (value: string) => string,
) {
  return normalizeCellRichTextRuns(runs)
    .map((run) => {
      const css = cellRichTextRunCss(run);
      const style = css.length ? ` style="${escapeHtml(css.join(";"))}"` : "";

      return `<span data-ee-rich-run="true"${style}>${escapeHtml(run.text)}</span>`;
    })
    .join("");
}
