"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/editor/components/inspector-fields";
import type { LayerReviewStatus, TimelineLayer } from "@/lib/editor/types";

const reviewStatusOptions: Array<{ value: LayerReviewStatus; label: string }> = [
  { value: "none", label: "No review status" },
  { value: "needs-review", label: "Needs review" },
  { value: "changes-requested", label: "Changes requested" },
  { value: "approved", label: "Approved" },
];

type InspectorLayerReviewSectionProps = {
  layer: TimelineLayer;
  onUpdateLayer: (layerId: string, patch: Partial<TimelineLayer>) => void;
};

export function InspectorLayerReviewSection({ layer, onUpdateLayer }: InspectorLayerReviewSectionProps) {
  function updateReviewStatus(reviewStatus: LayerReviewStatus) {
    onUpdateLayer(layer.id, {
      reviewStatus,
      reviewUpdatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-3">
      <Field label="Review status">
        <Select value={layer.reviewStatus ?? "none"} onValueChange={(value) => updateReviewStatus(value as LayerReviewStatus)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {reviewStatusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Layer notes">
        <Textarea
          value={layer.notes ?? ""}
          onChange={(event) => onUpdateLayer(layer.id, { notes: event.target.value })}
          placeholder="Add edit notes or handoff context"
        />
      </Field>
      {layer.reviewUpdatedAt ? <p className="text-[11px] text-muted-foreground">Review updated {formatReviewDate(layer.reviewUpdatedAt)}</p> : null}
    </div>
  );
}

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleString();
}
