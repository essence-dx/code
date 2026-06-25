import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import {
  presentationResponse,
  type PresentationResponseRow,
} from "@/db/schema";
import type { AudienceInteraction } from "@/features/editor/types";

export type PresentationResponseSummary = {
  totalResponses: number;
  options: Array<{
    label: string;
    count: number;
    correct: boolean;
  }>;
  questions: Array<{
    id: string;
    name: string;
    body: string;
    createdAt: string;
  }>;
};

export async function createPresentationResponse(input: {
  projectId: string;
  pageId: string;
  interaction: AudienceInteraction;
  participantName: string;
  answer?: string | null;
  body?: string | null;
}) {
  const now = new Date();
  const [row] = await getDb()
    .insert(presentationResponse)
    .values({
      id: nanoid(),
      projectId: input.projectId,
      pageId: input.pageId,
      interactionId: input.interaction.id,
      participantName: normalizeParticipantName(input.participantName),
      responseKind: input.interaction.kind,
      answer: normalizeAnswer(input.answer),
      body: normalizeBody(input.body),
      createdAt: now,
    })
    .returning();

  return toSummaryRow(row);
}

export async function summarizePresentationResponses(input: {
  projectId: string;
  pageId: string;
  interaction: AudienceInteraction;
}): Promise<PresentationResponseSummary> {
  const rows = await getDb()
    .select()
    .from(presentationResponse)
    .where(
      and(
        eq(presentationResponse.projectId, input.projectId),
        eq(presentationResponse.pageId, input.pageId),
        eq(presentationResponse.interactionId, input.interaction.id),
      ),
    )
    .orderBy(desc(presentationResponse.createdAt))
    .limit(200);

  const optionCounts = new Map<string, number>();
  const questions: PresentationResponseSummary["questions"] = [];

  for (const row of rows) {
    if (row.responseKind === "qa" && row.body?.trim()) {
      questions.push({
        id: row.id,
        name: row.participantName,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
      });
      continue;
    }

    if (row.answer) {
      optionCounts.set(row.answer, (optionCounts.get(row.answer) ?? 0) + 1);
    }
  }

  return {
    totalResponses: rows.length,
    options: input.interaction.options.map((label, index) => ({
      label,
      count: optionCounts.get(label) ?? 0,
      correct:
        input.interaction.kind === "quiz" &&
        input.interaction.correctOptionIndex === index,
    })),
    questions,
  };
}

function toSummaryRow(row: PresentationResponseRow) {
  return {
    id: row.id,
    participantName: row.participantName,
    responseKind: row.responseKind,
    answer: row.answer,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

function normalizeParticipantName(value: string) {
  return value.trim().slice(0, 80) || "Guest";
}

function normalizeAnswer(value: string | null | undefined) {
  return value?.trim().slice(0, 160) || null;
}

function normalizeBody(value: string | null | undefined) {
  return value?.trim().slice(0, 1000) || null;
}
