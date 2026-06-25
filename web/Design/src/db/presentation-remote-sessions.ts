import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import {
  presentationRemoteCommand,
  presentationRemoteSession,
  project,
  type PresentationRemoteCommandRow,
  type PresentationRemoteSessionRow,
} from "@/db/schema";
import { parseDesignDocument } from "@/features/editor/document-codec";
import type { PresentationCommandAction } from "@/features/editor/presentation-channel";
import type {
  PresentationRemoteCommand,
  PresentationRemoteController,
  PresentationRemoteSessionState,
  PresentationRemoteSlide,
} from "@/features/editor/presentation-remote-types";

const sessionLifetimeMs = 1000 * 60 * 60 * 4;

function toSessionState(
  row: PresentationRemoteSessionRow,
): PresentationRemoteSessionState {
  return {
    id: row.id,
    controlToken: row.controlToken,
    activeIndex: row.activeIndex,
    slideCount: row.slideCount,
    pageName: row.pageName,
    status: row.status,
    expiresAt: row.expiresAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toCommand(row: PresentationRemoteCommandRow): PresentationRemoteCommand {
  return {
    id: row.id,
    action: toCommandAction(row.action),
    slideIndex: row.slideIndex,
    createdAt: row.createdAt.toISOString(),
  };
}

function toCommandAction(value: string): PresentationCommandAction {
  if (
    value === "first" ||
    value === "previous" ||
    value === "next" ||
    value === "last" ||
    value === "go-to"
  ) {
    return value;
  }

  return "next";
}

function toSlides(document: string): PresentationRemoteSlide[] {
  return parseDesignDocument(document).pages.map((page, index) => ({
    index,
    id: page.id,
    name: page.name,
    hasNotes: Boolean(page.notes?.trim()),
  }));
}

function getExpiry(now = new Date()) {
  return new Date(now.getTime() + sessionLifetimeMs);
}

export async function createPresentationRemoteSession(input: {
  userId: string;
  projectId: string;
  activeIndex: number;
  slideCount: number;
  pageName: string;
}) {
  const now = new Date();
  const [existing] = await getDb()
    .select()
    .from(presentationRemoteSession)
    .where(
      and(
        eq(presentationRemoteSession.userId, input.userId),
        eq(presentationRemoteSession.projectId, input.projectId),
        eq(presentationRemoteSession.status, "active"),
        gt(presentationRemoteSession.expiresAt, now),
      ),
    )
    .orderBy(desc(presentationRemoteSession.updatedAt))
    .limit(1);

  const values = {
    activeIndex: input.activeIndex,
    slideCount: input.slideCount,
    pageName: input.pageName,
    expiresAt: getExpiry(now),
    updatedAt: now,
  };

  if (existing) {
    const [row] = await getDb()
      .update(presentationRemoteSession)
      .set(values)
      .where(eq(presentationRemoteSession.id, existing.id))
      .returning();

    await getDb()
      .delete(presentationRemoteCommand)
      .where(eq(presentationRemoteCommand.sessionId, existing.id));

    return row ? toSessionState(row) : null;
  }

  const [row] = await getDb()
    .insert(presentationRemoteSession)
    .values({
      id: nanoid(),
      userId: input.userId,
      projectId: input.projectId,
      controlToken: nanoid(40),
      status: "active",
      createdAt: now,
      ...values,
    })
    .returning();

  return toSessionState(row);
}

export async function updatePresentationRemoteState(input: {
  userId: string;
  projectId: string;
  sessionId: string;
  activeIndex: number;
  slideCount: number;
  pageName: string;
}) {
  const now = new Date();
  const [row] = await getDb()
    .update(presentationRemoteSession)
    .set({
      activeIndex: input.activeIndex,
      slideCount: input.slideCount,
      pageName: input.pageName,
      expiresAt: getExpiry(now),
      updatedAt: now,
    })
    .where(
      and(
        eq(presentationRemoteSession.id, input.sessionId),
        eq(presentationRemoteSession.projectId, input.projectId),
        eq(presentationRemoteSession.userId, input.userId),
        eq(presentationRemoteSession.status, "active"),
      ),
    )
    .returning();

  return row ? toSessionState(row) : null;
}

export async function listPresentationRemoteCommands(input: {
  userId: string;
  projectId: string;
  sessionId: string;
}) {
  const [session] = await getDb()
    .select({ id: presentationRemoteSession.id })
    .from(presentationRemoteSession)
    .where(
      and(
        eq(presentationRemoteSession.id, input.sessionId),
        eq(presentationRemoteSession.projectId, input.projectId),
        eq(presentationRemoteSession.userId, input.userId),
        eq(presentationRemoteSession.status, "active"),
        gt(presentationRemoteSession.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!session) return null;

  const rows = await getDb()
    .select()
    .from(presentationRemoteCommand)
    .where(eq(presentationRemoteCommand.sessionId, input.sessionId))
    .orderBy(desc(presentationRemoteCommand.createdAt))
    .limit(25);

  return rows.reverse().map(toCommand);
}

export async function getPresentationRemoteControllerByToken(
  controlToken: string,
): Promise<PresentationRemoteController | null> {
  const [row] = await getDb()
    .select({
      session: presentationRemoteSession,
      projectName: project.name,
      projectDocument: project.document,
    })
    .from(presentationRemoteSession)
    .innerJoin(project, eq(project.id, presentationRemoteSession.projectId))
    .where(
      and(
        eq(presentationRemoteSession.controlToken, controlToken),
        eq(presentationRemoteSession.status, "active"),
        gt(presentationRemoteSession.expiresAt, new Date()),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    ...toSessionState(row.session),
    projectId: row.session.projectId,
    projectName: row.projectName,
    slides: toSlides(row.projectDocument),
  };
}

export async function createPresentationRemoteCommand(input: {
  controlToken: string;
  action: PresentationCommandAction;
  slideIndex?: number | null;
}) {
  const session = await getPresentationRemoteControllerByToken(
    input.controlToken,
  );

  if (!session) return null;

  const [row] = await getDb()
    .insert(presentationRemoteCommand)
    .values({
      id: nanoid(),
      sessionId: session.id,
      action: input.action,
      slideIndex: input.slideIndex ?? null,
      createdAt: new Date(),
    })
    .returning();

  return toCommand(row);
}
