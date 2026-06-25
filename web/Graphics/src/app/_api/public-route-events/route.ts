import { recordPublicRouteEvent } from "@/features/public-route-analytics/capture";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  await recordPublicRouteEvent({
    headers: request.headers,
    payload,
  });

  return new Response(null, { status: 202 });
}
