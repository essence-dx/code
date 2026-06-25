import { NextResponse } from "next/server";
import { z } from "zod";

import { createPresentationRemoteCommand } from "@/db/presentation-remote-sessions";

const commandSchema = z.object({
  action: z.enum(["first", "previous", "next", "last", "go-to"]),
  slideIndex: z.number().int().min(0).max(999).nullable().optional(),
});

type PresentationRemoteCommandRouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function POST(
  request: Request,
  context: PresentationRemoteCommandRouteContext,
) {
  const { token } = await context.params;
  const body = commandSchema.parse(await request.json());
  const command = await createPresentationRemoteCommand({
    controlToken: token,
    action: body.action,
    slideIndex: body.slideIndex,
  });

  if (!command) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ command }, { status: 201 });
}
