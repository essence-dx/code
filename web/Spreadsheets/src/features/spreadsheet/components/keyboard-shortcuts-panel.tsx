"use client";

import { useMemo, useState } from "react";
import { Keyboard, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatShortcutBindings,
  getShortcutBindingConflict,
  isSafeCustomShortcut,
  shortcutBindingFromEvent,
  spreadsheetShortcutGroups,
  type EffectiveSpreadsheetShortcut,
  type SpreadsheetShortcutBinding,
  type SpreadsheetShortcutCommand,
  type SpreadsheetShortcutPreference,
} from "@/features/spreadsheet/keyboard-shortcuts";
import { cn } from "@/lib/utils";

export function KeyboardShortcutsPanel({
  preferences,
  shortcuts,
  onResetAllShortcuts,
  onResetShortcut,
  onUpdateShortcut,
}: {
  preferences: SpreadsheetShortcutPreference[];
  shortcuts: EffectiveSpreadsheetShortcut[];
  onResetAllShortcuts: () => void;
  onResetShortcut: (command: SpreadsheetShortcutCommand) => void;
  onUpdateShortcut: (
    command: SpreadsheetShortcutCommand,
    binding: SpreadsheetShortcutBinding | null,
  ) => void;
}) {
  const [capturingCommand, setCapturingCommand] =
    useState<SpreadsheetShortcutCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const groupedShortcuts = useMemo(
    () =>
      spreadsheetShortcutGroups
        .map((group) => ({
          group,
          shortcuts: shortcuts.filter((shortcut) => shortcut.group === group),
        }))
        .filter((group) => group.shortcuts.length > 0),
    [shortcuts],
  );

  function handleCaptureKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    shortcut: EffectiveSpreadsheetShortcut,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      setCapturingCommand(null);
      setError(null);
      return;
    }

    const binding = shortcutBindingFromEvent(event);

    if (!isSafeCustomShortcut(binding)) {
      setError("Use Ctrl or Alt with letter and number shortcuts.");
      return;
    }

    const conflict = getShortcutBindingConflict(
      shortcut.command,
      binding,
      preferences,
    );

    if (conflict) {
      setError(
        `${formatShortcutBindings([binding])} already runs ${conflict.label}.`,
      );
      return;
    }

    onUpdateShortcut(shortcut.command, binding);
    setCapturingCommand(null);
    setError(null);
  }

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Keyboard className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
        </div>
        <Badge variant="secondary" className="font-mono">
          {preferences.length}
        </Badge>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs leading-5 text-muted-foreground">
          Customize workbook, selection, edit, and format shortcuts for this
          browser.
        </p>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={preferences.length === 0}
          onClick={() => {
            onResetAllShortcuts();
            setError(null);
          }}
        >
          <RotateCcw className="size-4" />
          <span className="sr-only">Restore all default shortcuts</span>
        </Button>
      </div>

      {error ? (
        <p
          className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        {groupedShortcuts.map((group) => (
          <section key={group.group} className="space-y-2">
            <h3 className="text-xs font-medium uppercase text-muted-foreground">
              {group.group}
            </h3>
            <div className="space-y-2">
              {group.shortcuts.map((shortcut) => {
                const isCapturing = capturingCommand === shortcut.command;

                return (
                  <div key={shortcut.command} className="rounded-md border p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {shortcut.label}
                        </p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {shortcut.description}
                        </p>
                      </div>
                      {shortcut.customized ? (
                        <Badge variant="outline">Custom</Badge>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {isCapturing ? (
                        <button
                          type="button"
                          autoFocus
                          className={cn(
                            "h-7 rounded-md border border-dashed border-primary px-2",
                            "text-xs text-primary outline-none ring-ring/30",
                            "focus-visible:ring-2",
                          )}
                          onBlur={() => setCapturingCommand(null)}
                          onKeyDown={(event) =>
                            handleCaptureKeyDown(event, shortcut)
                          }
                        >
                          Press shortcut
                        </button>
                      ) : (
                        <Badge variant="secondary" className="font-mono">
                          {formatShortcutBindings(shortcut.bindings)}
                        </Badge>
                      )}
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setCapturingCommand(shortcut.command);
                          setError(null);
                        }}
                      >
                        Change
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          onUpdateShortcut(shortcut.command, null);
                          setError(null);
                        }}
                      >
                        <X className="size-3" />
                        Disable
                      </Button>
                      {shortcut.customized ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            onResetShortcut(shortcut.command);
                            setError(null);
                          }}
                        >
                          Reset
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
