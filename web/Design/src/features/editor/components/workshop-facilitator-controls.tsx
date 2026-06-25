import {
  Clock3,
  Crosshair,
  EyeOff,
  PauseCircle,
  PlayCircle,
  Presentation,
  RotateCcw,
  TimerReset,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  DesignElement,
  WorkshopSessionStage,
  WorkshopSessionState,
} from "@/features/editor/types";
import {
  type NormalizedWorkshopSession,
  workshopSessionStages,
} from "@/features/editor/workshop-analytics";
import { workshopStageLabels } from "@/features/editor/components/workshop-ui-options";

export function WorkshopFacilitatorControls({
  session,
  selectedSpotlightCandidate,
  hasSignals,
  onAddWorkshopTimer,
  onUpdateWorkshopSession,
  onClearSignals,
}: {
  session: NormalizedWorkshopSession;
  selectedSpotlightCandidate: DesignElement | null | undefined;
  hasSignals: boolean;
  onAddWorkshopTimer: (minutes: number) => void;
  onUpdateWorkshopSession: (updates: Partial<WorkshopSessionState>) => void;
  onClearSignals: () => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold">Facilitator controls</div>
          <div className="text-[11px] text-muted-foreground">
            Session state is saved with this page.
          </div>
        </div>
        {session.stage === "live" ? (
          <PlayCircle className="h-4 w-4 text-emerald-600" />
        ) : session.stage === "paused" ? (
          <PauseCircle className="h-4 w-4 text-amber-500" />
        ) : (
          <Presentation className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="workshop-stage" className="text-xs">
          Stage
        </Label>
        <Select
          value={session.stage}
          onValueChange={(value) =>
            onUpdateWorkshopSession({ stage: value as WorkshopSessionStage })
          }
        >
          <SelectTrigger id="workshop-stage" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {workshopSessionStages.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {workshopStageLabels[stage]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => onAddWorkshopTimer(5)}
        >
          <Clock3 className="h-3.5 w-3.5" />
          5 min
        </Button>
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => onAddWorkshopTimer(10)}
        >
          <TimerReset className="h-3.5 w-3.5" />
          10 min
        </Button>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="workshop-participants" className="text-xs">
          Participants
        </Label>
        <Input
          id="workshop-participants"
          type="number"
          min={0}
          max={999}
          value={session.participantCount}
          onChange={(event) =>
            onUpdateWorkshopSession({
              participantCount: Number(event.target.value),
            })
          }
        />
      </div>
      <div className="grid gap-2">
        <WorkshopToggle
          id="workshop-voting-open"
          checked={session.votingOpen}
          label="Voting open"
          description="Enable vote controls for this page."
          onCheckedChange={(votingOpen) =>
            onUpdateWorkshopSession({ votingOpen })
          }
        />
        <WorkshopToggle
          id="workshop-reactions-open"
          checked={session.reactionsOpen}
          label="Reactions open"
          description="Enable insight, question, and concern signals."
          onCheckedChange={(reactionsOpen) =>
            onUpdateWorkshopSession({ reactionsOpen })
          }
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="workshop-note" className="text-xs">
          Facilitator note
        </Label>
        <Textarea
          id="workshop-note"
          value={session.facilitatorNote}
          maxLength={240}
          placeholder="Capture the next prompt, decision, or recap note."
          onChange={(event) =>
            onUpdateWorkshopSession({ facilitatorNote: event.target.value })
          }
        />
      </div>
      <div className="grid gap-2">
        <Button
          variant="outline"
          className="justify-start"
          disabled={!selectedSpotlightCandidate}
          onClick={() =>
            selectedSpotlightCandidate
              ? onUpdateWorkshopSession({
                  spotlightElementId: selectedSpotlightCandidate.id,
                })
              : undefined
          }
        >
          <Crosshair className="h-3.5 w-3.5" />
          Spotlight selection
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="justify-start"
            disabled={!session.spotlightElementId}
            onClick={() => onUpdateWorkshopSession({ spotlightElementId: null })}
          >
            <EyeOff className="h-3.5 w-3.5" />
            Clear focus
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            disabled={!hasSignals}
            onClick={onClearSignals}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear signals
          </Button>
        </div>
      </div>
    </div>
  );
}

function WorkshopToggle({
  id,
  checked,
  label,
  description,
  onCheckedChange,
}: {
  id: string;
  checked: boolean;
  label: string;
  description: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-2">
      <div>
        <Label htmlFor={id} className="text-xs font-medium">
          {label}
        </Label>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
