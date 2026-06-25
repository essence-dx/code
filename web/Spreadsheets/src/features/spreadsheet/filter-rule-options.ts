import type { SheetFilterRuleType } from "@/features/workbooks/types";

export type FilterRuleOption = {
  value: SheetFilterRuleType;
  label: string;
  placeholder: string;
  needsValue: boolean;
  usesValueList?: boolean;
  styleValueKind?: "cellColor" | "fontColor" | "icon";
};

export const defaultFilterOption: FilterRuleOption = {
  value: "contains",
  label: "Contains",
  placeholder: "north",
  needsValue: true,
};

export const filterOptions: FilterRuleOption[] = [
  defaultFilterOption,
  { value: "equals", label: "Equals", placeholder: "done", needsValue: true },
  {
    value: "notEquals",
    label: "Does not equal",
    placeholder: "done",
    needsValue: true,
  },
  {
    value: "oneOf",
    label: "Selected values",
    placeholder: "",
    needsValue: false,
    usesValueList: true,
  },
  {
    value: "cellColor",
    label: "Cell color",
    placeholder: "",
    needsValue: false,
    usesValueList: true,
    styleValueKind: "cellColor",
  },
  {
    value: "fontColor",
    label: "Font color",
    placeholder: "",
    needsValue: false,
    usesValueList: true,
    styleValueKind: "fontColor",
  },
  {
    value: "icon",
    label: "Icon",
    placeholder: "",
    needsValue: false,
    usesValueList: true,
    styleValueKind: "icon",
  },
  {
    value: "doesNotContain",
    label: "Does not contain",
    placeholder: "north",
    needsValue: true,
  },
  {
    value: "startsWith",
    label: "Starts with",
    placeholder: "INV-",
    needsValue: true,
  },
  {
    value: "endsWith",
    label: "Ends with",
    placeholder: "-BD",
    needsValue: true,
  },
  {
    value: "greaterThan",
    label: "Greater than",
    placeholder: "100",
    needsValue: true,
  },
  {
    value: "greaterThanOrEqual",
    label: "Greater than or equal",
    placeholder: "100",
    needsValue: true,
  },
  {
    value: "lessThan",
    label: "Less than",
    placeholder: "100",
    needsValue: true,
  },
  {
    value: "lessThanOrEqual",
    label: "Less than or equal",
    placeholder: "100",
    needsValue: true,
  },
  { value: "empty", label: "Empty", placeholder: "", needsValue: false },
  { value: "notEmpty", label: "Not empty", placeholder: "", needsValue: false },
];

export const secondaryFilterOptions = filterOptions.filter(
  (option) => !option.usesValueList,
);

export function getFilterOption(type: SheetFilterRuleType) {
  return (
    filterOptions.find((option) => option.value === type) ?? defaultFilterOption
  );
}
