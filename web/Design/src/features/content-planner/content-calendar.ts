import type { ContentScheduleSummary } from "@/db/content-planner";

export const plannerCalendarDayCount = 14;

export type PlannerCalendarDay = {
  key: string;
  label: string;
  weekday: string;
  isToday: boolean;
  items: ContentScheduleSummary[];
};

type BuildPlannerCalendarDaysInput = {
  items: ContentScheduleSummary[];
  startDate?: Date;
  dayCount?: number;
  locale?: string;
};

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const weekdayFormatterCache = new Map<string, Intl.DateTimeFormat>();

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function getValidDate(value: Date | string | number | null | undefined) {
  if (value === null || value === undefined) return null;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getDateFormatter(locale: string) {
  const key = locale || "default";
  const cached = dateFormatterCache.get(key);

  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat(locale || undefined, {
    month: "short",
    day: "numeric",
  });

  dateFormatterCache.set(key, formatter);
  return formatter;
}

function getWeekdayFormatter(locale: string) {
  const key = locale || "default";
  const cached = weekdayFormatterCache.get(key);

  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat(locale || undefined, {
    weekday: "short",
  });

  weekdayFormatterCache.set(key, formatter);
  return formatter;
}

export function toPlannerDateKey(
  value: Date | string | number | null | undefined,
) {
  const date = getValidDate(value);

  if (!date) return "";

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

export function toPlannerDatetimeLocalInputValue(
  value: Date | string | number | null | undefined,
) {
  const date = getValidDate(value);

  if (!date) return "";

  return `${toPlannerDateKey(date)}T${padDatePart(date.getHours())}:${padDatePart(
    date.getMinutes(),
  )}`;
}

export function createPlannerRescheduleValue(
  dateKey: string,
  previousValue: Date | string | number | null | undefined,
) {
  const previous = getValidDate(previousValue);
  const hours = previous ? previous.getHours() : 9;
  const minutes = previous ? previous.getMinutes() : 0;

  return `${dateKey}T${padDatePart(hours)}:${padDatePart(minutes)}`;
}

export function buildPlannerCalendarDays({
  items,
  startDate = new Date(),
  dayCount = plannerCalendarDayCount,
  locale = "",
}: BuildPlannerCalendarDaysInput) {
  const start = startOfLocalDay(startDate);
  const todayKey = toPlannerDateKey(new Date());
  const dateFormatter = getDateFormatter(locale);
  const weekdayFormatter = getWeekdayFormatter(locale);
  const grouped = new Map<string, ContentScheduleSummary[]>();

  for (const item of items) {
    const key = toPlannerDateKey(item.scheduledAt);

    if (!key) continue;

    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  for (const dayItems of grouped.values()) {
    dayItems.sort(
      (left, right) =>
        new Date(left.scheduledAt).getTime() -
        new Date(right.scheduledAt).getTime(),
    );
  }

  return Array.from({ length: Math.max(1, dayCount) }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toPlannerDateKey(date);

    return {
      key,
      label: dateFormatter.format(date),
      weekday: weekdayFormatter.format(date),
      isToday: key === todayKey,
      items: grouped.get(key) ?? [],
    } satisfies PlannerCalendarDay;
  });
}
