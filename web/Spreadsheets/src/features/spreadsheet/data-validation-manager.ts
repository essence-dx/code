import { getValidationSourceLabel } from "@/features/spreadsheet/data-validation-sources";
import type { DataValidationIssue } from "@/features/spreadsheet/data-validation";
import type { DataValidationInput } from "@/features/spreadsheet/state/rule-state";
import type { DataValidationRule } from "@/features/workbooks/types";

export const dataValidationPresets: Array<{
  id: string;
  label: string;
  description: string;
  rule: DataValidationInput;
}> = [
  {
    id: "status-list",
    label: "Status list",
    description: "Inline dropdown",
    rule: {
      type: "list",
      value: "Open, In progress, Blocked, Done",
      listSource: "inline",
      inputMessage: "Choose a status.",
      errorMessage: "Select one of the approved statuses.",
      showInputMessage: true,
      showErrorAlert: true,
      errorStyle: "stop",
      ignoreBlank: true,
      circleInvalid: true,
    },
  },
  {
    id: "range-list",
    label: "Range list",
    description: "A1:A10 source",
    rule: {
      type: "list",
      value: "A1:A10",
      listSource: "range",
      inputMessage: "Choose a value from the source range.",
      errorMessage: "The value is not in the source range.",
      showInputMessage: true,
      showErrorAlert: true,
      errorStyle: "stop",
      ignoreBlank: true,
      circleInvalid: true,
    },
  },
  {
    id: "dependent-list",
    label: "Dependent list",
    description: "Parent-driven",
    rule: {
      type: "list",
      value:
        "Hardware: Laptop, Monitor, Keyboard; Software: License, Renewal, Support",
      listSource: "dependent",
      dependentCell: "A1",
      inputMessage: "Choose an option for the parent value.",
      errorMessage: "This option does not belong to the selected parent.",
      showInputMessage: true,
      showErrorAlert: true,
      errorStyle: "warning",
      ignoreBlank: true,
      circleInvalid: true,
    },
  },
  {
    id: "positive-number",
    label: "Positive",
    description: "Number greater than 0",
    rule: {
      type: "numberGreaterThan",
      value: "0",
      inputMessage: "Enter a positive number.",
      errorMessage: "The value must be greater than 0.",
      showInputMessage: true,
      showErrorAlert: true,
      errorStyle: "stop",
      ignoreBlank: true,
      circleInvalid: true,
    },
  },
  {
    id: "required",
    label: "Required",
    description: "No blanks",
    rule: {
      type: "notEmpty",
      value: "",
      inputMessage: "This cell is required.",
      errorMessage: "This cell cannot be blank.",
      showInputMessage: true,
      showErrorAlert: true,
      errorStyle: "stop",
      ignoreBlank: false,
      circleInvalid: true,
    },
  },
];

export function createDataValidationManagerRows({
  rules,
  issues,
}: {
  rules: DataValidationRule[];
  issues: DataValidationIssue[];
}) {
  const invalidCounts = issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.ruleId] = (counts[issue.ruleId] ?? 0) + 1;

    return counts;
  }, {});

  return rules.map((rule, index) => ({
    rule,
    priority: index + 1,
    sourceLabel: getValidationSourceLabel(rule),
    invalidCount: invalidCounts[rule.id] ?? 0,
    promptLabel:
      rule.showInputMessage === false
        ? "Prompt off"
        : rule.inputMessage
          ? "Prompt on"
          : "No prompt",
    alertLabel:
      rule.showErrorAlert === false
        ? "Alert off"
        : `${rule.errorStyle ?? "stop"} alert`,
    circleLabel: rule.circleInvalid === false ? "Circles off" : "Circles on",
  }));
}
