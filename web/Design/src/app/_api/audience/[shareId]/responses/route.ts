import { NextResponse } from "next/server";
import { z } from "zod";

import { getPublicProject } from "@/db/projects";
import {
  createPresentationResponse,
  summarizePresentationResponses,
} from "@/db/presentation-responses";
import { findAudienceInteraction } from "@/features/editor/presentation-audience";
import {
  createNoStoreJsonHeaders,
  isValidPublicShareId,
} from "@/features/security/public-access-security";

const responseSchema = z.object({
  pageId: z.string().min(1).max(120),
  interactionId: z.string().min(1).max(120),
  participantName: z.string().max(80).optional().default("Guest"),
  answer: z.string().max(160).nullable().optional(),
  body: z.string().max(1000).nullable().optional(),
});

type AudienceResponsesContext = {
  params: Promise<{
    shareId: string;
  }>;
};

export async function GET(request: Request, context: AudienceResponsesContext) {
  const { shareId } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const pageId = searchParams.get("pageId") ?? "";
  const interactionId = searchParams.get("interactionId") ?? "";
  const project = isValidPublicShareId(shareId)
    ? await getPublicProject(shareId)
    : null;

  if (!project) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: createNoStoreJsonHeaders() },
    );
  }

  const match = findAudienceInteraction({
    document: project.document,
    pageId,
    interactionId,
  });

  if (!match) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: createNoStoreJsonHeaders() },
    );
  }

  const summary = await summarizePresentationResponses({
    projectId: project.id,
    pageId,
    interaction: match.interaction,
  });

  return NextResponse.json(
    { summary },
    { headers: createNoStoreJsonHeaders() },
  );
}

export async function POST(request: Request, context: AudienceResponsesContext) {
  const { shareId } = await context.params;
  const body = responseSchema.parse(await request.json());
  const project = isValidPublicShareId(shareId)
    ? await getPublicProject(shareId)
    : null;

  if (!project) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: createNoStoreJsonHeaders() },
    );
  }

  const match = findAudienceInteraction({
    document: project.document,
    pageId: body.pageId,
    interactionId: body.interactionId,
  });

  if (!match) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: createNoStoreJsonHeaders() },
    );
  }

  if (match.interaction.kind === "qa") {
    if (!body.body?.trim()) {
      return NextResponse.json(
        { error: "Question required" },
        { status: 400, headers: createNoStoreJsonHeaders() },
      );
    }
  } else if (
    !body.answer ||
    !match.interaction.options.includes(body.answer)
  ) {
    return NextResponse.json(
      { error: "Answer required" },
      { status: 400, headers: createNoStoreJsonHeaders() },
    );
  }

  const response = await createPresentationResponse({
    projectId: project.id,
    pageId: match.page.id,
    interaction: match.interaction,
    participantName: body.participantName,
    answer: body.answer,
    body: body.body,
  });

  return NextResponse.json(
    { response },
    { status: 201, headers: createNoStoreJsonHeaders() },
  );
}
