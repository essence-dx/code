import { cellKey } from "@/features/workbooks/addresses";
import type { SheetData } from "@/features/workbooks/types";

export type StyleCriterion = "cellColor" | "fontColor" | "icon";

export type StyleCriterionOption = {
  count: number;
  label: string;
  value: string;
  color?: string;
};

export type StyleCriterionOptions = Record<
  StyleCriterion,
  StyleCriterionOption[]
>;

const emptyStyleLabels: Record<StyleCriterion, string> = {
  cellColor: "No fill",
  fontColor: "No font color",
  icon: "No icon",
};

export function getCellStyleCriterionValue(
  sheet: SheetData,
  rowIndex: number,
  columnIndex: number,
  criterion: StyleCriterion,
) {
  const style = sheet.cells[cellKey(rowIndex, columnIndex)]?.style;

  if (criterion === "cellColor") {
    return style?.background ?? "";
  }

  if (criterion === "fontColor") {
    return style?.foreground ?? "";
  }

  return style?.indicator
    ? `${style.indicator.direction}:${style.indicator.color}`
    : "";
}

function getStyleCriterionOption(
  criterion: StyleCriterion,
  value: string,
  count: number,
): StyleCriterionOption {
  if (!value) {
    return {
      count,
      label: emptyStyleLabels[criterion],
      value,
    };
  }

  if (criterion === "icon") {
    const [direction, color] = value.split(":");

    return {
      count,
      label: `${direction || "Icon"} icon ${color ?? ""}`.trim(),
      value,
      color,
    };
  }

  return {
    count,
    label: value,
    value,
    color: value,
  };
}

export function getStyleCriterionOptions({
  sheet,
  range,
  columnIndex,
  criterion,
}: {
  sheet: SheetData;
  range: {
    startRowIndex: number;
    endRowIndex: number;
  };
  columnIndex: number;
  criterion: StyleCriterion;
}) {
  const counts = new Map<string, number>();

  for (
    let rowIndex = range.startRowIndex + 1;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    const value = getCellStyleCriterionValue(
      sheet,
      rowIndex,
      columnIndex,
      criterion,
    );

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([left], [right]) =>
      left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    )
    .map(([value, count]) =>
      getStyleCriterionOption(criterion, value, count),
    );
}

export function getStyleCriterionOptionsByColumn({
  sheet,
  range,
}: {
  sheet: SheetData;
  range: {
    startRowIndex: number;
    startColumnIndex: number;
    endRowIndex: number;
    endColumnIndex: number;
  };
}) {
  const optionsByColumn: Record<number, StyleCriterionOptions> = {};

  for (
    let columnIndex = range.startColumnIndex;
    columnIndex <= range.endColumnIndex;
    columnIndex += 1
  ) {
    optionsByColumn[columnIndex] = {
      cellColor: getStyleCriterionOptions({
        sheet,
        range,
        columnIndex,
        criterion: "cellColor",
      }),
      fontColor: getStyleCriterionOptions({
        sheet,
        range,
        columnIndex,
        criterion: "fontColor",
      }),
      icon: getStyleCriterionOptions({
        sheet,
        range,
        columnIndex,
        criterion: "icon",
      }),
    };
  }

  return optionsByColumn;
}
