import type {
  WorkshopAgendaBlock,
  WorkshopFacilitationPackId,
} from "@/features/editor/types";

export type WorkshopBoardColumn = {
  title: string;
  prompt: string;
  color: string;
  accent: string;
  notes: string[];
};

export type WorkshopFacilitationPack = {
  id: WorkshopFacilitationPackId;
  name: string;
  description: string;
  facilitatorScript: string;
  recapPrompt: string;
  agendaBlocks: WorkshopAgendaBlock[];
  boardColumns: WorkshopBoardColumn[];
};

export const workshopFacilitationPacks = [
  {
    id: "design-sprint",
    name: "Design sprint",
    description:
      "Map the problem, sketch options, decide, and move into a test plan.",
    facilitatorScript:
      "Open by naming the customer, the constraint, and the decision deadline. Keep ideation quiet before discussion, then vote on the notes that create the clearest next prototype.",
    recapPrompt:
      "Summarize the winning direction, unresolved risks, and the prototype owner.",
    agendaBlocks: [
      {
        id: "sprint-map",
        title: "Map",
        minutes: 12,
        prompt: "What has to be true for this design to work?",
      },
      {
        id: "sprint-sketch",
        title: "Sketch",
        minutes: 15,
        prompt: "Sketch one solution without defending it yet.",
      },
      {
        id: "sprint-decide",
        title: "Decide",
        minutes: 10,
        prompt: "Vote for the direction that reduces the biggest risk.",
      },
      {
        id: "sprint-test",
        title: "Test plan",
        minutes: 8,
        prompt: "Define the fastest useful validation step.",
      },
    ],
    boardColumns: [
      {
        title: "Problem",
        prompt: "Where is the user stuck?",
        color: "#fef3c7",
        accent: "#d97706",
        notes: ["User pain", "Business goal", "Constraint"],
      },
      {
        title: "Options",
        prompt: "What could we try?",
        color: "#dbeafe",
        accent: "#2563eb",
        notes: ["Sketch A", "Sketch B", "Wild card"],
      },
      {
        title: "Decision",
        prompt: "What should move forward?",
        color: "#dcfce7",
        accent: "#16a34a",
        notes: ["Chosen path", "Risk", "Owner"],
      },
    ],
  },
  {
    id: "retro",
    name: "Team retro",
    description:
      "Collect signals, choose improvements, and leave with clear owners.",
    facilitatorScript:
      "Start with facts before feelings. Give everyone quiet writing time, cluster similar notes, vote on the highest-leverage improvement, and end with one owner per action.",
    recapPrompt:
      "Summarize what to keep, what to change, and the committed action owners.",
    agendaBlocks: [
      {
        id: "retro-warmup",
        title: "Warmup",
        minutes: 5,
        prompt: "What changed since the last retro?",
      },
      {
        id: "retro-signals",
        title: "Signals",
        minutes: 12,
        prompt: "What helped or blocked the work?",
      },
      {
        id: "retro-prioritize",
        title: "Prioritize",
        minutes: 8,
        prompt: "Which improvement matters most next?",
      },
      {
        id: "retro-actions",
        title: "Actions",
        minutes: 10,
        prompt: "Who owns the smallest useful next step?",
      },
    ],
    boardColumns: [
      {
        title: "Keep",
        prompt: "What should continue?",
        color: "#dcfce7",
        accent: "#15803d",
        notes: ["Habit to keep", "Strength", "Bright spot"],
      },
      {
        title: "Change",
        prompt: "What should improve?",
        color: "#fee2e2",
        accent: "#dc2626",
        notes: ["Friction", "Delay", "Confusion"],
      },
      {
        title: "Try next",
        prompt: "What is the experiment?",
        color: "#e0e7ff",
        accent: "#4f46e5",
        notes: ["Action", "Owner", "Check-in"],
      },
    ],
  },
  {
    id: "decision-room",
    name: "Decision room",
    description:
      "Frame options, tradeoffs, decision criteria, and follow-through.",
    facilitatorScript:
      "Write the decision in one sentence. Separate options from criteria, force visible tradeoffs, and close with the smallest reversible commitment when confidence is not absolute.",
    recapPrompt:
      "Summarize the selected option, tradeoff accepted, and review date.",
    agendaBlocks: [
      {
        id: "decision-frame",
        title: "Frame",
        minutes: 8,
        prompt: "What decision are we actually making?",
      },
      {
        id: "decision-options",
        title: "Options",
        minutes: 12,
        prompt: "What choices are realistically on the table?",
      },
      {
        id: "decision-criteria",
        title: "Criteria",
        minutes: 8,
        prompt: "What makes a choice good enough?",
      },
      {
        id: "decision-commit",
        title: "Commit",
        minutes: 7,
        prompt: "What will we do, and when will we review it?",
      },
    ],
    boardColumns: [
      {
        title: "Options",
        prompt: "What are the viable paths?",
        color: "#f1f5f9",
        accent: "#475569",
        notes: ["Option 1", "Option 2", "No-go option"],
      },
      {
        title: "Tradeoffs",
        prompt: "What do we gain or lose?",
        color: "#ffedd5",
        accent: "#ea580c",
        notes: ["Cost", "Risk", "Dependency"],
      },
      {
        title: "Commitment",
        prompt: "What is the decision?",
        color: "#ccfbf1",
        accent: "#0f766e",
        notes: ["Decision", "Owner", "Review date"],
      },
    ],
  },
  {
    id: "content-planning",
    name: "Content planning",
    description:
      "Turn campaign goals into channels, content slots, owners, and dates.",
    facilitatorScript:
      "Start from the audience promise. Map channels by job, break content into reusable pieces, then assign the first publishing batch before leaving the board.",
    recapPrompt:
      "Summarize the content pillars, first publishing batch, and owners.",
    agendaBlocks: [
      {
        id: "content-audience",
        title: "Audience",
        minutes: 8,
        prompt: "Who is this for and what should they do next?",
      },
      {
        id: "content-pillars",
        title: "Pillars",
        minutes: 12,
        prompt: "What themes can repeat without feeling repetitive?",
      },
      {
        id: "content-channel",
        title: "Channels",
        minutes: 10,
        prompt: "Where should each idea live?",
      },
      {
        id: "content-schedule",
        title: "Schedule",
        minutes: 10,
        prompt: "What ships first and who owns it?",
      },
    ],
    boardColumns: [
      {
        title: "Audience promise",
        prompt: "What are we helping people do?",
        color: "#fae8ff",
        accent: "#c026d3",
        notes: ["Audience", "Promise", "Proof"],
      },
      {
        title: "Reusable pieces",
        prompt: "What can become multiple assets?",
        color: "#dbeafe",
        accent: "#1d4ed8",
        notes: ["Post", "Email", "Video"],
      },
      {
        title: "Publishing batch",
        prompt: "What ships first?",
        color: "#dcfce7",
        accent: "#16a34a",
        notes: ["Owner", "Date", "Channel"],
      },
    ],
  },
] satisfies WorkshopFacilitationPack[];

export function getWorkshopFacilitationPack(
  id: WorkshopFacilitationPackId | null | undefined,
) {
  return (
    workshopFacilitationPacks.find((pack) => pack.id === id) ??
    (workshopFacilitationPacks[0] as WorkshopFacilitationPack)
  );
}
