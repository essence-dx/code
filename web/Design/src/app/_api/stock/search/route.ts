import { NextResponse } from "next/server";

import { searchCommonsImages } from "@/features/stock/commons";
import { auth } from "@/lib/auth";

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function GET(request: Request) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchCommonsImages(query);

  return NextResponse.json({ results });
}
