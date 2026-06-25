"use client";

import Link from "next/link";
import {
  Clock3,
  FileSpreadsheet,
  Folder,
  LayoutTemplate,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toggleWorkbookFavoriteAction } from "@/features/workbooks/actions";
import { WorkbookOwnerActions } from "@/features/workbooks/components/workbook-owner-actions";
import type { WorkbookSummary } from "@/features/workbooks/types";
import { cn } from "@/lib/utils";

export function WorkbookCard({ workbook }: { workbook: WorkbookSummary }) {
  const isOwned = workbook.accessRole === "owner";

  return (
    <article className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/60">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="size-5 text-primary" />
          {isOwned ? (
            <form action={toggleWorkbookFavoriteAction}>
              <input type="hidden" name="workbookId" value={workbook.id} />
              <input
                type="hidden"
                name="favorite"
                value={workbook.isFavorite ? "false" : "true"}
              />
              <Button
                type="submit"
                variant={workbook.isFavorite ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label={
                  workbook.isFavorite
                    ? "Remove workbook from favorites"
                    : "Add workbook to favorites"
                }
              >
                <Star
                  className={cn(
                    workbook.isFavorite && "fill-current text-amber-500",
                  )}
                />
              </Button>
            </form>
          ) : (
            <Badge variant="outline" className="capitalize">
              {workbook.accessRole}
            </Badge>
          )}
          {workbook.isTemplate ? (
            <span className="inline-flex size-8 items-center justify-center rounded-md border bg-secondary text-secondary-foreground">
              <LayoutTemplate className="size-4" />
              <span className="sr-only">Saved as template</span>
            </span>
          ) : null}
        </div>
        {isOwned ? <WorkbookOwnerActions workbook={workbook} /> : null}
      </div>
      <Link href={`/workbooks/${workbook.id}`} className="block">
        <h2 className="line-clamp-2 font-medium">{workbook.name}</h2>
        {workbook.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {workbook.description}
          </p>
        ) : null}
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            {workbook.lastOpenedAt
              ? `Opened ${workbook.lastOpenedAt.toLocaleString()}`
              : "Not opened yet"}
          </p>
          <p className="flex items-center gap-1.5">
            <Folder className="size-3.5" />
            {workbook.folderName || "No folder"}
          </p>
          {!isOwned ? <p>Owner {workbook.ownerEmail}</p> : null}
          <p>Updated {workbook.updatedAt.toLocaleString()}</p>
        </div>
        {workbook.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {workbook.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border bg-background px-1.5 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </Link>
    </article>
  );
}
