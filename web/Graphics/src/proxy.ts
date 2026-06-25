import { NextResponse, type NextRequest } from "next/server";
import {
  createEmbedContentSecurityPolicy,
  getEmbedXFrameOptions,
  resolveEmbedSecurityPolicy,
} from "@/features/embed-security/policy";

export function proxy(request: NextRequest) {
  const token = getEmbedToken(request.nextUrl.pathname);
  const response = NextResponse.next();

  if (!token) {
    return response;
  }

  const policy = resolveEmbedSecurityPolicy({ token });
  response.headers.set(
    "Content-Security-Policy",
    createEmbedContentSecurityPolicy(policy),
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Essence-Embed-Sandbox", policy.sandboxAttributes);

  const xFrameOptions = getEmbedXFrameOptions(policy);

  if (xFrameOptions) {
    response.headers.set("X-Frame-Options", xFrameOptions);
  }

  return response;
}

export const config = {
  matcher: "/embed/:path*",
};

function getEmbedToken(pathname: string) {
  const [, route, token] = pathname.split("/");

  return route === "embed" ? token : null;
}
