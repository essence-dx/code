"use client";

import { ExternalLink, Link2, Trash2 } from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseCellKey } from "@/features/workbooks/addresses";
import type { CellSelection } from "@/features/spreadsheet/state/selection-state";
import type { CellLink } from "@/features/workbooks/types";

export function SheetLinksPanel({
  disabled,
  links,
  onDeleteLink,
  onSelectCell,
}: {
  disabled?: boolean;
  links: CellLink[];
  onDeleteLink: (linkId: string) => void;
  onSelectCell: (selection: CellSelection) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Links</h2>
        <Badge variant="secondary" className="font-mono">
          {links.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {links.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No links on this sheet.
          </p>
        ) : (
          links.map((link) => {
            const position = parseCellKey(link.cellKey);

            return (
              <section
                key={link.id}
                className="rounded-lg border bg-card p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 font-mono"
                    disabled={!position}
                    onClick={() => {
                      if (position) {
                        onSelectCell(position);
                      }
                    }}
                  >
                    <Link2 />
                    {link.cellKey}
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon-sm" asChild>
                      <a href={link.url} target="_blank" rel="noreferrer">
                        <ExternalLink />
                        <span className="sr-only">Open link</span>
                      </a>
                    </Button>
                    <ConfirmDestructiveButton
                      title="Delete this link?"
                      description="This removes the hyperlink metadata from the cell. The cell value is kept."
                      label="Delete link"
                      disabled={disabled}
                      onConfirm={() => onDeleteLink(link.id)}
                    >
                      <Trash2 />
                    </ConfirmDestructiveButton>
                  </div>
                </div>
                <p className="truncate text-sm font-medium">
                  {link.label || link.url}
                </p>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {link.url}
                </p>
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
