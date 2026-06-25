import { ZodError } from "zod";
import { apiJson, corsPreflight } from "@/lib/http/cors";
import { InvalidJsonRequestError, readJsonRequest } from "@/lib/http/request-json";
import {
  createHostedReviewComment,
  hostedReviewCommentErrorResponse,
  listHostedReviewComments,
} from "@/lib/projects/server-review-links";

export const runtime = "nodejs";

const methods = ["GET", "POST", "OPTIONS"];

export function OPTIONS(request: Request) {
  return corsPreflight(request, methods);
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    return apiJson(request, { ok: true, comments: await listHostedReviewComments(token) }, undefined, methods);
  } catch (error) {
    return reviewCommentErrorResponse(request, error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const payload = await readJsonRequest(request);
    return apiJson(request, { ok: true, comment: await createHostedReviewComment(token, payload) }, undefined, methods);
  } catch (error) {
    return reviewCommentErrorResponse(request, error);
  }
}

function reviewCommentErrorResponse(request: Request, error: unknown) {
  if (error instanceof InvalidJsonRequestError) {
    return apiJson(request, { ok: false, reason: "Request body must be valid JSON." }, { status: 400 }, methods);
  }

  if (error instanceof ZodError) {
    return apiJson(request, { ok: false, reason: "Hosted review comment is invalid." }, { status: 400 }, methods);
  }

  const response = hostedReviewCommentErrorResponse(error);
  if (response.status >= 500) {
    console.error("Hosted review comment API error", error);
  }
  return apiJson(request, response.body, { status: response.status }, methods);
}
