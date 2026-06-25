"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type {
  DraftHandoffChange,
  DraftHandoffSection,
  DraftHandoffSelection,
} from "@/features/ai/creation-draft-handoff";

type CreationDraftHandoffPreviewProps = {
  applyLabel?: string;
  changes: DraftHandoffChange[];
  heading?: string;
  onApply: () => void;
  onCancel: () => void;
  onToggle: (section: DraftHandoffSection, checked: boolean) => void;
  selectedCount: number;
  selection: DraftHandoffSelection;
  subtitle?: string;
  title: string;
};

export function CreationDraftHandoffPreview({
  applyLabel = "Apply selected",
  changes,
  heading = "Apply draft",
  onApply,
  onCancel,
  onToggle,
  selectedCount,
  selection,
  subtitle,
  title,
}: CreationDraftHandoffPreviewProps) {
  return (
    <div className="mt-3 rounded-md border border-emerald-300/20 bg-emerald-300/5 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{heading}</p>
            <Badge variant="secondary" className="bg-white/5">
              {selectedCount} selected
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="ghost" title="Cancel draft apply" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!selectedCount}
            title="Apply selected draft sections"
            onClick={onApply}
          >
            {applyLabel}
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {changes.map((change) => (
          <div
            key={change.section}
            className="grid gap-3 rounded-md border border-white/10 bg-black/20 p-2 md:grid-cols-[120px_1fr_1fr_auto]"
          >
            <div className="flex items-center gap-2">
              <Switch
                size="sm"
                checked={selection[change.section]}
                disabled={!change.changed}
                aria-label={`Apply ${change.label}`}
                onCheckedChange={(checked) => onToggle(change.section, checked)}
              />
              <span className="text-sm font-medium">{change.label}</span>
            </div>
            <FieldValue label="Current" value={change.before} />
            <FieldValue label="Draft" value={change.after} />
            <Badge
              variant="secondary"
              className={
                change.changed
                  ? "h-fit bg-amber-400/15 text-amber-100"
                  : "h-fit bg-white/5"
              }
            >
              {change.changed ? "Changed" : "Same"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.7rem] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-slate-200">
        {value}
      </p>
    </div>
  );
}
