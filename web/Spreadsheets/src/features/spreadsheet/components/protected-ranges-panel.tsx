"use client";

import { MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rangeAddress } from "@/features/spreadsheet/multi-range-selection";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type {
  SheetData,
  WorkbookCollaboratorSummary,
  WorkbookProtectedRange,
} from "@/features/workbooks/types";

function parseEmailList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\s;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function ProtectedRangesPanel({
  collaborators,
  currentUserEmail,
  disabled,
  protectedRanges,
  selectedRange,
  sheet,
  onAddProtectedRange,
  onDeleteProtectedRange,
  onSelectRange,
}: {
  collaborators: WorkbookCollaboratorSummary[];
  currentUserEmail: string;
  disabled: boolean;
  protectedRanges: WorkbookProtectedRange[];
  selectedRange: CellRange;
  sheet: SheetData;
  onAddProtectedRange: (name: string, allowedEmails: string[]) => string | null;
  onDeleteProtectedRange: (protectedRangeId: string) => void;
  onSelectRange: (range: CellRange) => void;
}) {
  const [name, setName] = useState("");
  const [emails, setEmails] = useState("");
  const activeSheetRanges = protectedRanges.filter(
    (protectedRange) => protectedRange.sheetId === sheet.id,
  );
  const collaboratorEmails = useMemo(
    () =>
      Array.from(
        new Set(
          [currentUserEmail, ...collaborators.map((item) => item.email)]
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean),
        ),
      ),
    [collaborators, currentUserEmail],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const protectedRangeId = onAddProtectedRange(name, parseEmailList(emails));

    if (!protectedRangeId) {
      return;
    }

    setName("");
    setEmails("");
  }

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Protected ranges</h2>
        </div>
        <Badge variant="secondary" className="font-mono">
          {activeSheetRanges.length}
        </Badge>
      </div>
      <form className="mb-3 space-y-2" onSubmit={handleSubmit}>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          placeholder={`Lock ${rangeAddress(selectedRange)}`}
          disabled={disabled}
        />
        <Input
          value={emails}
          onChange={(event) => setEmails(event.target.value)}
          list="protected-range-collaborators"
          placeholder="Allowed editor emails"
          disabled={disabled}
        />
        <datalist id="protected-range-collaborators">
          {collaboratorEmails.map((email) => (
            <option key={email} value={email} />
          ))}
        </datalist>
        <Button type="submit" size="sm" className="w-full" disabled={disabled}>
          Add protected range
        </Button>
      </form>
      {disabled ? (
        <p className="mb-3 rounded-md border border-dashed p-3 text-xs leading-5 text-muted-foreground">
          Only workbook owners can manage collaborator range access.
        </p>
      ) : null}
      {activeSheetRanges.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm leading-6 text-muted-foreground">
          No protected ranges on this sheet yet.
        </p>
      ) : (
        <div className="space-y-2">
          {activeSheetRanges.map((protectedRange) => (
            <section
              key={protectedRange.id}
              className="rounded-lg border bg-card p-3"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium">
                    {protectedRange.name}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    {rangeAddress(protectedRange.range)}
                  </p>
                </div>
                <ConfirmDestructiveButton
                  title="Delete this protected range?"
                  description="This removes the collaborator edit restriction for the selected workbook range."
                  label="Delete protected range"
                  disabled={disabled}
                  onConfirm={() => onDeleteProtectedRange(protectedRange.id)}
                >
                  <Trash2 />
                </ConfirmDestructiveButton>
              </div>
              <div className="mb-3 flex flex-wrap gap-1">
                {protectedRange.allowedEmails.map((email) => (
                  <Badge key={email} variant="outline" className="max-w-full">
                    <span className="truncate">{email}</span>
                  </Badge>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectRange(protectedRange.range)}
              >
                <MapPin />
                Select range
              </Button>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
