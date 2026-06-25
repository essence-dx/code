import type { ReviewTaskStatus } from "@/features/editor/types";

export const reviewTaskStatuses = ["todo", "in-progress", "done"] as const;

export const reviewTaskStatusLabels: Record<
  Exclude<ReviewTaskStatus, "none">,
  string
> = {
  todo: "To do",
  "in-progress": "In progress",
  done: "Done",
};

export function getReviewTaskStatusLabel(status: ReviewTaskStatus) {
  return status === "none" ? "No task" : reviewTaskStatusLabels[status];
}

export function normalizeReviewTaskStatus(value: unknown): ReviewTaskStatus {
  if (value === "todo" || value === "in-progress" || value === "done") {
    return value;
  }

  return "none";
}

export function normalizeReviewTaskOwner(value: unknown) {
  const owner = typeof value === "string" ? value.trim().slice(0, 80) : "";

  return owner || "Unassigned";
}

export function parseReviewTaskDueDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function isReviewTaskOverdue(input: {
  taskStatus: ReviewTaskStatus;
  taskDueAt: string | null;
  now?: Date;
}) {
  if (input.taskStatus === "none" || input.taskStatus === "done") return false;
  if (!input.taskDueAt) return false;

  const dueAt = new Date(input.taskDueAt);
  const now = input.now ?? new Date();

  if (Number.isNaN(dueAt.getTime())) return false;

  return dueAt.getTime() < startOfToday(now).getTime();
}

function startOfToday(date: Date) {
  const today = new Date(date);

  today.setHours(0, 0, 0, 0);

  return today;
}
