"use client";

import { BrainCircuit, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  customModelCardSummary,
  type CustomModelCard,
} from "@/features/ai/custom-model-cards";

type CustomModelCardsPanelProps = {
  cards: CustomModelCard[];
  exportCards: () => string;
  onRemove: (id: string) => void;
};

export function CustomModelCardsPanel({
  cards,
  exportCards,
  onRemove,
}: CustomModelCardsPanelProps) {
  function exportLibrary() {
    const blob = new Blob([exportCards()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "essence-suno-custom-model-cards.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] lg:col-span-2">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuit className="size-4 text-emerald-200" />
            Custom model cards
          </CardTitle>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            disabled={!cards.length}
            onClick={exportLibrary}
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cards.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="rounded-md border border-white/10 bg-slate-950/50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{card.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {customModelCardSummary(card) || "No model details yet"}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      card.rightsConfirmed
                        ? "bg-emerald-400/15 text-emerald-200"
                        : "bg-rose-400/15 text-rose-200"
                    }
                  >
                    {card.rightsConfirmed ? "confirmed" : "blocked"}
                  </Badge>
                </div>
                <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">
                  {card.constraints || card.recommendedUse || card.modelIntent}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2"
                    onClick={() => {
                      onRemove(card.id);
                      toast.success("Model card deleted.");
                    }}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-white/10 bg-slate-950/50 p-4 text-sm text-muted-foreground">
            Completed training jobs will appear here as reusable model cards.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
