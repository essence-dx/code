import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { getAiStatus, resolveTextModel } from "@/lib/ai/config";
import { composerSystemPrompt } from "@/lib/ai/prompts";
import {
  disabledCapabilityResponse,
  providerName,
} from "@/lib/ai/route-helpers";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import { normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: UIMessage[] };

    if (!Array.isArray(body.messages)) {
      return disabledCapabilityResponse(
        "chat",
        "text",
        "Chat requires a UIMessage[] payload.",
        body,
      );
    }

    const status = getAiStatus();
    if (!status.text) {
      return disabledCapabilityResponse(
        "chat",
        "text",
        "Text AI is not configured. Set AI_TEXT_MODEL plus a free/OpenAI-compatible, Gateway, or OpenAI key.",
        body,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "chat",
      status: "running",
      provider: providerName(),
      model: status.textModel,
      request: { messageCount: body.messages.length },
    });

    const result = streamText({
      model: resolveTextModel(),
      system: composerSystemPrompt,
      messages: await convertToModelMessages(body.messages),
      temperature: 0.8,
      onFinish: async ({ text }) => {
        if (jobId) {
          await tryUpdateAiJob(jobId, {
            status: "succeeded",
            output: { text },
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return normalizeRouteError(error);
  }
}
