"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { printFieldTokens } from "@/features/workbooks/print-fields";
import {
  formatPrintAreaReference,
  parsePrintAreaReference,
} from "@/features/workbooks/print-area-reference";
import type {
  ChartRange,
  SheetData,
  SheetPrintSettings,
} from "@/features/workbooks/types";

const marginOptions: Array<{
  label: string;
  value: SheetPrintSettings["margins"];
}> = [
  { label: "Normal", value: "normal" },
  { label: "Narrow", value: "narrow" },
  { label: "Wide", value: "wide" },
];

const scalePresets = [75, 100, 125, 150];

function PrintFieldInput({
  disabled,
  label,
  value,
  onSave,
}: {
  disabled?: boolean;
  label: string;
  value: string;
  onSave: (value: string) => void;
}) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  function saveValue(nextValue: string) {
    setDraftValue(nextValue);
    onSave(nextValue);
  }

  function appendToken(token: string) {
    const separator = draftValue && !draftValue.endsWith(" ") ? " " : "";
    saveValue(`${draftValue}${separator}${token}`);
  }

  return (
    <div className="space-y-1">
      <Input
        value={draftValue}
        disabled={disabled}
        aria-label={label}
        placeholder={label}
        className="h-8"
        onBlur={() => onSave(draftValue)}
        onChange={(event) => setDraftValue(event.target.value)}
      />
      <div className="grid grid-cols-3 gap-1">
        {printFieldTokens.map((field) => (
          <Button
            key={`${label}-${field.token}`}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => appendToken(field.token)}
          >
            {field.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function PrintAreaInput({
  disabled,
  selectedRange,
  settings,
  sheet,
  onUpdateSettings,
}: {
  disabled?: boolean;
  selectedRange: ChartRange;
  settings: SheetPrintSettings;
  sheet: SheetData;
  onUpdateSettings: (
    updates: Partial<Omit<SheetPrintSettings, "sheetId" | "updatedAt">>,
  ) => void;
}) {
  const [draftReference, setDraftReference] = useState(
    formatPrintAreaReference(settings.printArea),
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setDraftReference(formatPrintAreaReference(settings.printArea));
    setError("");
  }, [settings.printArea]);

  function applyReference(nextReference = draftReference) {
    const result = parsePrintAreaReference(nextReference, sheet);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError("");
    onUpdateSettings({ printArea: result.range });
  }

  return (
    <div className="rounded-md border bg-background p-2">
      <label className="grid gap-1 text-xs text-muted-foreground">
        Print area
        <Input
          value={draftReference}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          placeholder="A1:D20"
          className="h-8"
          onBlur={() => applyReference()}
          onChange={(event) => {
            setDraftReference(event.target.value);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              applyReference();
            }
          }}
        />
      </label>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      <p className="mt-2 text-xs text-muted-foreground">
        {settings.printArea
          ? `Active ${formatPrintAreaReference(settings.printArea)}`
          : "Full used sheet"}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setDraftReference(formatPrintAreaReference(selectedRange));
            setError("");
            onUpdateSettings({ printArea: selectedRange });
          }}
        >
          Use selection
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !settings.printArea}
          onClick={() => {
            setDraftReference("");
            setError("");
            onUpdateSettings({ printArea: undefined });
          }}
        >
          Clear area
        </Button>
      </div>
    </div>
  );
}

export function PrintSettingsPanel({
  disabled,
  selectedRange,
  settings,
  sheet,
  onUpdateSettings,
}: {
  disabled?: boolean;
  selectedRange: ChartRange;
  settings: SheetPrintSettings;
  sheet: SheetData;
  onUpdateSettings: (
    updates: Partial<Omit<SheetPrintSettings, "sheetId" | "updatedAt">>,
  ) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Print setup</h2>
        <Printer className="size-4 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={settings.orientation}
            disabled={disabled}
            aria-label="Print orientation"
            className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) =>
              onUpdateSettings({
                orientation: event.target
                  .value as SheetPrintSettings["orientation"],
              })
            }
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
          <select
            value={settings.margins}
            disabled={disabled}
            aria-label="Print margins"
            className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) =>
              onUpdateSettings({
                margins: event.target.value as SheetPrintSettings["margins"],
              })
            }
          >
            {marginOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Scale
          <Input
            key={`print-scale-${settings.sheetId}-${settings.updatedAt}`}
            type="number"
            min={50}
            max={200}
            step={10}
            defaultValue={settings.scale}
            disabled={disabled}
            className="h-8"
            onBlur={(event) =>
              onUpdateSettings({ scale: Number(event.target.value) })
            }
          />
        </label>
        <div className="grid grid-cols-4 gap-2">
          {scalePresets.map((scale) => (
            <Button
              key={scale}
              type="button"
              variant={settings.scale === scale ? "secondary" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => onUpdateSettings({ scale })}
            >
              {scale}%
            </Button>
          ))}
        </div>
        <PrintFieldInput
          disabled={disabled}
          label="Print header text"
          value={settings.headerText}
          onSave={(value) => onUpdateSettings({ headerText: value })}
        />
        <PrintFieldInput
          disabled={disabled}
          label="Print footer text"
          value={settings.footerText}
          onSave={(value) => onUpdateSettings({ footerText: value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={settings.repeatHeaderRows ? "secondary" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() =>
              onUpdateSettings({
                repeatHeaderRows: !settings.repeatHeaderRows,
              })
            }
          >
            Repeat first row
          </Button>
          <Button
            type="button"
            variant={settings.repeatFirstColumn ? "secondary" : "outline"}
            size="sm"
            aria-label="Repeat first column"
            disabled={disabled}
            onClick={() =>
              onUpdateSettings({
                repeatFirstColumn: !settings.repeatFirstColumn,
              })
            }
          >
            Repeat column
          </Button>
          <Button
            type="button"
            variant={settings.printGridlines ? "secondary" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() =>
              onUpdateSettings({ printGridlines: !settings.printGridlines })
            }
          >
            Gridlines
          </Button>
        </div>
        <PrintAreaInput
          disabled={disabled}
          selectedRange={selectedRange}
          settings={settings}
          sheet={sheet}
          onUpdateSettings={onUpdateSettings}
        />
        <div className="rounded-md border bg-background p-2">
          <p className="mb-2 text-xs text-muted-foreground">
            Row breaks {settings.rowPageBreaks.length}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || selectedRange.startRowIndex === 0}
              onClick={() =>
                onUpdateSettings({
                  rowPageBreaks: [
                    ...settings.rowPageBreaks,
                    selectedRange.startRowIndex,
                  ],
                })
              }
            >
              Add row break
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || settings.rowPageBreaks.length === 0}
              onClick={() => onUpdateSettings({ rowPageBreaks: [] })}
            >
              Clear breaks
            </Button>
          </div>
        </div>
        <div className="rounded-md border bg-background p-2">
          <p className="mb-2 text-xs text-muted-foreground">
            Column breaks {settings.columnPageBreaks.length}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Add column page break"
              disabled={disabled || selectedRange.startColumnIndex === 0}
              onClick={() =>
                onUpdateSettings({
                  columnPageBreaks: [
                    ...settings.columnPageBreaks,
                    selectedRange.startColumnIndex,
                  ],
                })
              }
            >
              Add break
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || settings.columnPageBreaks.length === 0}
              onClick={() => onUpdateSettings({ columnPageBreaks: [] })}
            >
              Clear breaks
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
