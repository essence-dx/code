import { ZodError } from "zod";
import { apiJson, corsPreflight } from "@/lib/http/cors";
import { InvalidJsonRequestError, readJsonRequest } from "@/lib/http/request-json";
import {
  createHostedReviewLink,
  hostedReviewErrorResponse,
  listHostedReviewLinks,
  updateHostedReviewLink,
} from "@/lib/projects/server-review-links";

export const runtime = "nodejs";

const methods = ["GET", "POST", "PATCH", "OPTIONS"];

export function OPTIONS(request: Request) {
  return corsPreflight(request, methods);
}

export async function GET(request: Request) {
  try {
    return apiJson(request, { ok: true, links: await listHostedReviewLinks(requestOrigin(request)) }, undefined, methods);
  } catch (error) {
    return reviewLinkErrorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await readJsonRequest(request);
    return apiJson(request, { ok: true, link: await createHostedReviewLink(payload, requestOrigin(request)) }, undefined, methods);
  } catch (error) {
    return reviewLinkErrorResponse(request, error);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await readJsonRequest(request);
    return apiJson(request, { ok: true, link: await updateHostedReviewLink(payload, requestOrigin(request)) }, undefined, methods);
  } catch (error) {
    return reviewLinkErrorResponse(request, error);
  }
}

function reviewLinkErrorResponse(request: Request, error: unknown) {
  if (error instanceof InvalidJsonRequestError) {
    return apiJson(request, { ok: false, reason: "Request body must be valid JSON." }, { status: 400 }, methods);
  }

  if (error instanceof ZodError) {
    return apiJson(request, { ok: false, reason: "Hosted review link settings are invalid." }, { status: 400 }, methods);
  }

  const response = hostedReviewErrorResponse(error);
  if (response.status >= 500) {
    console.error("Hosted review link API error", error);
  }
  return apiJson(request, response.body, { status: response.status }, methods);
}

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  return url.origin;
}
