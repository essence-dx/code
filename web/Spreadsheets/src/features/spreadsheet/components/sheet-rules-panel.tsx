"use client";

import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Copy,
  Crosshair,
  Maximize2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  conditionalFormatPresets,
  createConditionalFormatManagerRows,
} from "@/features/spreadsheet/conditional-format-manager";
import { ConditionalFormatVisualOptionsControl } from "@/features/spreadsheet/components/conditional-format-visual-options-control";
import { getPivotConditionalFormatScopeLabel } from "@/features/spreadsheet/pivot/pivot-conditional-formatting";
import {
  createDataValidationManagerRows,
  dataValidationPresets,
} from "@/features/spreadsheet/data-validation-manager";
import type { DataValidationIssue } from "@/features/spreadsheet/data-validation";
import type {
  ConditionalFormatInput,
  ConditionalFormatVisualOptionsUpdate,
  DataValidationInput,
} from "@/features/spreadsheet/state/rule-state";
import { FilterPresetsPanel } from "@/features/spreadsheet/components/filter-presets-panel";
import { columnLabel } from "@/features/workbooks/addresses";
import type {
  ConditionalFormatRule,
  DataValidationRule,
  SheetFilterPreset,
  SheetFilterCondition,
  SheetFilterRule,
} from "@/features/workbooks/types";

const conditionalOperatorLabels: Record<
  ConditionalFormatRule["operator"],
  string
> = {
  greaterThan: ">",
  lessThan: "<",
  contains: "contains",
  notEmpty: "not empty",
  duplicate: "duplicate values",
  topValues: "top",
  bottomValues: "bottom",
  colorScale: "color scale",
  dataBar: "data bars",
  iconSet: "icon set",
  formula: "formula",
};

const validationLabels: Record<DataValidationRule["type"], string> = {
  list: "list",
  numberGreaterThan: "number >",
  numberLessThan: "number <",
  dateAfter: "date after",
  dateBefore: "date before",
  textContains: "text contains",
  notEmpty: "not empty",
  customFormula: "custom formula",
};
const filterLabels: Record<SheetFilterRule["type"], string> = {
  equals: "=",
  notEquals: "<>",
  contains: "contains",
  doesNotContain: "does not contain",
  oneOf: "selected values",
  cellColor: "cell color",
  fontColor: "font color",
  icon: "icon",
  startsWith: "starts with",
  endsWith: "ends with",
  empty: "empty",
  notEmpty: "not empty",
  greaterThan: ">",
  greaterThanOrEqual: ">=",
  lessThan: "<",
  lessThanOrEqual: "<=",
};

function formatRange(
  rule:
    | Pick<
        ConditionalFormatRule,
        "pivotTableScope" | "range" | "sourcePivotTableId"
      >
    | Pick<DataValidationRule, "range">,
) {
  const start = `${columnLabel(rule.range.startColumnIndex)}${rule.range.startRowIndex + 1}`;
  const end = `${columnLabel(rule.range.endColumnIndex)}${rule.range.endRowIndex + 1}`;
  const address = start === end ? start : `${start}:${end}`;

  if ("sourcePivotTableId" in rule && rule.sourcePivotTableId) {
    return `${getPivotConditionalFormatScopeLabel(rule.pivotTableScope)} (${address})`;
  }

  return address;
}

function formatConditionalRule(rule: ConditionalFormatRule) {
  if (
    rule.operator === "notEmpty" ||
    rule.operator === "duplicate" ||
    rule.operator === "colorScale" ||
    rule.operator === "dataBar" ||
    rule.operator === "iconSet"
  ) {
    return conditionalOperatorLabels[rule.operator];
  }

  return `${conditionalOperatorLabels[rule.operator]} ${rule.value}`;
}

function formatValidationRule(rule: DataValidationRule) {
  if (rule.type === "notEmpty") {
    return validationLabels[rule.type];
  }

  return `${validationLabels[rule.type]} ${rule.value}`;
}

function formatFilterCondition(condition: SheetFilterCondition) {
  if (condition.type === "notEmpty" || condition.type === "empty") {
    return filterLabels[condition.type];
  }

  if (condition.type === "oneOf") {
    const values = condition.values ?? [];

    return `selected ${values.length} value${values.length === 1 ? "" : "s"}`;
  }

  if (
    condition.type === "cellColor" ||
    condition.type === "fontColor" ||
    condition.type === "icon"
  ) {
    const values = condition.values ?? [];

    return `${filterLabels[condition.type]} ${values.length} selected`;
  }

  return `${filterLabels[condition.type]} ${condition.value}`;
}

