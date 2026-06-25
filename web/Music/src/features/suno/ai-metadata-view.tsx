"use client";

import { Clipboard, Tags, Type } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EditableSongPatch } from "@/features/library/types";
import type { MetadataSuggestion } from "@/lib/ai/schemas";

export function AiMetadataView({
  metadata,
  onApply,
}: {
  metadata?: MetadataSuggestion;
  onApply?: (patch: EditableSongPatch) => void;
}) {
  if (!metadata) {
    return null;
  }

  async function copyReleaseCopy() {
    if (!metadata?.releaseCopy || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(metadata.releaseCopy);
    toast.success("Release copy copied.");
  }

  return (
    <div className="space-y-4 rounded-md border border-white/10 bg-slate-950/50 p-4">
      <div>
        <p className="text-sm font-medium">Metadata suggestions</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {metadata.description}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="gap-2"
          disabled={!onApply || !metadata.titles[0]}
          onClick={() => {
            if (metadata.titles[0]) {
              onApply?.({ title: metadata.titles[0] });
              toast.success("Suggested title applied.");
            }
          }}
        >
          <Type className="size-4" />
          Apply title
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="gap-2"
          disabled={!onApply || !metadata.tags.length}
          onClick={() => {
            onApply?.({ tags: metadata.tags });
            toast.success("Suggested tags applied.");
          }}
        >
          <Tags className="size-4" />
          Apply tags
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-2"
          disabled={!metadata.releaseCopy}
          onClick={() => {
            void copyReleaseCopy();
          }}
        >
          <Clipboard className="size-4" />
          Copy release copy
        </Button>
      </div>
      <MetadataSection title="Title options" items={metadata.titles} />
      <div className="flex flex-wrap gap-2">
        {metadata.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <MetadataFact label="Mood" value={metadata.mood} />
        <MetadataFact label="Tempo" value={metadata.bpmGuess} />
      </div>
      <div className="rounded-md border border-white/10 p-3 text-sm text-muted-foreground">
        {metadata.releaseCopy}
      </div>
    </div>
  );
}

function MetadataSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-md border border-white/10 p-3">
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function MetadataFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 p-3 text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
