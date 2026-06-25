"use client";

import { ClipboardCheck, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReviewTaskSummary } from "@/db/project-comments";
import {
  getReviewTaskStatusLabel,
  isReviewTaskOverdue,
  reviewTaskStatuses,
} from "@/features/review/review-tasks";

type ServerAction = (formData: FormData) => Promise<void> | void;

type ReviewTasksPanelProps = {
  tasks: ReviewTaskSummary[];
  updateTaskStatusAction: ServerAction;
};

export function ReviewTasksPanel({
  tasks,
  updateTaskStatusAction,
}: ReviewTasksPanelProps) {
  const openTasks = tasks.filter((task) => task.taskStatus !== "done");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Review tasks
            </CardTitle>
            <CardDescription>
              Track assigned work created from project comments.
            </CardDescription>
          </div>
          <Badge variant="secondary">{openTasks.length} open</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {tasks.slice(0, 8).map((task) => (
              <ReviewTaskCard
                key={task.id}
                task={task}
                updateTaskStatusAction={updateTaskStatusAction}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Create a task from an editor comment to see review work here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewTaskCard({
  task,
  updateTaskStatusAction,
}: {
  task: ReviewTaskSummary;
  updateTaskStatusAction: ServerAction;
}) {
  const overdue = isReviewTaskOverdue(task);

  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/editor/${task.projectId}`}
            className="block truncate text-sm font-semibold hover:underline"
          >
            {task.projectName}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {task.elementId ? "Layer task" : "Page task"} / {task.authorName}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge
            variant={
              task.taskStatus === "done"
                ? "secondary"
                : overdue
                  ? "destructive"
                  : "outline"
            }
          >
            {getReviewTaskStatusLabel(task.taskStatus)}
          </Badge>
          {overdue ? <Badge variant="destructive">Overdue</Badge> : null}
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
        {task.body}
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{task.taskAssigneeName ?? "Unassigned"}</Badge>
        {task.taskDueAt ? (
          <Badge variant="outline">{formatTaskDate(task.taskDueAt)}</Badge>
        ) : null}
      </div>

      <form
        action={updateTaskStatusAction}
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="projectId" value={task.projectId} />
        <input type="hidden" name="commentId" value={task.id} />
        <select
          name="taskStatus"
          defaultValue={task.taskStatus}
          className="h-9 min-w-36 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {reviewTaskStatuses.map((status) => (
            <option key={status} value={status}>
              {getReviewTaskStatusLabel(status)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Save
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/editor/${task.projectId}`}>
            <ExternalLink className="h-4 w-4" />
            Open
          </Link>
        </Button>
      </form>
    </article>
  );
}

function formatTaskDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}
