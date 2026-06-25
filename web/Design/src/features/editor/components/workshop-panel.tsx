"use client";

import { useMemo, useState } from "react";
import { StickyNote } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { WorkshopAnalyticsPanel } from "@/features/editor/components/workshop-analytics-panel";
import { WorkshopFacilitationPackControls } from "@/features/editor/components/workshop-facilitation-pack-controls";
import { WorkshopFacilitatorControls } from "@/features/editor/components/workshop-facilitator-controls";
import { WorkshopVoteTargetRow } from "@/features/editor/components/workshop-vote-target-row";
import { workshopStageLabels } from "@/features/editor/components/workshop-ui-options";
import { createPanelWindow } from "@/features/editor/panel-list-window";
import type {
  DesignElement,
  DesignPage,
  WorkshopSessionState,
} from "@/features/editor/types";
import {
  createClearWorkshopSignalsUpdate,
  createWorkshopSessionSummary,
  isWorkshopVotableElement,
} from "@/features/editor/workshop-analytics";

type ElementUpdate = {
  elementId: string;
  updates: Partial<DesignElement>;
};

type WorkshopPanelProps = {
  page: DesignPage;
  selectedElementIds: string[];
  onSelectElement: (elementId: string) => void;
  onAddWorkshopTimer: (minutes: number) => void;
  onUpdateElement: (elementId: string, updates: Partial<DesignElement>) => void;
  onUpdateElements: (updates: ElementUpdate[]) => void;
  onApplyWorkshopPack: (
    elements: DesignElement[],
    sessionUpdates: Partial<WorkshopSessionState>,
  ) => void;
  onUpdateWorkshopSession: (updates: Partial<WorkshopSessionState>) => void;
};

export function WorkshopPanel({
  page,
  selectedElementIds,
  onSelectElement,
  onAddWorkshopTimer,
  onUpdateElement,
  onUpdateElements,
  onApplyWorkshopPack,
  onUpdateWorkshopSession,
}: WorkshopPanelProps) {
  const [showAllVoteTargets, setShowAllVoteTargets] = useState(false);
  const selectedElementIdSet = useMemo(
    () => new Set(selectedElementIds),
    [selectedElementIds],
  );
  const voteTargets = useMemo(
    () => page.elements.filter(isWorkshopVotableElement),
    [page.elements],
  );
  const summary = createWorkshopSessionSummary(page);
  const session = summary.session;
  const selectedSpotlightCandidate =
    selectedElementIds.length === 1
      ? voteTargets.find((element) => element.id === selectedElementIds[0])
      : null;
  const voteTargetWindow = useMemo(
    () =>
      showAllVoteTargets
        ? {
            items: voteTargets,
            hiddenCount: 0,
            isWindowed: false,
          }
        : createPanelWindow(voteTargets, {
            activeIds: [
              ...selectedElementIds,
              session.spotlightElementId ?? "",
            ],
            limit: 60,
          }),
    [
      selectedElementIds,
      session.spotlightElementId,
      showAllVoteTargets,
      voteTargets,
    ],
  );

  return (
    <details className="group border-t border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">Workshop</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            Voting, reactions, and recap signals
          </span>
        </span>
        <Badge variant={session.stage === "live" ? "secondary" : "outline"}>
          {workshopStageLabels[session.stage]}
        </Badge>
      </summary>
      <Separator />
      <div className="space-y-3 p-3">
        <WorkshopFacilitatorControls
          session={session}
          selectedSpotlightCandidate={selectedSpotlightCandidate}
          onAddWorkshopTimer={onAddWorkshopTimer}
          onUpdateWorkshopSession={onUpdateWorkshopSession}
          onClearSignals={() =>
            onUpdateElements(
              voteTargets.map((element) => ({
                elementId: element.id,
                updates:
                  createClearWorkshopSignalsUpdate() as Partial<DesignElement>,
              })),
            )
          }
          hasSignals={summary.totalSignals > 0}
        />
        <WorkshopFacilitationPackControls
          page={page}
          session={session}
          onApplyWorkshopPack={onApplyWorkshopPack}
          onUpdateWorkshopSession={onUpdateWorkshopSession}
        />
        <WorkshopAnalyticsPanel summary={summary} />
      </div>
      <ScrollArea className="max-h-96">
        <div className="flex flex-col gap-2 p-3 pt-0">
          {voteTargets.length ? (
            <>
              {voteTargetWindow.items.map((element) => (
                <WorkshopVoteTargetRow
                  key={element.id}
                  element={element}
                  selected={selectedElementIdSet.has(element.id)}
                  spotlighted={session.spotlightElementId === element.id}
                  votingOpen={session.votingOpen}
                  reactionsOpen={session.reactionsOpen}
                  onSelectElement={onSelectElement}
                  onUpdateElement={onUpdateElement}
                  onSpotlightElement={(elementId) =>
                    onUpdateWorkshopSession({ spotlightElementId: elementId })
                  }
                />
              ))}
              {voteTargetWindow.isWindowed || showAllVoteTargets ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAllVoteTargets((current) => !current)}
                >
                  {showAllVoteTargets
                    ? "Collapse workshop targets"
                    : `Show ${voteTargetWindow.hiddenCount} more targets`}
                </Button>
              ) : null}
            </>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              <StickyNote className="mx-auto mb-2 h-4 w-4" />
              Add notes, cards, text, shapes, or media to start voting.
            </div>
          )}
        </div>
      </ScrollArea>
    </details>
  );
}
