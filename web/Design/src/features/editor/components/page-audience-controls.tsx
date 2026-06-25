"use client";

import { nanoid } from "nanoid";
import { HelpCircle, ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDefaultAudienceInteraction,
  normalizeAudienceInteraction,
} from "@/features/editor/presentation-audience";
import type {
  AudienceInteraction,
  AudienceInteractionKind,
} from "@/features/editor/types";

type PageAudienceControlsProps = {
  interaction: AudienceInteraction | undefined;
  onChange: (interaction: AudienceInteraction | undefined) => void;
};

export function PageAudienceControls({
  interaction,
  onChange,
}: PageAudienceControlsProps) {
  const current = interaction
    ? normalizeAudienceInteraction(interaction)
    : undefined;

  function update(updates: Partial<AudienceInteraction>) {
    onChange({
      ...(current ?? createDefaultAudienceInteraction()),
      ...updates,
      id: current?.id ?? nanoid(),
    });
  }

  function changeKind(kind: AudienceInteractionKind) {
    onChange(normalizeAudienceInteraction(current, kind));
  }

  function updateOption(index: number, value: string) {
    if (!current) return;

    update({
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {current?.kind === "qa" ? (
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <h3 className="text-xs font-semibold text-muted-foreground">
            Audience
          </h3>
        </div>
        <Button
          type="button"
          variant={current?.enabled ? "secondary" : "outline"}
          size="sm"
          onClick={() =>
            current
              ? update({ enabled: !current.enabled })
              : onChange(createDefaultAudienceInteraction())
          }
        >
          {current?.enabled ? "Active" : "Enable"}
        </Button>
      </div>

      {current ? (
        <>
          <Select value={current.kind} onValueChange={changeKind}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="poll">Poll</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
              <SelectItem value="qa">Q&A</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={current.prompt}
            onChange={(event) => update({ prompt: event.target.value })}
            placeholder="Audience prompt"
            maxLength={180}
          />
          {current.kind !== "qa" ? (
            <div className="space-y-2">
              {current.options.map((option, index) => (
                <div key={index} className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    value={option}
                    onChange={(event) => updateOption(index, event.target.value)}
                    aria-label={`Audience option ${index + 1}`}
                    maxLength={80}
                  />
                  {current.kind === "quiz" ? (
                    <Button
                      type="button"
                      variant={
                        current.correctOptionIndex === index
                          ? "secondary"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => update({ correctOptionIndex: index })}
                    >
                      Key
                    </Button>
                  ) : null}
                </div>
              ))}
              {current.options.length < 6 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update({
                      options: [
                        ...current.options,
                        `Option ${current.options.length + 1}`,
                      ],
                    })
                  }
                >
                  Add option
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
