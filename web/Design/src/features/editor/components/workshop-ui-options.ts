import type { LucideIcon } from "lucide-react";
import {
  CircleAlert,
  Lightbulb,
  MessageCircleQuestion,
} from "lucide-react";

import type {
  WorkshopReactionKind,
  WorkshopSessionStage,
} from "@/features/editor/types";

export const workshopStageLabels: Record<WorkshopSessionStage, string> = {
  planning: "Planning",
  live: "Live",
  paused: "Paused",
  recap: "Recap",
};

export const workshopReactionOptions: Array<{
  kind: WorkshopReactionKind;
  label: string;
  Icon: LucideIcon;
}> = [
  { kind: "insight", label: "Insight", Icon: Lightbulb },
  { kind: "question", label: "Question", Icon: MessageCircleQuestion },
  { kind: "concern", label: "Concern", Icon: CircleAlert },
];
