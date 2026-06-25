"use client";

import { useState } from "react";
import { Download, Pin, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type { LibraryReleaseSearchResult } from "@/features/editor/library-release-search";
import {
  getLibraryReleasePinnedQueriesCsv,
  getLibraryReleaseSearchResultsCsv,
} from "@/features/editor/library-release-search";

export function LibraryReleaseSearchPanel({
  query,
  results,
  onQueryChange,
}: {
  query: string;
  results: LibraryReleaseSearchResult[];
  onQueryChange: (query: string) => void;
}) {
  const [pinnedQueries, setPinnedQueries] = useState<string[]>([]);
  const normalizedQuery = query.trim();
  const canPinQuery =
    normalizedQuery.length > 0 && !pinnedQueries.includes(normalizedQuery);

  return (
    <div className="space-y-2 rounded-sm border border-border/70 bg-muted/20 p-2">
      <div className="flex gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            placeholder="Search release evidence"
            className="h-8 pl-8 text-xs"
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 gap-1 px-2 text-[11px]"
          disabled={!canPinQuery}
          onClick={() =>
            setPinnedQueries((currentQueries) =>
              [normalizedQuery, ...currentQueries].slice(0, 6),
            )
          }
        >
          <Pin className="size-3" />
          Pin
        </Button>
      </div>
      {pinnedQueries.length > 0 ? (
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-1">
            {pinnedQueries.map((pinnedQuery) => (
              <button
                key={pinnedQuery}
                type="button"
                className="rounded-sm bg-background px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                onClick={() => onQueryChange(pinnedQuery)}
              >
                {pinnedQuery}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 gap-1 px-1.5 text-[11px]"
              onClick={() => exportPinnedQueriesCsv(pinnedQueries)}
            >
              <Download className="size-3" />
              Pins
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 gap-1 px-1.5 text-[11px]"
              onClick={() => setPinnedQueries([])}
            >
              <Trash2 className="size-3" />
              Clear
            </Button>
          </div>
        </div>
      ) : null}
      {query.trim() ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 rounded-sm bg-background px-2 py-1">
            <span className="text-[11px] text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 gap-1 px-1.5 text-[11px]"
              disabled={results.length === 0}
              onClick={() => exportSearchResultsCsv(results)}
            >
              <Download className="size-3" />
              CSV
            </Button>
          </div>
          {results.length > 0 ? (
            results.slice(0, 5).map((result) => (
              <div
                key={result.id}
                className="rounded-sm bg-background px-2 py-1.5 text-[11px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium">
                    {result.label}
                  </span>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {result.source}
                  </Badge>
                </div>
                <div className="mt-1 truncate text-[10px] text-muted-foreground">
                  {result.detail}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-sm bg-background px-2 py-1.5 text-[11px] text-muted-foreground">
              No release evidence matches this search.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function exportSearchResultsCsv(results: LibraryReleaseSearchResult[]) {
  downloadTextFile({
    content: getLibraryReleaseSearchResultsCsv(results),
    filename: "release-evidence-search-results.csv",
    type: "text/csv;charset=utf-8",
  });
}

function exportPinnedQueriesCsv(queries: string[]) {
  downloadTextFile({
    content: getLibraryReleasePinnedQueriesCsv(queries),
    filename: "release-evidence-pinned-searches.csv",
    type: "text/csv;charset=utf-8",
  });
}
