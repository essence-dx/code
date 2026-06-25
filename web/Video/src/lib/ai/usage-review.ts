import type { AiUsageAction } from "@/lib/ai/schemas";

export type PublicAiUsageStatus = "complete" | "failed" | "rate_limited";

export interface AiUsageReviewRow {
  action: AiUsageAction;
  status: PublicAiUsageStatus;
  promptChars: number;
  outputChars: number;
  createdAt: Date;
}

export interface PublicAiUsageEvent {
  action: AiUsageAction;
  status: PublicAiUsageStatus;
  result: "Completed" | "Needs retry" | "Limited";
  promptChars: number;
  outputChars: number;
  createdAt: string;
}

export function sanitizeAiUsageEvent(row: AiUsageReviewRow): PublicAiUsageEvent {
  return {
    action: row.action,
    status: row.status,
    result: resultFromStatus(row.status),
    promptChars: row.promptChars,
    outputChars: row.outputChars,
    createdAt: row.createdAt.toISOString(),
  };
}

export function summarizeAiUsageEvents(events: PublicAiUsageEvent[]) {
  return events.reduce(
    (summary, event) => {
      summary.total += 1;
      summary.promptChars += event.promptChars;
      summary.outputChars += event.outputChars;
      summary[event.status] += 1;
      return summary;
    },
    {
      total: 0,
      complete: 0,
      failed: 0,
      rate_limited: 0,
      promptChars: 0,
      outputChars: 0,
    },
  );
}

function resultFromStatus(status: PublicAiUsageStatus): PublicAiUsageEvent["result"] {
  if (status === "complete") return "Completed";
  if (status === "rate_limited") return "Limited";
  return "Needs retry";
}
