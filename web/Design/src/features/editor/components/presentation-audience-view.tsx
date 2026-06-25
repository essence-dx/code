"use client";

import { useMemo, useState, useTransition } from "react";
import { HelpCircle, ListChecks, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getPublicSurfaceCopy } from "@/features/editor/public-surface-localization";
import type {
  AudienceInteraction,
  DesignPage,
} from "@/features/editor/types";
import {
  LocaleSelect,
  useLocalePreference,
} from "@/features/localization/locale-preference";

type PresentationAudienceViewProps = {
  shareId: string;
  projectName: string;
  interactions: Array<{
    page: DesignPage;
    interaction: AudienceInteraction;
  }>;
};

type ResponseState = {
  status: "idle" | "sent" | "error";
  message: string;
};

export function PresentationAudienceView({
  shareId,
  projectName,
  interactions,
}: PresentationAudienceViewProps) {
  const [participantName, setParticipantName] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Record<string, string>>({});
  const [responseState, setResponseState] = useState<
    Record<string, ResponseState>
  >({});
  const { locale, updateLocale } = useLocalePreference();
  const copy = getPublicSurfaceCopy(locale);
  const [isPending, startTransition] = useTransition();
  const sortedInteractions = useMemo(
    () =>
      interactions.map((item, index) => ({
        ...item,
        slideNumber: index + 1,
      })),
    [interactions],
  );

  function submitInteraction(item: (typeof sortedInteractions)[number]) {
    const interaction = item.interaction;
    const stateKey = interaction.id;
    const answer = responses[stateKey];
    const body = questions[stateKey];

    startTransition(async () => {
      const response = await fetch(`/api/audience/${shareId}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageId: item.page.id,
          interactionId: interaction.id,
          participantName,
          answer,
          body,
        }),
      });

      if (!response.ok) {
        setResponseState((current) => ({
          ...current,
          [stateKey]: {
            status: "error",
            message: copy.sendError,
          },
        }));
        return;
      }

      setResponseState((current) => ({
        ...current,
        [stateKey]: {
          status: "sent",
          message:
            interaction.kind === "qa" ? copy.questionSent : copy.responseCounted,
        },
      }));
    });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
        <header className="rounded-md border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="outline">{copy.audience}</Badge>
            <LocaleSelect
              label={copy.language}
              locale={locale}
              onLocaleChange={updateLocale}
            />
          </div>
          <h1 className="mt-3 text-2xl font-semibold">{projectName}</h1>
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium" htmlFor="participant-name">
              {copy.name}
            </label>
            <Input
              id="participant-name"
              value={participantName}
              onChange={(event) => setParticipantName(event.target.value)}
              placeholder={copy.guest}
              maxLength={80}
            />
          </div>
        </header>

        {sortedInteractions.length ? (
          sortedInteractions.map((item) => (
            <article
              key={item.interaction.id}
              className="rounded-md border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {item.interaction.kind === "qa" ? (
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Badge variant="secondary">{item.page.name}</Badge>
                </div>
                <Badge variant="outline">
                  {copy.kind[item.interaction.kind]}
                </Badge>
              </div>
              <h2 className="mt-4 text-lg font-semibold">
                {item.interaction.prompt}
              </h2>

              {item.interaction.kind === "qa" ? (
                <Textarea
                  className="mt-4"
                  value={questions[item.interaction.id] ?? ""}
                  onChange={(event) =>
                    setQuestions((current) => ({
                      ...current,
                      [item.interaction.id]: event.target.value,
                    }))
                  }
                  placeholder={copy.askQuestion}
                  maxLength={1000}
                />
              ) : (
                <div className="mt-4 grid gap-2">
                  {item.interaction.options.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-3 rounded-md border border-border p-3 text-sm"
                    >
                      <input
                        type="radio"
                        name={item.interaction.id}
                        value={option}
                        checked={responses[item.interaction.id] === option}
                        onChange={(event) =>
                          setResponses((current) => ({
                            ...current,
                            [item.interaction.id]: event.target.value,
                          }))
                        }
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                <Button
                  disabled={isPending}
                  onClick={() => submitInteraction(item)}
                >
                  <Send className="h-4 w-4" />
                  {isPending ? copy.sending : copy.send}
                </Button>
                {responseState[item.interaction.id] ? (
                  <span
                    className={
                      responseState[item.interaction.id].status === "error"
                        ? "text-sm text-destructive"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {responseState[item.interaction.id].message}
                  </span>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {copy.noPrompts}
          </div>
        )}
      </section>
    </main>
  );
}
