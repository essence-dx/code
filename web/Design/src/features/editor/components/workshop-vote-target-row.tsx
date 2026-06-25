import { Crosshair, Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkshopLayerIcon } from "@/features/editor/components/workshop-layer-icon";
import { workshopReactionOptions } from "@/features/editor/components/workshop-ui-options";
import type { DesignElement } from "@/features/editor/types";
import {
  createWorkshopReactionUpdate,
  getWorkshopReactionCount,
  getWorkshopVoteCount,
  workshopLayerName,
} from "@/features/editor/workshop-analytics";
import { cn } from "@/lib/utils";

export function WorkshopVoteTargetRow({
  element,
  selected,
  spotlighted,
  votingOpen,
  reactionsOpen,
  onSelectElement,
  onUpdateElement,
  onSpotlightElement,
}: {
  element: DesignElement;
  selected: boolean;
  spotlighted: boolean;
  votingOpen: boolean;
  reactionsOpen: boolean;
  onSelectElement: (elementId: string) => void;
  onUpdateElement: (elementId: string, updates: Partial<DesignElement>) => void;
  onSpotlightElement: (elementId: string) => void;
}) {
  const votes = getWorkshopVoteCount(element);
  const reactionTotal = getWorkshopReactionCount(element);

  return (
    <article
      className={cn(
        "rounded-md border border-border bg-background p-2",
        selected && "border-primary bg-primary/5",
        spotlighted && "ring-2 ring-amber-400",
      )}
    >
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="h-8 min-w-0 flex-1 justify-start gap-2 px-2"
          onClick={() => onSelectElement(element.id)}
        >
          <WorkshopLayerIcon element={element} />
          <span className="truncate text-xs font-medium">
            {workshopLayerName(element)}
          </span>
        </Button>
        <Button
          variant={spotlighted ? "secondary" : "outline"}
          size="icon"
          title="Spotlight layer"
          aria-label="Spotlight layer"
          onClick={() => onSpotlightElement(element.id)}
        >
          <Crosshair className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            disabled={!votingOpen || votes === 0}
            onClick={() =>
              onUpdateElement(element.id, {
                workshopVotes: Math.max(0, votes - 1),
              } as Partial<DesignElement>)
            }
            aria-label="Remove vote"
            title="Remove vote"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="flex min-w-9 items-center justify-center text-xs font-semibold">
            {votes}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={!votingOpen}
            onClick={() =>
              onUpdateElement(element.id, {
                workshopVotes: votes + 1,
              } as Partial<DesignElement>)
            }
            aria-label="Add vote"
            title="Add vote"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Badge variant="outline">{reactionTotal} reactions</Badge>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1">
        {workshopReactionOptions.map(({ kind, label, Icon }) => (
          <Button
            key={kind}
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            disabled={!reactionsOpen}
            onClick={() =>
              onUpdateElement(
                element.id,
                createWorkshopReactionUpdate(element, kind, 1),
              )
            }
            title={label}
            aria-label={`Add ${label.toLowerCase()} reaction`}
          >
            <Icon className="h-3.5 w-3.5" />
            {getWorkshopReactionCount(element, kind)}
          </Button>
        ))}
      </div>
    </article>
  );
}
