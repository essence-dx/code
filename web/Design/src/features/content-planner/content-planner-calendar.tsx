"use client";

import { useMemo, useRef, type DragEvent } from "react";
import { GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ContentScheduleSummary } from "@/db/content-planner";
import {
  buildPlannerCalendarDays,
  createPlannerRescheduleValue,
} from "@/features/content-planner/content-calendar";
import type { ContentPlannerCopy } from "@/features/content-planner/content-planner-localization";
import { cn } from "@/lib/utils";

type ServerAction = (formData: FormData) => Promise<void> | void;

type ContentPlannerCalendarProps = {
  locale: string;
  items: ContentScheduleSummary[];
  copy: ContentPlannerCopy;
  rescheduleAction: ServerAction;
};

const plannerDragType = "application/x-essence-content-schedule-item";

export function ContentPlannerCalendar({
  locale,
  items,
  copy,
  rescheduleAction,
}: ContentPlannerCalendarProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const itemIdRef = useRef<HTMLInputElement>(null);
  const scheduledAtRef = useRef<HTMLInputElement>(null);
  const plannedItems = useMemo(
    () => items.filter((item) => item.status === "planned"),
    [items],
  );
  const days = useMemo(
    () => buildPlannerCalendarDays({ items: plannedItems, locale }),
    [locale, plannedItems],
  );

  function submitReschedule(itemId: string, scheduledAt: string) {
    if (!itemIdRef.current || !scheduledAtRef.current) return;

    itemIdRef.current.value = itemId;
    scheduledAtRef.current.value = scheduledAt;
    formRef.current?.requestSubmit();
  }

  function handleDrop(dateKey: string, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const itemId =
      event.dataTransfer.getData(plannerDragType) ||
      event.dataTransfer.getData("text/plain");
    const item = plannedItems.find((candidate) => candidate.id === itemId);

    if (!item) return;

    submitReschedule(
      item.id,
      createPlannerRescheduleValue(dateKey, item.scheduledAt),
    );
  }

  return (
    <section className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <form ref={formRef} action={rescheduleAction} className="hidden">
        <input ref={itemIdRef} type="hidden" name="itemId" />
        <input ref={scheduledAtRef} type="hidden" name="scheduledAt" />
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">
            {copy.calendarTitle ?? "Publishing calendar"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {copy.calendarDescription ?? "Planned items by day."}
          </p>
        </div>
        <Badge variant="outline">
          {plannedItems.length} {copy.calendarPlannedLabel ?? "planned"}
        </Badge>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => (
          <section
            key={day.key}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(day.key, event)}
            className={cn(
              "min-h-36 rounded-md border border-dashed border-border bg-background p-2 transition-colors",
              day.isToday && "border-primary/50 bg-primary/5",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {day.weekday}
                </p>
                <p className="text-sm font-semibold">{day.label}</p>
              </div>
              {day.items.length ? (
                <Badge variant="secondary">{day.items.length}</Badge>
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              {day.items.length ? (
                day.items.map((item) => (
                  <DraggableCalendarItem
                    key={item.id}
                    item={item}
                    copy={copy}
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border/80 px-2 py-3 text-center text-xs text-muted-foreground">
                  {copy.calendarEmptyDay ?? "No planned items"}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function DraggableCalendarItem({
  item,
  copy,
}: {
  item: ContentScheduleSummary;
  copy: ContentPlannerCopy;
}) {
  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(plannerDragType, item.id);
    event.dataTransfer.setData("text/plain", item.id);
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            aria-label={(copy.calendarMoveLabel ?? "Move scheduled item").replace(
              "{title}",
              item.title,
            )}
            draggable
            onDragStart={handleDragStart}
            role="button"
            tabIndex={0}
            className="grid cursor-grab gap-1 rounded-md border border-border bg-card p-2 text-left shadow-xs outline-none transition hover:border-primary/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs font-medium">{item.title}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="truncate">{item.channel}</span>
              <time dateTime={item.scheduledAt}>
                {new Date(item.scheduledAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {copy.calendarMoveHint ?? "Move to another publishing day"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
