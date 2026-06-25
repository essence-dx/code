"use client";

import { ArrowDown, ArrowUp, ChevronDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StepFields } from "@/features/spreadsheet/components/spreadsheet-query-transform-fields";
import type {
  ImportConnectorTransformStep,
  ImportConnectorTransformType,
} from "@/features/workbooks/import-connector-transforms";

type TransformOption = {
  description: string;
  label: string;
  type: ImportConnectorTransformType;
};

const transformOptions: TransformOption[] = [
  {
    description: "Trim whitespace from every imported cell.",
    label: "Trim cells",
    type: "trimCells",
  },
  {
    description: "Drop rows with no imported values.",
    label: "Remove empty rows",
    type: "removeEmptyRows",
  },
  {
    description: "Skip banner or report title rows before import.",
    label: "Remove top rows",
    type: "removeTopRows",
  },
  {
    description: "Keep only selected source columns.",
    label: "Keep columns",
    type: "keepColumns",
  },
  {
    description: "Remove selected source columns.",
    label: "Remove columns",
    type: "removeColumns",
  },
  {
    description: "Keep rows that match a column condition.",
    label: "Filter rows",
    type: "filterRows",
  },
  {
    description: "Split one source column into multiple columns.",
    label: "Split column",
    type: "splitColumn",
  },
  {
    description: "Normalize imported values as numbers, dates, or booleans.",
    label: "Change type",
    type: "changeType",
  },
  {
    description: "Summarize rows by one or more key columns.",
    label: "Group by",
    type: "groupBy",
  },
  {
    description: "Append pasted CSV or TSV rows to the imported table.",
    label: "Append rows",
    type: "appendRows",
  },
  {
    description: "Add a lookup value from a pasted key/value table.",
    label: "Merge lookup",
    type: "mergeLookup",
  },
  {
    description: "Turn wide columns into attribute/value rows.",
    label: "Unpivot columns",
    type: "unpivotColumns",
  },
  {
    description: "Turn attribute/value rows into a wide table.",
    label: "Pivot columns",
    type: "pivotColumns",
  },
  {
    description: "Append a template-based calculated text column.",
    label: "Custom column",
    type: "customColumn",
  },
];

function createTransformStep(type: ImportConnectorTransformType) {
  const baseStep = {
    id: `query_step_${crypto.randomUUID()}`,
    type,
    count: 1,
    columnIndex: 1,
    columns: "1",
    delimiter: ",",
    mode: "contains",
    targetColumnIndex: 2,
    value: "",
  } satisfies ImportConnectorTransformStep;

  if (type === "keepColumns") {
    return { ...baseStep, columns: "1-5" };
  }

  if (type === "splitColumn") {
    return { ...baseStep, count: 2 };
  }

  if (type === "changeType") {
    return { ...baseStep, dataType: "number" };
  }

  if (type === "groupBy") {
    return { ...baseStep, aggregate: "sum", columnIndex: 2 };
  }

  if (type === "mergeLookup") {
    return {
      ...baseStep,
      name: "Lookup value",
      value: "Key,Value\n",
    };
  }

  if (type === "pivotColumns") {
    return {
      ...baseStep,
      aggregate: "sum",
      columnIndex: 2,
      targetColumnIndex: 3,
    };
  }

  if (type === "customColumn") {
    return {
      ...baseStep,
      name: "Custom",
      value: "{{1}}",
    };
  }

  return baseStep;
}

function getStepLabel(type: ImportConnectorTransformType) {
  return transformOptions.find((option) => option.type === type)?.label ?? type;
}

function moveStep(
  steps: ImportConnectorTransformStep[],
  index: number,
  direction: -1 | 1,
) {
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= steps.length) {
    return steps;
  }

  const nextSteps = [...steps];
  const [step] = nextSteps.splice(index, 1);

  nextSteps.splice(targetIndex, 0, step);
  return nextSteps;
}

export function SpreadsheetQueryTransformEditor({
  steps,
  onChange,
}: {
  steps: ImportConnectorTransformStep[];
  onChange: (steps: ImportConnectorTransformStep[]) => void;
}) {
  function updateStep(
    stepId: string,
    updates: Partial<ImportConnectorTransformStep>,
  ) {
    onChange(
      steps.map((step) => (step.id === stepId ? { ...step, ...updates } : step)),
    );
  }

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium">Transform steps</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Plus />
              Add step
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {transformOptions.map((option) => (
              <DropdownMenuItem
                key={option.type}
                className="grid gap-0.5"
                onSelect={() => onChange([...steps, createTransformStep(option.type)])}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {steps.length === 0 ? (
        <p className="rounded-md border border-dashed bg-background p-2 text-xs text-muted-foreground">
          No transforms configured.
        </p>
      ) : (
        <div className="space-y-1">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="grid gap-2 rounded-md border bg-background p-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{getStepLabel(step.type)}</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0}
                    onClick={() => onChange(moveStep(steps, index, -1))}
                  >
                    <ArrowUp />
                    <span className="sr-only">Move step up</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === steps.length - 1}
                    onClick={() => onChange(moveStep(steps, index, 1))}
                  >
                    <ArrowDown />
                    <span className="sr-only">Move step down</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      onChange(steps.filter((item) => item.id !== step.id))
                    }
                  >
                    <X />
                    <span className="sr-only">Remove step</span>
                  </Button>
                </div>
              </div>
              <StepFields
                step={step}
                updateStep={(updates) => updateStep(step.id, updates)}
              />
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...steps,
            createTransformStep("trimCells"),
            createTransformStep("removeEmptyRows"),
          ])
        }
      >
        <Plus />
        Clean data
      </Button>
    </div>
  );
}
