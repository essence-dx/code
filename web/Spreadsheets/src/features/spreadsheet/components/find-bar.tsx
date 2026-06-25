"use client";

import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FindBar({
  disabled,
  query,
  matchCount,
  activeIndex,
  replaceValue,
  onQueryChange,
  onReplaceAll,
  onReplaceActive,
  onReplaceValueChange,
  onNext,
  onPrevious,
}: {
  disabled?: boolean;
  query: string;
  matchCount: number;
  activeIndex: number;
  replaceValue: string;
  onQueryChange: (query: string) => void;
  onReplaceAll: () => void;
  onReplaceActive: () => void;
  onReplaceValueChange: (value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <div className="grid min-w-0 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 border-b bg-card px-3 py-2 lg:flex lg:flex-wrap">
      <Search className="size-4 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Find in sheet"
        className="col-span-3 h-8 min-w-0 lg:col-span-1 lg:flex-1"
        aria-label="Find in sheet"
      />
      <Input
        value={replaceValue}
        onChange={(event) => onReplaceValueChange(event.target.value)}
        placeholder="Replace with"
        className="col-span-4 h-8 min-w-0 lg:col-span-1 lg:flex-1"
        aria-label="Replace with"
        disabled={disabled}
      />
      <div className="col-span-2 min-w-0 shrink-0 text-right font-mono text-xs text-muted-foreground lg:col-span-1 lg:min-w-20">
        {query ? `${matchCount ? activeIndex + 1 : 0}/${matchCount}` : "0/0"}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={matchCount === 0}
        onClick={onPrevious}
      >
        <ChevronUp />
        <span className="sr-only">Previous match</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={matchCount === 0}
        onClick={onNext}
      >
        <ChevronDown />
        <span className="sr-only">Next match</span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || matchCount === 0}
        onClick={onReplaceActive}
        className="col-span-2 min-w-0 lg:col-span-1"
      >
        Replace
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || matchCount === 0}
        onClick={onReplaceAll}
        className="col-span-2 min-w-0 lg:col-span-1"
      >
        Replace all
      </Button>
    </div>
  );
}
