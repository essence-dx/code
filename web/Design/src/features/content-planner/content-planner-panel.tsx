"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  MoveRight,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  contentPlannerChannels,
  type ContentScheduleSummary,
} from "@/db/content-planner";
import { toPlannerDatetimeLocalInputValue } from "@/features/content-planner/content-calendar";
import { ContentPlannerCalendar } from "@/features/content-planner/content-planner-calendar";
import {
  getContentPlannerCopy,
  type ContentPlannerCopy,
} from "@/features/content-planner/content-planner-localization";
import {
  createSocialPublishingText,
  getSocialPublisherHref,
  getSocialPublishingTarget,
} from "@/features/content-planner/social-publishing";
import type { EditorLocale } from "@/features/editor/editor-localization";
import type { ProjectSummary } from "@/features/editor/types";

type ServerAction = (formData: FormData) => Promise<void> | void;

type ContentPlannerPanelProps = {
  locale: EditorLocale;
  projects: ProjectSummary[];
  items: ContentScheduleSummary[];
  createAction: ServerAction;
  rescheduleAction: ServerAction;
  updateStatusAction: ServerAction;
  deleteAction: ServerAction;
};

export function ContentPlannerPanel({
  locale,
  projects,
  items,
  createAction,
  rescheduleAction,
  updateStatusAction,
  deleteAction,
}: ContentPlannerPanelProps) {
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const activeProjects = projects.filter((project) => !project.deletedAt);
  const copy = getContentPlannerCopy(locale);

  async function copyPublishingText(item: ContentScheduleSummary) {
    await navigator.clipboard.writeText(createSocialPublishingText(item));
    setCopiedItemId(item.id);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={createAction} className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="content-planner-project">{copy.design}</Label>
            <select
              id="content-planner-project"
              name="projectId"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              required
            >
              <option value="">{copy.selectDesign}</option>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content-planner-channel">{copy.channel}</Label>
            <select
              id="content-planner-channel"
              name="channel"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              defaultValue="Instagram"
            >
              {contentPlannerChannels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content-planner-date">{copy.date}</Label>
            <input
              id="content-planner-date"
              name="scheduledAt"
              type="datetime-local"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              required
            />
          </div>
          <div className="space-y-2 md:col-span-4">
            <Label htmlFor="content-planner-caption">{copy.caption}</Label>
            <Textarea
              id="content-planner-caption"
              name="caption"
              placeholder={copy.captionPlaceholder}
              maxLength={500}
            />
          </div>
          <Button type="submit" className="md:col-span-4">
            <CalendarClock className="h-4 w-4" />
            {copy.scheduleDesign}
          </Button>
        </form>

        <ContentPlannerCalendar
          locale={locale}
          items={items}
          copy={copy}
          rescheduleAction={rescheduleAction}
        />

        {items.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <ScheduleItemCard
                key={item.id}
                item={item}
                copied={copiedItemId === item.id}
                copy={copy}
                onCopy={() => void copyPublishingText(item)}
                rescheduleAction={rescheduleAction}
                updateStatusAction={updateStatusAction}
                deleteAction={deleteAction}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            {copy.empty}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScheduleItemCard({
  item,
  copied,
  copy,
  onCopy,
  rescheduleAction,
  updateStatusAction,
  deleteAction,
}: {
  item: ContentScheduleSummary;
  copied: boolean;
  copy: ContentPlannerCopy;
  onCopy: () => void;
  rescheduleAction: ServerAction;
  updateStatusAction: ServerAction;
  deleteAction: ServerAction;
}) {
  const target = getSocialPublishingTarget(item.channel);
  const publisherHref = getSocialPublisherHref(item);

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{item.title}</h3>
          <p className="text-xs text-muted-foreground">
            {copy.itemSchedule(
              item.channel,
              new Date(item.scheduledAt).toLocaleString(),
            )}
          </p>
        </div>
        <Badge variant={item.status === "planned" ? "secondary" : "outline"}>
          {copy.status[item.status]}
        </Badge>
      </div>
      {item.caption ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {item.caption}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCopy}>
          <Clipboard className="h-4 w-4" />
          {copied ? copy.copied : copy.copyCaption}
        </Button>
        <Button asChild variant="outline" size="sm">
          <a
            href={publisherHref}
            target={publisherHref.startsWith("http") ? "_blank" : undefined}
            rel={publisherHref.startsWith("http") ? "noreferrer" : undefined}
          >
            <ExternalLink className="h-4 w-4" />
            {copy.publisherLabel(item, target.label)}
          </a>
        </Button>
        {item.projectId ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/editor/${item.projectId}`}>{copy.openDesign}</Link>
          </Button>
        ) : null}
        {item.status === "planned" ? (
          <form action={rescheduleAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="itemId" value={item.id} />
            <input
              aria-label={copy.rescheduleDate ?? "Reschedule date"}
              name="scheduledAt"
              type="datetime-local"
              defaultValue={toPlannerDatetimeLocalInputValue(item.scheduledAt)}
              className="h-8 min-w-40 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              required
            />
            <Button type="submit" variant="outline" size="sm">
              <MoveRight className="h-4 w-4" />
              {copy.reschedule ?? "Reschedule"}
            </Button>
          </form>
        ) : null}
        {item.status !== "published" ? (
          <form action={updateStatusAction}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="status" value="published" />
            <Button type="submit" variant="outline" size="sm">
              <CheckCircle2 className="h-4 w-4" />
              {copy.published}
            </Button>
          </form>
        ) : null}
        <form action={deleteAction}>
          <input type="hidden" name="itemId" value={item.id} />
          <Button type="submit" variant="ghost" size="sm">
            <Trash2 className="h-4 w-4" />
            {copy.remove}
          </Button>
        </form>
      </div>
      {target.manualUpload ? (
        <p className="text-[11px] text-muted-foreground">
          {copy.manualUploadHint}
        </p>
      ) : null}
    </div>
  );
}
