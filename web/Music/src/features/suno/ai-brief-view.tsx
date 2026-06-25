"use client";

import { Clipboard, Tags, Type } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EditableSongPatch } from "@/features/library/types";
import type { SongBrief } from "@/lib/ai/schemas";

export function AiBriefView({
  brief,
  onApply,
}: {
  brief?: SongBrief;
  onApply?: (patch: EditableSongPatch) => void;
}) {
  if (!brief) {
    return (
      <div className="rounded-md border border-white/10 bg-slate-950/50 p-6 text-sm text-muted-foreground">
        Generate a brief to see title, tags, arrangement, and release checks.
      </div>
    );
  }

  async function copyChecklist() {
    if (!brief || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(brief.releaseChecklist.join("\n"));
    toast.success("Release checklist copied.");
  }

  return (
    <div className="space-y-4 rounded-md border border-white/10 bg-slate-950/50 p-4">
      <div>
        <p className="text-lg font-semibold">{brief.title}</p>
        <p className="text-sm text-muted-foreground">{brief.subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="gap-2"
          disabled={!onApply}
          onClick={() => {
            onApply?.({ title: brief.title });
            toast.success("Brief title applied.");
          }}
        >
          <Type className="size-4" />
          Apply title
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="gap-2"
          disabled={!onApply || !brief.tags.length}
          onClick={() => {
            onApply?.({ tags: brief.tags });
            toast.success("Brief tags applied.");
          }}
        >
          <Tags className="size-4" />
          Apply tags
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-2"
          onClick={() => {
            void copyChecklist();
          }}
        >
          <Clipboard className="size-4" />
          Copy checklist
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {brief.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BriefList
          title="Arrangement"
          items={brief.arrangement.map((item) => `${item.section}: ${item.purpose}`)}
        />
        <BriefList title="Production" items={brief.productionNotes} />
        <BriefList title="Release" items={brief.releaseChecklist} />
        <div className="rounded-md border border-white/10 p-3 text-sm">
          <p className="font-medium">Tempo and key</p>
          <p className="mt-2 text-muted-foreground">
            {brief.bpmRange} / {brief.keySuggestion}
          </p>
        </div>
      </div>
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-white/10 p-3">
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
