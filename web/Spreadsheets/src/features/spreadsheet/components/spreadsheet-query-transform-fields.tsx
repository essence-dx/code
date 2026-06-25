"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ImportConnectorAggregate,
  ImportConnectorDataType,
  ImportConnectorFilterMode,
  ImportConnectorTransformStep,
} from "@/features/workbooks/import-connector-transforms";

type ChoiceOption<T extends string> = {
  label: string;
  value: T;
};

const filterModeOptions: Array<ChoiceOption<ImportConnectorFilterMode>> = [
  { label: "Contains", value: "contains" },
  { label: "Equals", value: "equals" },
  { label: "Does not equal", value: "notEquals" },
  { label: "Starts with", value: "startsWith" },
  { label: "Ends with", value: "endsWith" },
  { label: "Greater than", value: "greaterThan" },
  { label: "Less than", value: "lessThan" },
  { label: "Is blank", value: "isBlank" },
  { label: "Is not blank", value: "isNotBlank" },
];

const dataTypeOptions: Array<ChoiceOption<ImportConnectorDataType>> = [
  { label: "Text", value: "text" },
  { label: "Number", value: "number" },
  { label: "Date", value: "date" },
  { label: "Boolean", value: "boolean" },
];

const aggregateOptions: Array<ChoiceOption<ImportConnectorAggregate>> = [
  { label: "Count", value: "count" },
  { label: "Sum", value: "sum" },
  { label: "Average", value: "average" },
  { label: "Minimum", value: "min" },
  { label: "Maximum", value: "max" },
  { label: "First value", value: "first" },
];

