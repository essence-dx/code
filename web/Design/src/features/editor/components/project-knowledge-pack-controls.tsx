"use client";

import { ListPlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectKnowledgeCheckStatus } from "@/features/editor/project-knowledge-pack";

export function PanelSectionHeader({
  title,
  onAdd,
}: {
  title: string;
  onAdd?: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <h4 className="min-w-0 truncate text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </h4>
      {onAdd ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 !w-auto max-w-full shrink-0 px-2"
          onClick={onAdd}
        >
          <ListPlus className="h-3.5 w-3.5" />
          Add
        </Button>
      ) : null}
    </div>
  );
}

export function KnowledgeTextField({
  label,
  value,
  onChange,
  as = "input",
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  as?: "input" | "textarea";
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {as === "textarea" ? (
        <Textarea
          className="min-h-16 resize-y text-xs"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          className="h-8 text-xs"
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

export function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="h-8 !w-8 shrink-0"
      aria-label="Remove item"
      onClick={onClick}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function getStatusVariant(status: ProjectKnowledgeCheckStatus) {
  if (status === "blocked") return "destructive" as const;
  if (status === "ready") return "secondary" as const;

  return "outline" as const;
}

export function formatStatus(status: ProjectKnowledgeCheckStatus) {
  if (status === "blocked") return "Fix";
  if (status === "ready") return "Ready";

  return "Review";
}
