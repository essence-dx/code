import { matchesFormulaCondition } from "@/features/spreadsheet/conditional-formula";
import { parseComparableNumber } from "@/features/spreadsheet/value-parsing";
import { cellKey } from "@/features/workbooks/addresses";
import type {
  CellStyle,
  ConditionalFormatRule,
  SheetData,
} from "@/features/workbooks/types";

function duplicateKey(value: string) {
  return value.trim().toLocaleLowerCase();
}

function parseHexColor(value: string) {
  const normalized = value.trim().replace(/^#/, "");

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return null;
  }

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toHexChannel(value: number) {
  return Math.round(value).toString(16).padStart(2, "0");
}

function interpolateHexColor(minColor: string, maxColor: string, ratio: number) {
  const min = parseHexColor(minColor) ?? parseHexColor("#fee2e2");
  const max = parseHexColor(maxColor) ?? parseHexColor("#dcfce7");
  const clampedRatio = Math.min(Math.max(ratio, 0), 1);

  if (!min || !max) {
    return "#f1f5f9";
  }

  return `#${toHexChannel(min.red + (max.red - min.red) * clampedRatio)}${toHexChannel(
    min.green + (max.green - min.green) * clampedRatio,
  )}${toHexChannel(min.blue + (max.blue - min.blue) * clampedRatio)}`;
}

function normalizeThresholdRatio(
  ratio: number,
  thresholds: NonNullable<ConditionalFormatRule["style"]["scale"]>["thresholds"],
  fallback: { low: number; high: number },
) {
  const low = Math.min(Math.max((thresholds?.low ?? fallback.low) / 100, 0), 1);
  const high = Math.min(Math.max((thresholds?.high ?? fallback.high) / 100, 0), 1);
  const min = Math.min(low, high);
  const max = Math.max(low, high);

  if (max === min) {
    return ratio >= max ? 1 : 0;
  }

  return Math.min(Math.max((ratio - min) / (max - min), 0), 1);
}

function getColorScaleBounds({
  sheet,
  rule,
  computedValues,
}: {
  sheet: SheetData;
  rule: ConditionalFormatRule;
  computedValues: Record<string, string>;
}) {
  const values: number[] = [];
  const startRowIndex = Math.max(rule.range.startRowIndex, 0);
  const endRowIndex = Math.min(rule.range.endRowIndex, sheet.rowCount - 1);
  const startColumnIndex = Math.max(rule.range.startColumnIndex, 0);
  const endColumnIndex = Math.min(
    rule.range.endColumnIndex,
    sheet.columnCount - 1,
  );

  for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex += 1) {
    for (
      let columnIndex = startColumnIndex;
      columnIndex <= endColumnIndex;
      columnIndex += 1
    ) {
      const key = cellKey(rowIndex, columnIndex);
      const value = parseComparableNumber(
        computedValues[key] ?? sheet.cells[key]?.raw ?? "",
      );

      if (value !== null) {
        values.push(value);
      }
    }
  }

  if (values.length === 0) {
    return null;
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function getDuplicateValues({
  sheet,
  rule,
  computedValues,
}: {
  sheet: SheetData;
  rule: ConditionalFormatRule;
  computedValues: Record<string, string>;
}) {
  const counts = new Map<string, number>();
  const startRowIndex = Math.max(rule.range.startRowIndex, 0);
  const endRowIndex = Math.min(rule.range.endRowIndex, sheet.rowCount - 1);
  const startColumnIndex = Math.max(rule.range.startColumnIndex, 0);
  const endColumnIndex = Math.min(
    rule.range.endColumnIndex,
    sheet.columnCount - 1,
  );

  for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex += 1) {
    for (
      let columnIndex = startColumnIndex;
      columnIndex <= endColumnIndex;
      columnIndex += 1
    ) {
      const key = cellKey(rowIndex, columnIndex);
      const value = duplicateKey(
        computedValues[key] ?? sheet.cells[key]?.raw ?? "",
      );

      if (!value) {
        continue;
      }

      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([value]) => value),
  );
}

function getRankedKeys({
  sheet,
  rule,
  computedValues,
}: {
  sheet: SheetData;
  rule: ConditionalFormatRule;
  computedValues: Record<string, string>;
}) {
  const requestedCount = Math.floor(parseComparableNumber(rule.value) ?? 10);
  const count = Math.min(Math.max(requestedCount, 1), 100);
  const values: Array<{ key: string; value: number }> = [];
  const startRowIndex = Math.max(rule.range.startRowIndex, 0);
  const endRowIndex = Math.min(rule.range.endRowIndex, sheet.rowCount - 1);
  const startColumnIndex = Math.max(rule.range.startColumnIndex, 0);
  const endColumnIndex = Math.min(
    rule.range.endColumnIndex,
    sheet.columnCount - 1,
  );

  for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex += 1) {
    for (
      let columnIndex = startColumnIndex;
      columnIndex <= endColumnIndex;
      columnIndex += 1
    ) {
      const key = cellKey(rowIndex, columnIndex);
      const value = parseComparableNumber(
        computedValues[key] ?? sheet.cells[key]?.raw ?? "",
      );

      if (value !== null) {
        values.push({ key, value });
      }
    }
  }

  values.sort((left, right) =>
    rule.operator === "topValues"
      ? right.value - left.value
      : left.value - right.value,
  );

  return new Set(values.slice(0, count).map((item) => item.key));
}

