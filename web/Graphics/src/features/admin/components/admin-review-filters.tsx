"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminReviewFilterOption } from "@/features/admin/admin-review-model";

type AdminReviewFiltersProps<TValue extends string> = {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  value: TValue;
  onValueChange: (value: TValue) => void;
  options: AdminReviewFilterOption<TValue>[];
};

export function AdminReviewFilters<TValue extends string>({
  query,
  onQueryChange,
  placeholder,
  value,
  onValueChange,
  options,
}: AdminReviewFiltersProps<TValue>) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="relative min-w-0 md:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          className="h-9 pl-8"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={option.value === value ? "secondary" : "outline"}
            className="h-8"
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
            <span className="rounded-sm bg-background/80 px-1.5 py-0.5 font-mono text-[10px]">
              {option.count}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
