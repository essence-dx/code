import { NextResponse } from "next/server";

import { getPresentationRemoteControllerByToken } from "@/db/presentation-remote-sessions";

type PresentationRemoteRouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(
  _request: Request,
  context: PresentationRemoteRouteContext,
) {
  const { token } = await context.params;
  const session = await getPresentationRemoteControllerByToken(token);

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ session });
}