function formatFilterRule(rule: SheetFilterRule) {
  if (rule.criteriaGroups && rule.criteriaGroups.length > 0) {
    const groups = rule.criteriaGroups.map((group) =>
      group.conditions
        .map((condition) => {
          const column = condition.headerName
            ? `${condition.headerName} (${columnLabel(condition.columnIndex)})`
            : columnLabel(condition.columnIndex);

          return `${column} ${formatFilterCondition(condition)}`;
        })
        .join(" AND "),
    );
    const preview =
      groups.length > 2
        ? `${groups.slice(0, 2).join(" OR ")} OR ...`
        : groups.join(" OR ");

    return `${groups.length} criteria row${groups.length === 1 ? "" : "s"}: ${preview}`;
  }

  const column = rule.headerName
    ? `${rule.headerName} (${columnLabel(rule.columnIndex)})`
    : columnLabel(rule.columnIndex);
  const conditions = rule.conditions ?? [];

  if (conditions.length > 0) {
    return `${column} ${conditions
      .map(formatFilterCondition)
      .join(rule.joiner === "or" ? " OR " : " AND ")}`;
  }

  if (rule.type === "notEmpty" || rule.type === "empty") {
    return `${column} ${filterLabels[rule.type]}`;
  }

  if (rule.type === "oneOf") {
    const values = rule.values ?? [];

    return `${column} selected ${values.length} value${values.length === 1 ? "" : "s"}`;
  }

  if (
    rule.type === "cellColor" ||
    rule.type === "fontColor" ||
    rule.type === "icon"
  ) {
    const values = rule.values ?? [];

    return `${column} ${filterLabels[rule.type]} ${values.length} selected`;
  }

  return `${column} ${filterLabels[rule.type]} ${rule.value}`;
}

function RuleActionButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          onClick={onClick}
        >
          {children}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function SheetRulesPanel({
  disabled,
  conditionalFormats,
  dataValidations,
  dataValidationIssues,
  filters,
  filterPresets,
  onApplyFilterPreset,
  onCreateConditionalFormatPreset,
  onCreateDataValidationPreset,
  onDeleteConditionalFormat,
  onDeleteDataValidation,
  onDeleteFilter,
  onDeleteFilterPreset,
  onDuplicateConditionalFormat,
  onMoveConditionalFormat,
  onReapplyFilters,
  onResizeConditionalFormatToSelection,
  onResizeDataValidationToSelection,
  onResizeFilterToSelection,
  onSelectConditionalFormat,
  onSelectDataValidation,
  onSelectFilter,
  onSaveFilterPreset,
  onUpdateConditionalFormatVisualOptions,
}: {
  disabled?: boolean;
  conditionalFormats: ConditionalFormatRule[];
  dataValidations: DataValidationRule[];
  dataValidationIssues: DataValidationIssue[];
  filters: SheetFilterRule[];
  filterPresets: SheetFilterPreset[];
  onApplyFilterPreset: (presetId: string) => string | null;
  onCreateConditionalFormatPreset: (rule: ConditionalFormatInput) => void;
  onCreateDataValidationPreset: (rule: DataValidationInput) => void;
  onDeleteConditionalFormat: (ruleId: string) => void;
  onDeleteDataValidation: (ruleId: string) => void;
  onDeleteFilter: (ruleId: string) => void;
  onDeleteFilterPreset: (presetId: string) => void;
  onDuplicateConditionalFormat: (ruleId: string) => void;
  onMoveConditionalFormat: (
    ruleId: string,
    direction: "up" | "down" | "top" | "bottom",
  ) => void;
  onReapplyFilters: () => void;
  onResizeConditionalFormatToSelection: (ruleId: string) => void;
  onResizeDataValidationToSelection: (ruleId: string) => void;
  onResizeFilterToSelection: (ruleId: string) => void;
  onSelectConditionalFormat: (rule: ConditionalFormatRule) => void;
  onSelectDataValidation: (rule: DataValidationRule) => void;
  onSelectFilter: (rule: SheetFilterRule) => void;
  onSaveFilterPreset: (name: string) => string | null;
  onUpdateConditionalFormatVisualOptions: (
    ruleId: string,
    updates: ConditionalFormatVisualOptionsUpdate,
  ) => void;
}) {
  const conditionalFormatRows =
    createConditionalFormatManagerRows(conditionalFormats);
  const dataValidationRows = createDataValidationManagerRows({
    rules: dataValidations,
    issues: dataValidationIssues,
  });

  return (
    <TooltipProvider>
      <div className="space-y-5">
      <section className="border-t pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Conditional formats</h2>
          <Badge variant="secondary" className="font-mono">
            {conditionalFormats.length}
          </Badge>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-1">
          {conditionalFormatPresets.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              size="sm"
              className="justify-start"
              disabled={disabled}
              onClick={() => onCreateConditionalFormatPreset(preset)}
            >
              <span
                className="size-3 rounded-sm border"
                style={{
                  background: preset.style.scale
                    ? `linear-gradient(135deg, ${preset.style.scale.minColor}, ${preset.style.scale.maxColor})`
                    : preset.style.background,
                }}
              />
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          {conditionalFormats.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No rules on this sheet.
            </p>
          ) : (
            conditionalFormatRows.map((row, index) => (
              <section
                key={row.rule.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border bg-card p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-4 rounded-sm border"
                      style={{
                        background: row.rule.style.scale
                          ? `linear-gradient(135deg, ${row.rule.style.scale.minColor}, ${row.rule.style.scale.maxColor})`
                          : row.rule.style.background,
                      }}
                    />
                    <h3 className="truncate text-sm font-medium">
                      {formatRange(row.rule)}
                    </h3>
                    <Badge variant="outline" className="font-mono">
                      #{row.priority}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {row.ruleTypeLabel}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary">
                      {formatConditionalRule(row.rule)}
                    </Badge>
                    {row.affectsEarlierRules > 0 ? (
                      <Badge variant="outline">
                        Overrides {row.affectsEarlierRules}
                      </Badge>
                    ) : null}
                    {row.affectedByLaterRules > 0 ? (
                      <Badge variant="outline">
                        Overridden by {row.affectedByLaterRules}
                      </Badge>
                    ) : null}
                  </div>
                  {row.rule.operator === "dataBar" ||
                  row.rule.operator === "iconSet" ? (
                    <ConditionalFormatVisualOptionsControl
                      disabled={disabled}
                      rule={row.rule}
                      onUpdate={onUpdateConditionalFormatVisualOptions}
                    />
                  ) : null}
                </div>
                <div className="flex max-w-32 shrink-0 flex-wrap justify-end gap-1">
                  <RuleActionButton
                    label="Select rule range"
                    disabled={disabled}
                    onClick={() => onSelectConditionalFormat(row.rule)}
                  >
                    <Crosshair />
                  </RuleActionButton>
                  <RuleActionButton
                    label="Use current selection"
                    disabled={disabled}
                    onClick={() => onResizeConditionalFormatToSelection(row.rule.id)}
                  >
                    <Maximize2 />
                  </RuleActionButton>
                  <RuleActionButton
                    label="Duplicate rule"
                    disabled={disabled}
                    onClick={() => onDuplicateConditionalFormat(row.rule.id)}
                  >
                    <Copy />
                  </RuleActionButton>
                  <RuleActionButton
                    label="Move rule to top"
                    disabled={disabled || index === 0}
                    onClick={() => onMoveConditionalFormat(row.rule.id, "top")}
                  >
                    <ArrowUpToLine />
                  </RuleActionButton>
                  <RuleActionButton
                    label="Move rule up"
                    disabled={disabled || index === 0}
                    onClick={() => onMoveConditionalFormat(row.rule.id, "up")}
                  >
                    <ArrowUp />
                  </RuleActionButton>
                  <RuleActionButton
                    label="Move rule down"
                    disabled={disabled || index === conditionalFormats.length - 1}
                    onClick={() => onMoveConditionalFormat(row.rule.id, "down")}
                  >
                    <ArrowDown />
                  </RuleActionButton>
                  <RuleActionButton
                    label="Move rule to bottom"
                    disabled={disabled || index === conditionalFormats.length - 1}
                    onClick={() => onMoveConditionalFormat(row.rule.id, "bottom")}
                  >
                    <ArrowDownToLine />
                  </RuleActionButton>
                  <ConfirmDestructiveButton
                    title="Delete this conditional format?"
                    description="This removes the formatting rule from the selected range. Cell values are kept."
                    label="Delete conditional format"
                    disabled={disabled}
                    onConfirm={() => onDeleteConditionalFormat(row.rule.id)}
                  >
                    <Trash2 />
                  </ConfirmDestructiveButton>
                </div>
              </section>
            ))
          )}
        </div>
      </section>
      <section className="border-t pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Filters</h2>
          <div className="flex items-center gap-1">
            <RuleActionButton
              label="Reapply filters"
              disabled={filters.length === 0}
              onClick={onReapplyFilters}
            >
              <RefreshCw />
            </RuleActionButton>
            <Badge variant="secondary" className="font-mono">
              {filters.length}
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          {filters.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No filters on this sheet.
            </p>
          ) : (
            filters.map((rule) => (
              <section
                key={rule.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border bg-card p-3"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium">
                    {formatRange(rule)}
                  </h3>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {formatFilterRule(rule)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <RuleActionButton
                    label="Select filter range"
                    disabled={disabled}
                    onClick={() => onSelectFilter(rule)}
                  >
                    <Crosshair />
                  </RuleActionButton>
                  <RuleActionButton
                    label="Use current selection"
                    disabled={disabled}
                    onClick={() => onResizeFilterToSelection(rule.id)}
                  >
                    <Maximize2 />
                  </RuleActionButton>
                  <ConfirmDestructiveButton
                    title="Delete this filter?"
                    description="This removes the saved filter rule and shows rows controlled by that filter again."
                    label="Delete filter"
                    disabled={disabled}
                    onConfirm={() => onDeleteFilter(rule.id)}
                  >
                    <Trash2 />
                  </ConfirmDestructiveButton>
                </div>
              </section>
            ))
          )}
        </div>
      </section>
      <FilterPresetsPanel
        disabled={disabled}
        filterCount={filters.length}
        presets={filterPresets}
        onApplyPreset={onApplyFilterPreset}
        onDeletePreset={onDeleteFilterPreset}
        onSavePreset={onSaveFilterPreset}
      />
      <section className="border-t pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Data validation</h2>
          <Badge variant="secondary" className="font-mono">
            {dataValidations.length}
          </Badge>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {dataValidationPresets.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              className="h-auto justify-start px-2 py-2 text-left"
              disabled={disabled}
              onClick={() => onCreateDataValidationPreset(preset.rule)}
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium">
                  {preset.label}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {preset.description}
                </span>
              </span>
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          {dataValidations.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No rules on this sheet.
            </p>
          ) : (
            dataValidationRows.map((row) => (
              <section
                key={row.rule.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border bg-card p-3"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      #{row.priority}
                    </Badge>
                    <h3 className="truncate text-sm font-medium">
                      {formatRange(row.rule)}
                    </h3>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {formatValidationRule(row.rule)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary">{row.sourceLabel}</Badge>
                    <Badge variant="secondary">{row.alertLabel}</Badge>
                    <Badge variant="secondary">{row.promptLabel}</Badge>
                    <Badge variant="secondary">{row.circleLabel}</Badge>
                    {row.invalidCount > 0 ? (
                      <Badge variant="destructive">
                        {row.invalidCount} invalid
                      </Badge>
                    ) : null}
                  </div>
                  {row.rule.inputMessage || row.rule.errorMessage ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {row.rule.errorMessage ?? row.rule.inputMessage}
                    </p>
                  ) : null}
                </div>
                <div className="flex max-w-24 shrink-0 flex-wrap justify-end gap-1">
                  <RuleActionButton
                    label="Select validation range"
                    disabled={disabled}
                    onClick={() => onSelectDataValidation(row.rule)}
                  >
                    <Crosshair />
                  </RuleActionButton>
                  <RuleActionButton
                    label="Use current selection"
                    disabled={disabled}
                    onClick={() =>
                      onResizeDataValidationToSelection(row.rule.id)
                    }
                  >
                    <Maximize2 />
                  </RuleActionButton>
                  <ConfirmDestructiveButton
                    title="Delete this data validation rule?"
                    description="This removes the validation rule from the range. Existing cell values are kept."
                    label="Delete data validation"
                    disabled={disabled}
                    onConfirm={() => onDeleteDataValidation(row.rule.id)}
                  >
                    <Trash2 />
                  </ConfirmDestructiveButton>
                </div>
              </section>
            ))
          )}
        </div>
      </section>
      </div>
    </TooltipProvider>
  );
}