function getChoiceLabel<T extends string>(options: Array<ChoiceOption<T>>, value: T) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function ChoiceMenu<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<ChoiceOption<T>>;
  value: T;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 justify-between"
          aria-label={label}
        >
          {getChoiceLabel(options, value)}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onChange(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StepNumberInput({
  label,
  max = 250,
  min = 1,
  onChange,
  value,
}: {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      value={value}
      aria-label={label}
      className="h-8 text-xs"
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

function StepFieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[0.7rem] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function ColumnListInput({
  label,
  onChange,
  placeholder = "1,3-5",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1">
      <StepFieldLabel>{label}</StepFieldLabel>
      <Input
        value={value}
        placeholder={placeholder}
        aria-label={label}
        className="h-8 text-xs"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function StepFields({
  step,
  updateStep,
}: {
  step: ImportConnectorTransformStep;
  updateStep: (updates: Partial<ImportConnectorTransformStep>) => void;
}) {
  if (step.type === "removeTopRows") {
    return (
      <label className="grid gap-1">
        <StepFieldLabel>Rows to remove</StepFieldLabel>
        <StepNumberInput
          label="Rows to remove"
          max={500}
          value={step.count ?? 1}
          onChange={(count) => updateStep({ count })}
        />
      </label>
    );
  }

  if (step.type === "keepColumns" || step.type === "removeColumns") {
    return (
      <ColumnListInput
        label={step.type === "keepColumns" ? "Columns to keep" : "Columns to remove"}
        value={step.columns ?? ""}
        onChange={(columns) => updateStep({ columns })}
      />
    );
  }

  if (step.type === "filterContains" || step.type === "filterRows") {
    const mode = step.type === "filterContains" ? "contains" : step.mode ?? "contains";

    return (
      <div className="grid gap-1 sm:grid-cols-[5rem_9rem_1fr]">
        <label className="grid gap-1">
          <StepFieldLabel>Column</StepFieldLabel>
          <StepNumberInput
            label="Filter column"
            value={step.columnIndex ?? 1}
            onChange={(columnIndex) => updateStep({ columnIndex })}
          />
        </label>
        <label className="grid gap-1">
          <StepFieldLabel>Mode</StepFieldLabel>
          <ChoiceMenu
            label="Filter mode"
            options={filterModeOptions}
            value={mode}
            onChange={(nextMode) => updateStep({ mode: nextMode })}
          />
        </label>
        {mode === "isBlank" || mode === "isNotBlank" ? null : (
          <label className="grid gap-1">
            <StepFieldLabel>Value</StepFieldLabel>
            <Input
              value={step.value ?? ""}
              placeholder="Match value"
              aria-label="Filter value"
              className="h-8 text-xs"
              onChange={(event) => updateStep({ value: event.target.value })}
            />
          </label>
        )}
      </div>
    );
  }

  if (step.type === "splitColumn") {
    return (
      <div className="grid gap-1 sm:grid-cols-[5rem_1fr_5rem]">
        <label className="grid gap-1">
          <StepFieldLabel>Column</StepFieldLabel>
          <StepNumberInput
            label="Split column"
            value={step.columnIndex ?? 1}
            onChange={(columnIndex) => updateStep({ columnIndex })}
          />
        </label>
        <label className="grid gap-1">
          <StepFieldLabel>Delimiter</StepFieldLabel>
          <Input
            value={step.delimiter ?? ","}
            aria-label="Split delimiter"
            className="h-8 text-xs"
            onChange={(event) => updateStep({ delimiter: event.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <StepFieldLabel>Parts</StepFieldLabel>
          <StepNumberInput
            label="Split part count"
            max={20}
            value={step.count ?? 2}
            onChange={(count) => updateStep({ count })}
          />
        </label>
      </div>
    );
  }

  if (step.type === "changeType") {
    return (
      <div className="grid gap-1 sm:grid-cols-[5rem_9rem]">
        <label className="grid gap-1">
          <StepFieldLabel>Column</StepFieldLabel>
          <StepNumberInput
            label="Type column"
            value={step.columnIndex ?? 1}
            onChange={(columnIndex) => updateStep({ columnIndex })}
          />
        </label>
        <label className="grid gap-1">
          <StepFieldLabel>Type</StepFieldLabel>
          <ChoiceMenu
            label="Data type"
            options={dataTypeOptions}
            value={step.dataType ?? "text"}
            onChange={(dataType) => updateStep({ dataType })}
          />
        </label>
      </div>
    );
  }

  if (step.type === "groupBy") {
    return (
      <div className="grid gap-1 sm:grid-cols-[1fr_5rem_9rem]">
        <ColumnListInput
          label="Group columns"
          placeholder="1,2"
          value={step.columns ?? "1"}
          onChange={(columns) => updateStep({ columns })}
        />
        <label className="grid gap-1">
          <StepFieldLabel>Value</StepFieldLabel>
          <StepNumberInput
            label="Value column"
            value={step.columnIndex ?? 2}
            onChange={(columnIndex) => updateStep({ columnIndex })}
          />
        </label>
        <label className="grid gap-1">
          <StepFieldLabel>Aggregate</StepFieldLabel>
          <ChoiceMenu
            label="Aggregate"
            options={aggregateOptions}
            value={step.aggregate ?? "count"}
            onChange={(aggregate) => updateStep({ aggregate })}
          />
        </label>
      </div>
    );
  }

  if (step.type === "appendRows") {
    return (
      <div className="grid gap-1">
        <label className="grid gap-1 sm:max-w-28">
          <StepFieldLabel>Delimiter</StepFieldLabel>
          <Input
            value={step.delimiter ?? ","}
            aria-label="Append rows delimiter"
            className="h-8 text-xs"
            onChange={(event) => updateStep({ delimiter: event.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <StepFieldLabel>Rows to append</StepFieldLabel>
          <Textarea
            value={step.value ?? ""}
            aria-label="Rows to append"
            placeholder="A,B,C"
            className="min-h-24 text-xs"
            onChange={(event) => updateStep({ value: event.target.value })}
          />
        </label>
      </div>
    );
  }

  if (step.type === "mergeLookup") {
    return (
      <div className="grid gap-1">
        <div className="grid gap-1 sm:grid-cols-[5rem_5rem_1fr_5rem]">
          <label className="grid gap-1">
            <StepFieldLabel>Key</StepFieldLabel>
            <StepNumberInput
              label="Source key column"
              value={step.columnIndex ?? 1}
              onChange={(columnIndex) => updateStep({ columnIndex })}
            />
          </label>
          <label className="grid gap-1">
            <StepFieldLabel>Return</StepFieldLabel>
            <StepNumberInput
              label="Lookup return column"
              value={step.targetColumnIndex ?? 2}
              onChange={(targetColumnIndex) => updateStep({ targetColumnIndex })}
            />
          </label>
          <label className="grid gap-1">
            <StepFieldLabel>Output column</StepFieldLabel>
            <Input
              value={step.name ?? ""}
              aria-label="Lookup output column name"
              className="h-8 text-xs"
              onChange={(event) => updateStep({ name: event.target.value })}
            />
          </label>
          <label className="grid gap-1">
            <StepFieldLabel>Delimiter</StepFieldLabel>
            <Input
              value={step.delimiter ?? ","}
              aria-label="Lookup delimiter"
              className="h-8 text-xs"
              onChange={(event) => updateStep({ delimiter: event.target.value })}
            />
          </label>
        </div>
        <label className="grid gap-1">
          <StepFieldLabel>Lookup table</StepFieldLabel>
          <Textarea
            value={step.value ?? ""}
            aria-label="Lookup table"
            placeholder="Key,Value"
            className="min-h-24 text-xs"
            onChange={(event) => updateStep({ value: event.target.value })}
          />
        </label>
      </div>
    );
  }

  if (step.type === "unpivotColumns") {
    return (
      <div className="grid gap-1 sm:grid-cols-2">
        <ColumnListInput
          label="Key columns"
          placeholder="1,2"
          value={step.columns ?? "1"}
          onChange={(columns) => updateStep({ columns })}
        />
        <ColumnListInput
          label="Value columns"
          placeholder="Blank means all non-key columns"
          value={step.value ?? ""}
          onChange={(value) => updateStep({ value })}
        />
      </div>
    );
  }

  if (step.type === "pivotColumns") {
    return (
      <div className="grid gap-1 sm:grid-cols-[1fr_5rem_5rem_9rem]">
        <ColumnListInput
          label="Key columns"
          placeholder="1,2"
          value={step.columns ?? "1"}
          onChange={(columns) => updateStep({ columns })}
        />
        <label className="grid gap-1">
          <StepFieldLabel>Names</StepFieldLabel>
          <StepNumberInput
            label="Pivot name column"
            value={step.columnIndex ?? 2}
            onChange={(columnIndex) => updateStep({ columnIndex })}
          />
        </label>
        <label className="grid gap-1">
          <StepFieldLabel>Values</StepFieldLabel>
          <StepNumberInput
            label="Pivot value column"
            value={step.targetColumnIndex ?? 3}
            onChange={(targetColumnIndex) => updateStep({ targetColumnIndex })}
          />
        </label>
        <label className="grid gap-1">
          <StepFieldLabel>Aggregate</StepFieldLabel>
          <ChoiceMenu
            label="Pivot aggregate"
            options={aggregateOptions}
            value={step.aggregate ?? "sum"}
            onChange={(aggregate) => updateStep({ aggregate })}
          />
        </label>
      </div>
    );
  }

  if (step.type === "customColumn") {
    return (
      <div className="grid gap-1 sm:grid-cols-[10rem_1fr]">
        <label className="grid gap-1">
          <StepFieldLabel>Name</StepFieldLabel>
          <Input
            value={step.name ?? ""}
            aria-label="Custom column name"
            className="h-8 text-xs"
            onChange={(event) => updateStep({ name: event.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <StepFieldLabel>Template</StepFieldLabel>
          <Input
            value={step.value ?? ""}
            placeholder="{{1}} - {{Status}}"
            aria-label="Custom column template"
            className="h-8 text-xs"
            onChange={(event) => updateStep({ value: event.target.value })}
          />
        </label>
      </div>
    );
  }

  return null;
}
