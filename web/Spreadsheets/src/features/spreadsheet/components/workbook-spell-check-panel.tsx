"use client";

import { AlignJustify, Repeat2, SpellCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  WorkbookSpellCheckIssue,
  WorkbookSpellCheckIssueKind,
} from "@/features/spreadsheet/workbook-spell-check";

const kindIcons: Record<WorkbookSpellCheckIssueKind, typeof SpellCheck2> = {
  misspelling: SpellCheck2,
  repeatedWord: Repeat2,
  spacing: AlignJustify,
};

const kindLabels: Record<WorkbookSpellCheckIssueKind, string> = {
  misspelling: "Spelling",
  repeatedWord: "Repeat",
  spacing: "Spacing",
};

export function WorkbookSpellCheckPanel({
  issues,
  onSelectIssue,
}: {
  issues: WorkbookSpellCheckIssue[];
  onSelectIssue: (issue: WorkbookSpellCheckIssue) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Spell check</h2>
        <Badge variant="secondary" className="font-mono">
          {issues.length}
        </Badge>
      </div>
      {issues.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No common spelling, repeated-word, or spacing issues found.
        </p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => {
            const Icon = kindIcons[issue.kind];

            return (
              <section key={issue.id} className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Icon className="size-3" />
                    {kindLabels[issue.kind]}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onSelectIssue(issue)}
                  >
                    Select
                  </Button>
                </div>
                <p className="text-sm font-medium">{issue.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {issue.details}
                </p>
                {issue.suggestion && issue.word ? (
                  <p className="mt-2 rounded-md bg-muted px-2 py-1 font-mono text-xs">
                    {issue.word} -&gt; {issue.suggestion}
                  </p>
                ) : null}
                <div className="mt-2 flex items-start justify-between gap-2 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">
                    {issue.sheetName} / {issue.cellKey}
                  </span>
                  <span className="max-w-32 truncate text-right">
                    {issue.preview}
                  </span>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
