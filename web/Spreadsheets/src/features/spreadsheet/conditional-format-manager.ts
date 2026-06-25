import type { ConditionalFormatInput } from "@/features/spreadsheet/state/rule-state";
import { getPivotConditionalFormatScopeLabel } from "@/features/spreadsheet/pivot/pivot-conditional-formatting";
import type {
  ConditionalFormatRule,
  ChartRange,
} from "@/features/workbooks/types";

export type ConditionalFormatPreset = ConditionalFormatInput & {
  id: string;
  label: string;
};

export type ConditionalFormatManagerRow = {
  affectedByLaterRules: number;
  affectsEarlierRules: number;
  priority: number;
  rule: ConditionalFormatRule;
  ruleTypeLabel: string;
};

export const conditionalFormatPresets: ConditionalFormatPreset[] = [
  {
    id: "color-scale",
    label: "Color scale",
    operator: "colorScale",
    value: "",
    style: {
      foreground: "#111827",
      scale: {
        minColor: "#fee2e2",
        maxColor: "#dcfce7",
      },
    },
  },
  {
    id: "data-bar",
    label: "Data bars",
    operator: "dataBar",
    value: "",
    style: {
      foreground: "#111827",
      scale: {
        minColor: "#dbeafe",
        maxColor: "#60a5fa",
        thresholds: {
          low: 0,
          high: 100,
        },
      },
    },
  },
  {
    id: "icon-set",
    label: "Icon set",
    operator: "iconSet",
    value: "",
    style: {
      foreground: "#111827",
      scale: {
        minColor: "#dbeafe",
        maxColor: "#22c55e",
        thresholds: {
          low: 34,
          high: 67,
        },
      },
    },
  },
  {
    id: "duplicates",
    label: "Duplicates",
    operator: "duplicate",
    value: "",
    style: {
      background: "#fee2e2",
      bold: true,
      foreground: "#7f1d1d",
    },
  },
  {
    id: "top-10",
    label: "Top 10",
    operator: "topValues",
    value: "10",
    style: {
      background: "#dcfce7",
      bold: true,
      foreground: "#14532d",
    },
  },
  {
    id: "bottom-10",
    label: "Bottom 10",
    operator: "bottomValues",
    value: "10",
    style: {
      background: "#fef3c7",
      bold: true,
      foreground: "#713f12",
    },
  },
];

function rangesOverlap(left: ChartRange, right: ChartRange) {
  return (
    left.startRowIndex <= right.endRowIndex &&
    left.endRowIndex >= right.startRowIndex &&
    left.startColumnIndex <= right.endColumnIndex &&
    left.endColumnIndex >= right.startColumnIndex
  );
}

function getRuleTypeLabel(rule: ConditionalFormatRule) {
  if (rule.operator === "dataBar") {
    return "Data bars";
  }

  if (rule.operator === "iconSet") {
    return "Icon set";
  }

  if (rule.operator === "colorScale") {
    return "Color scale";
  }

  if (rule.operator === "topValues") {
    return `Top ${rule.value || 10}`;
  }

  if (rule.operator === "bottomValues") {
    return `Bottom ${rule.value || 10}`;
  }

  if (rule.operator === "duplicate") {
    return "Duplicates";
  }

  if (rule.operator === "notEmpty") {
    return "Not empty";
  }

  if (rule.operator === "greaterThan") {
    return `Greater than ${rule.value}`;
  }

  if (rule.operator === "lessThan") {
    return `Less than ${rule.value}`;
  }

  if (rule.operator === "contains") {
    return `Contains ${rule.value}`;
  }

  return `Formula ${rule.value}`;
}

export function createConditionalFormatManagerRows(
  rules: ConditionalFormatRule[],
): ConditionalFormatManagerRow[] {
  return rules.map((rule, index) => {
    const earlierRules = rules.slice(0, index);
    const laterRules = rules.slice(index + 1);

    return {
      affectedByLaterRules: laterRules.filter((otherRule) =>
        rangesOverlap(rule.range, otherRule.range),
      ).length,
      affectsEarlierRules: earlierRules.filter((otherRule) =>
        rangesOverlap(rule.range, otherRule.range),
      ).length,
      priority: index + 1,
      rule,
      ruleTypeLabel: rule.sourcePivotTableId
        ? `${getPivotConditionalFormatScopeLabel(rule.pivotTableScope)} - ${getRuleTypeLabel(rule)}`
        : getRuleTypeLabel(rule),
    };
  });
}
