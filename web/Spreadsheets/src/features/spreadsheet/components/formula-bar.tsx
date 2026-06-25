"use client";

import { useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formulaFunctions } from "@/features/spreadsheet/formula-functions";
import {
  canonicalizeFormulaInput,
  getFormulaLocaleSettings,
  localizeFormulaForDisplay,
  localizeFormulaFunctionName,
  localizeFormulaSignature,
} from "@/features/spreadsheet/formula-locale";
import { quoteFormulaSheetName } from "@/features/spreadsheet/formula-references";
import type {
  NamedRange,
  SheetData,
  WorkbookCustomFunction,
} from "@/features/workbooks/types";

function getFormulaPrefix(value: string) {
  const match = /^=([a-z0-9_.' ]*)$/i.exec(value.trim());

  return match?.[1] ?? null;
}

function normalizePrefix(prefix: string) {
  return prefix.replace(/^'/, "").toUpperCase();
}

export function FormulaBar({
  address,
  disabled,
  customFunctions,
  isRightToLeft = false,
  namedRanges,
  sheets,
  value,
  onChange,
}: {
  address: string;
  customFunctions?: WorkbookCustomFunction[];
  disabled?: boolean;
  isRightToLeft?: boolean;
  namedRanges: NamedRange[];
  sheets: Pick<SheetData, "id" | "name">[];
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formulaLocale = useMemo(() => getFormulaLocaleSettings(), []);
  const displayValue = useMemo(
    () => localizeFormulaForDisplay(value, formulaLocale),
    [formulaLocale, value],
  );
  const suggestions = useMemo(() => {
    const prefix = getFormulaPrefix(displayValue);

    if (prefix === null) {
      return [];
    }

    const normalizedPrefix = normalizePrefix(prefix);
    const functions = formulaFunctions
      .flatMap((formula) => {
        const label = localizeFormulaFunctionName(
          formula.name,
          formulaLocale.functionLanguage,
        );

        if (
          !formula.name.startsWith(normalizedPrefix) &&
          !label.toUpperCase().startsWith(normalizedPrefix)
        ) {
          return [];
        }

        return [
          {
            description: `${formula.category} - ${localizeFormulaSignature(
              formula.signature,
              formulaLocale,
            )}`,
            insertValue: formula.name,
            kind: "function" as const,
            label,
          },
        ];
      })
      .slice(0, 4);
    const workbookFunctions = (customFunctions ?? [])
      .filter(
        (customFunction) =>
          customFunction.enabled &&
          customFunction.name.toUpperCase().startsWith(normalizedPrefix),
      )
      .slice(0, 4)
      .map((customFunction) => ({
        description: customFunction.description || "Workbook custom function",
        insertValue: customFunction.name,
        kind: "function" as const,
        label: customFunction.name,
      }));
    const ranges = namedRanges
      .filter((range) => range.name.toUpperCase().startsWith(normalizedPrefix))
      .slice(0, 4)
      .map((range) => ({
        description: "Named range",
        insertValue: range.name,
        kind: "range" as const,
        label: range.name,
      }));
    const sheetReferences = sheets
      .filter((sheet) => sheet.name.toUpperCase().startsWith(normalizedPrefix))
      .slice(0, 4)
      .map((sheet) => ({
        description: "Sheet reference",
        insertValue: sheet.name,
        kind: "sheet" as const,
        label: sheet.name,
      }));

    return [...sheetReferences, ...ranges, ...workbookFunctions, ...functions].slice(
      0,
      6,
    );
  }, [customFunctions, displayValue, formulaLocale, namedRanges, sheets]);

  function insertSuggestion(suggestion: (typeof suggestions)[number]) {
    if (disabled) {
      return;
    }

    const nextValue =
      suggestion.kind === "function"
        ? `=${suggestion.insertValue}()`
        : suggestion.kind === "sheet"
          ? `=${quoteFormulaSheetName(suggestion.insertValue)}!`
          : `=${suggestion.insertValue}`;
    const cursorPosition =
      suggestion.kind === "function"
        ? suggestion.insertValue.length + 2
        : nextValue.length;

    onChange(nextValue);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursorPosition, cursorPosition);
    });
  }

  return (
    <div
      className="relative flex shrink-0 items-center gap-2 border-b bg-card px-3 py-2"
      dir={isRightToLeft ? "rtl" : "ltr"}
    >
      <div className="h-8 min-w-16 shrink-0 rounded-md border bg-muted px-2 py-1.5 text-center font-mono text-xs text-muted-foreground sm:min-w-20">
        {address}
      </div>
      <Input
        ref={inputRef}
        value={displayValue}
        onChange={(event) =>
          onChange(canonicalizeFormulaInput(event.target.value, formulaLocale))
        }
        disabled={disabled}
        dir="ltr"
        className={cn("h-8 font-mono", isRightToLeft && "text-right")}
        aria-label="Formula bar"
      />
      {suggestions.length > 0 && !disabled ? (
        <div
          className={cn(
            "absolute top-11 z-40 w-[min(calc(100vw-1.5rem),24rem)] rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            isRightToLeft ? "right-3 sm:right-28" : "left-3 sm:left-28",
          )}
          dir={isRightToLeft ? "rtl" : "ltr"}
        >
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.kind}-${suggestion.label}`}
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent"
              onMouseDown={(event) => {
                event.preventDefault();
                insertSuggestion(suggestion);
              }}
            >
              <span className="font-mono font-semibold">{suggestion.label}</span>
              <span className="truncate text-muted-foreground">
                {suggestion.description}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
