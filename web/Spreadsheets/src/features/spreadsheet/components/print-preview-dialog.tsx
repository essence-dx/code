"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileSearch, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SheetPrintPreviewPage } from "@/features/workbooks/html";

export function PrintPreviewDialog({
  html,
  pages,
  sheetName,
  onPrint,
}: {
  html: string;
  pages: SheetPrintPreviewPage[];
  sheetName: string;
  onPrint: () => void;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const activePage = pages[pageIndex] ?? null;
  const previewHtml = activePage?.html ?? html;
  const pageLabel = activePage
    ? `Page ${activePage.pageNumber} of ${pages.length}`
    : "Page 1 of 1";

  useEffect(() => {
    setPageIndex(0);
  }, [html, pages.length]);

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm">
              <FileSearch />
              <span className="sr-only">Preview print layout</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Preview print layout</TooltipContent>
      </Tooltip>
      <DialogContent className="grid h-[min(90vh,900px)] max-w-[min(96vw,1200px)] grid-rows-[auto_auto_1fr_auto] p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Print preview</DialogTitle>
          <DialogDescription>{sheetName}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 border-t px-4 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">{pageLabel}</p>
            <p className="truncate text-xs text-muted-foreground">
              {activePage?.label ?? "Full used sheet"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((index) => Math.max(index - 1, 0))}
            >
              <ChevronLeft />
              <span className="sr-only">Previous print page</span>
            </Button>
            <select
              value={pageIndex}
              aria-label="Print preview page"
              className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setPageIndex(Number(event.target.value))}
            >
              {pages.map((page, index) => (
                <option key={`${page.pageNumber}-${page.label}`} value={index}>
                  Page {page.pageNumber}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={pageIndex >= pages.length - 1}
              onClick={() =>
                setPageIndex((index) => Math.min(index + 1, pages.length - 1))
              }
            >
              <ChevronRight />
              <span className="sr-only">Next print page</span>
            </Button>
          </div>
        </div>
        <div className="min-h-0 border-y bg-muted/40 p-3">
          <iframe
            title={`${sheetName} print preview`}
            srcDoc={previewHtml}
            className="h-full w-full rounded-md border bg-white"
          />
        </div>
        <DialogFooter className="m-0">
          <Button type="button" onClick={onPrint}>
            <Printer />
            Print sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
