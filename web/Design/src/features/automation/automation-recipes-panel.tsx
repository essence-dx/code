"use client";

import { Bot, CalendarClock, FileDown, Megaphone, Repeat2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AutomationRecipeId,
  AutomationRecipeSummary,
} from "@/features/automation/automation-recipes";
import { toPlannerDatetimeLocalInputValue } from "@/features/content-planner/content-calendar";

type ServerAction = (formData: FormData) => Promise<void> | void;

type AutomationRecipesPanelProps = {
  recipes: AutomationRecipeSummary[];
  applyRecipeAction: ServerAction;
};

const recipeIcons: Record<AutomationRecipeId, LucideIcon> = {
  "scheduled-export": FileDown,
  "publishing-reminder": CalendarClock,
  "review-nudge": Megaphone,
  "campaign-cadence": Repeat2,
};

export function AutomationRecipesPanel({
  recipes,
  applyRecipeAction,
}: AutomationRecipesPanelProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Automation recipes
            </CardTitle>
            <CardDescription>
              Reusable one-click workflows for exports, publishing reminders, review nudges, and campaign cadence.
            </CardDescription>
          </div>
          <Badge variant="secondary">{recipes.length} recipes</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 xl:grid-cols-2">
        {recipes.map((recipe) => (
          <AutomationRecipeCard
            key={recipe.id}
            recipe={recipe}
            applyRecipeAction={applyRecipeAction}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function AutomationRecipeCard({
  recipe,
  applyRecipeAction,
}: {
  recipe: AutomationRecipeSummary;
  applyRecipeAction: ServerAction;
}) {
  const Icon = recipeIcons[recipe.id];
  const firstTarget = recipe.targets[0] ?? null;

  return (
    <article className="rounded-md border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4" />
            {recipe.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {recipe.description}
          </p>
        </div>
        <Badge variant={recipe.disabledReason ? "outline" : "secondary"}>
          {recipe.disabledReason ? "Needs setup" : "Ready"}
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {recipe.metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-md border border-border bg-muted/20 p-2"
          >
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-1 text-lg font-semibold">{metric.value}</p>
          </div>
        ))}
      </div>

      {recipe.disabledReason ? (
        <p className="mt-3 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          {recipe.disabledReason}
        </p>
      ) : (
        <form action={applyRecipeAction} className="mt-3 grid gap-3">
          <input type="hidden" name="recipeId" value={recipe.id} />
          <div className="space-y-2">
            <Label>{recipe.targetLabel}</Label>
            <Select name="targetId" defaultValue={firstTarget?.id}>
              <SelectTrigger className="w-full" aria-label={recipe.targetLabel}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recipe.targets.map((target) => (
                  <SelectItem key={target.id} value={target.id}>
                    {target.label} - {target.helper}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_96px]">
            <div className="space-y-2">
              <Label htmlFor={`${recipe.id}-start-at`}>Start</Label>
              <Input
                id={`${recipe.id}-start-at`}
                name="startAt"
                type="datetime-local"
                defaultValue={toPlannerDatetimeLocalInputValue(
                  recipe.defaultStartAt,
                )}
              />
            </div>
            {recipe.cadenceDays ? (
              <div className="space-y-2">
                <Label htmlFor={`${recipe.id}-cadence`}>Days</Label>
                <Input
                  id={`${recipe.id}-cadence`}
                  name="cadenceDays"
                  type="number"
                  min={1}
                  max={30}
                  defaultValue={recipe.cadenceDays}
                />
              </div>
            ) : (
              <input type="hidden" name="cadenceDays" value="" />
            )}
          </div>
          <Button type="submit">
            <Icon className="h-4 w-4" />
            {recipe.actionLabel}
          </Button>
        </form>
      )}
    </article>
  );
}