function matchesRule(
  key: string,
  value: string,
  rule: ConditionalFormatRule,
  options: {
    duplicateValues?: Set<string>;
    rankedKeys?: Set<string>;
  } = {},
) {
  const trimmedValue = value.trim();

  if (rule.operator === "duplicate") {
    return options.duplicateValues?.has(duplicateKey(trimmedValue)) ?? false;
  }

  if (rule.operator === "topValues" || rule.operator === "bottomValues") {
    return options.rankedKeys?.has(key) ?? false;
  }

  if (rule.operator === "notEmpty") {
    return trimmedValue.length > 0;
  }

  if (rule.operator === "formula") {
    return false;
  }

  if (rule.operator === "contains") {
    const needle = rule.value.trim().toLocaleLowerCase();

    return needle.length > 0 && trimmedValue.toLocaleLowerCase().includes(needle);
  }

  const cellNumber = parseComparableNumber(trimmedValue);
  const ruleNumber = parseComparableNumber(rule.value);

  if (cellNumber === null || ruleNumber === null) {
    return false;
  }

  return rule.operator === "greaterThan"
    ? cellNumber > ruleNumber
    : cellNumber < ruleNumber;
}

export function getConditionalCellStyles({
  sheet,
  rules,
  computedValues,
}: {
  sheet: SheetData;
  rules: ConditionalFormatRule[];
  computedValues: Record<string, string>;
}) {
  const styles: Record<string, CellStyle> = {};

  for (const rule of rules) {
    const startRowIndex = Math.max(rule.range.startRowIndex, 0);
    const endRowIndex = Math.min(rule.range.endRowIndex, sheet.rowCount - 1);
    const startColumnIndex = Math.max(rule.range.startColumnIndex, 0);
    const endColumnIndex = Math.min(
      rule.range.endColumnIndex,
      sheet.columnCount - 1,
    );
    const duplicateValues =
      rule.operator === "duplicate"
        ? getDuplicateValues({ sheet, rule, computedValues })
        : undefined;
    const rankedKeys =
      rule.operator === "topValues" || rule.operator === "bottomValues"
        ? getRankedKeys({ sheet, rule, computedValues })
        : undefined;
    const colorScaleBounds =
      rule.operator === "colorScale" ||
      rule.operator === "dataBar" ||
      rule.operator === "iconSet"
        ? getColorScaleBounds({ sheet, rule, computedValues })
        : null;

    for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex += 1) {
      for (
        let columnIndex = startColumnIndex;
        columnIndex <= endColumnIndex;
        columnIndex += 1
      ) {
        const key = cellKey(rowIndex, columnIndex);
        const value = computedValues[key] ?? sheet.cells[key]?.raw ?? "";

        if (
          rule.operator === "colorScale" ||
          rule.operator === "dataBar" ||
          rule.operator === "iconSet"
        ) {
          const numericValue = parseComparableNumber(value);

          if (numericValue !== null && colorScaleBounds) {
            const ratio =
              colorScaleBounds.max === colorScaleBounds.min
                ? 1
                : (numericValue - colorScaleBounds.min) /
                  (colorScaleBounds.max - colorScaleBounds.min);

            const trackColor = rule.style.scale?.minColor ?? "transparent";
            const barColor = rule.style.scale?.maxColor ?? "#dbeafe";
            const dataBarRatio =
              rule.operator === "dataBar"
                ? normalizeThresholdRatio(
                    ratio,
                    rule.style.scale?.thresholds,
                    { low: 0, high: 100 },
                  )
                : ratio;
            const percentage = Math.round(dataBarRatio * 100);

            styles[key] =
              rule.operator === "dataBar"
                ? {
                    ...styles[key],
                    background: `linear-gradient(90deg, ${barColor} ${percentage}%, ${trackColor} ${percentage}%)`,
                    foreground: rule.style.foreground ?? "#111827",
                  }
                : rule.operator === "iconSet"
                  ? {
                      ...styles[key],
                      indicator: {
                        direction:
                          ratio >=
                          (rule.style.scale?.thresholds?.high ?? 67) / 100
                            ? "up"
                            : ratio >=
                                (rule.style.scale?.thresholds?.low ?? 34) / 100
                              ? "flat"
                              : "down",
                        color: barColor,
                      },
                    }
                : {
                    ...styles[key],
                    background: interpolateHexColor(
                      rule.style.scale?.minColor ?? "#fee2e2",
                      rule.style.scale?.maxColor ?? "#dcfce7",
                      ratio,
                    ),
                    foreground: rule.style.foreground ?? "#111827",
                  };
          }

          continue;
        }

        if (rule.operator === "formula") {
          if (matchesFormulaCondition({
            formula: rule.value,
            rowOffset: rowIndex - startRowIndex,
            columnOffset: columnIndex - startColumnIndex,
            sheet,
            computedValues,
            rowIndex,
            columnIndexValue: columnIndex,
          })) {
            styles[key] = {
              ...styles[key],
              ...rule.style,
            };
          }

          continue;
        }

        if (matchesRule(key, value, rule, { duplicateValues, rankedKeys })) {
          styles[key] = {
            ...styles[key],
            ...rule.style,
          };
        }
      }
    }
  }

  return styles;
}
