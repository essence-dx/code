"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormulaReference } from "@/features/spreadsheet/formula-audit";
import type { CircularReferenceIssue } from "@/features/spreadsheet/formula-dependency-graph";
import type {
  WorkbookCalculationSettings,
  WorkbookCalendarSystem,
} from "@/features/workbooks/types";

const calendarOptions: { label: string; value: WorkbookCalendarSystem }[] = [
  { label: "Gregorian", value: "gregorian" },
  { label: "Gregorian 1904 date system", value: "gregorian-1904" },
  { label: "Hijri", value: "hijri" },
  { label: "Buddhist", value: "buddhist" },
];

export function FormulaAuditPanel({
  calculationSettings,
  circularReferences,
  dependents,
  references,
  onSelectCircularReference,
  onSelectDependent,
  onSelectReference,
  onUpdateCalculationSettings,
}: {
  calculationSettings: WorkbookCalculationSettings;
  circularReferences: CircularReferenceIssue[];
  dependents: FormulaReference[];
  references: FormulaReference[];
  onSelectCircularReference: (issue: CircularReferenceIssue) => void;
  onSelectDependent: (reference: FormulaReference) => void;
  onSelectReference: (reference: FormulaReference) => void;
  onUpdateCalculationSettings: (
    settings: Partial<WorkbookCalculationSettings["iterativeCalculation"]> & {
      calendarSystem?: WorkbookCalendarSystem;
    },
  ) => void;
}) {
  const iterative = calculationSettings.iterativeCalculation;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Formula audit</h2>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="font-mono">
            Precedents {references.length}
          </Badge>
          <Badge variant="secondary" className="font-mono">
            Dependents {dependents.length}
          </Badge>
        </div>
      </div>

      <div className="mb-3 rounded-md border p-3">
        <div className="mb-3 grid gap-1">
          <Label htmlFor="formula-calendar-system">Workbook calendar</Label>
          <select
            id="formula-calendar-system"
            value={calculationSettings.calendarSystem}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) =>
              onUpdateCalculationSettings({
                calendarSystem: event.target.value as WorkbookCalendarSystem,
              })
            }
          >
            {calendarOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={iterative.enabled}
            className="size-4 accent-primary"
            onChange={(event) =>
              onUpdateCalculationSettings({ enabled: event.target.checked })
            }
          />
          Iterative calculation
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="formula-max-iterations">Max iterations</Label>
            <Input
              id="formula-max-iterations"
              type="number"
              min={1}
              max={10000}
              value={iterative.maxIterations}
              onChange={(event) =>
                onUpdateCalculationSettings({
                  maxIterations: Number(event.target.value),
                })
              }
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="formula-max-change">Max change</Label>
            <Input
              id="formula-max-change"
              type="number"
              min={0.000000001}
              max={1}
              step={0.0001}
              value={iterative.maxChange}
              onChange={(event) =>
                onUpdateCalculationSettings({
                  maxChange: Number(event.target.value),
                })
              }
            />
          </div>
        </div>
      </div>

      {circularReferences.length > 0 ? (
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Circular references
            </h3>
            <Badge variant="destructive" className="font-mono">
              {circularReferences.length}
            </Badge>
          </div>
          {circularReferences.slice(0, 8).map((issue) => (
            <Button
              key={issue.id}
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start px-3 py-2 text-left"
              onClick={() => onSelectCircularReference(issue)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {issue.address}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {issue.cycle.map((cell) => cell.address).join(" -> ")}
                </span>
              </span>
            </Button>
          ))}
          {circularReferences.length > 8 ? (
            <p className="px-3 text-xs text-muted-foreground">
              {circularReferences.length - 8} more circular references in this
              workbook.
            </p>
          ) : null}
        </div>
      ) : null}

      {references.length === 0 && dependents.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm leading-6 text-muted-foreground">
          Select a formula cell to inspect trace precedents and dependents.
        </p>
      ) : (
        <div className="space-y-4">
          <TraceList
            title="Trace precedents"
            references={references}
            onSelectReference={onSelectReference}
          />
          <TraceList
            title="Trace dependents"
            references={dependents}
            onSelectReference={onSelectDependent}
          />
        </div>
      )}
    </section>
  );
}

function TraceList({
  references,
  title,
  onSelectReference,
}: {
  references: FormulaReference[];
  title: string;
  onSelectReference: (reference: FormulaReference) => void;
}) {
  if (references.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </h3>
      {references.map((reference) => (
        <Button
          key={reference.id}
          type="button"
          variant="ghost"
          className="h-auto w-full justify-start px-3 py-2 text-left"
          onClick={() => onSelectReference(reference)}
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {reference.address}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {reference.sheetName}
            </span>
          </span>
        </Button>
      ))}
    </div>
  );
}
