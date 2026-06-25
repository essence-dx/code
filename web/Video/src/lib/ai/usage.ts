import { and, count, desc, eq, gt, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { aiUsageEvents } from "@/lib/db/schema";
import type { AiUsageAction } from "@/lib/ai/schemas";
import { sanitizeAiUsageEvent, summarizeAiUsageEvents } from "@/lib/ai/usage-review";

const defaultHourlyLimit = 15;
const defaultDailyLimit = 50;

export interface AiUsageInput {
  userId: string;
  projectId?: string;
  action: AiUsageAction;
  model: string;
  promptChars?: number;
  outputChars?: number;
  status: "complete" | "failed" | "rate_limited";
  error?: string;
}

export async function assertAiUsageAllowed(userId: string, action: AiUsageAction, model: string) {
  const limits = readAiLimits();
  const [hourlyUsed, dailyUsed] = await Promise.all([
    countUsageSince(userId, new Date(Date.now() - 60 * 60 * 1000)),
    countUsageSince(userId, new Date(Date.now() - 24 * 60 * 60 * 1000)),
  ]);

  if (hourlyUsed >= limits.hourly || dailyUsed >= limits.daily) {
    await logAiUsage({
      userId,
      action,
      model,
      status: "rate_limited",
      error: `AI usage limit reached (${hourlyUsed}/${limits.hourly} hourly, ${dailyUsed}/${limits.daily} daily).`,
    });
    throw new AiRateLimitError(limits, { hourlyUsed, dailyUsed });
  }

  return {
    hourlyRemaining: limits.hourly - hourlyUsed,
    dailyRemaining: limits.daily - dailyUsed,
  };
}

export async function logAiUsage(input: AiUsageInput) {
  try {
    return await insertAiUsage(input, input.projectId);
  } catch (error) {
    if (!input.projectId) throw error;
    return await insertAiUsage(input, undefined);
  }
}

export async function getAiUsageReview(userId: string) {
  const limits = readAiLimits();
  const [hourlyUsed, dailyUsed, recentRows] = await Promise.all([
    countUsageSince(userId, new Date(Date.now() - 60 * 60 * 1000)),
    countUsageSince(userId, new Date(Date.now() - 24 * 60 * 60 * 1000)),
    getDb()
      .select({
        action: aiUsageEvents.action,
        status: aiUsageEvents.status,
        promptChars: aiUsageEvents.promptChars,
        outputChars: aiUsageEvents.outputChars,
        createdAt: aiUsageEvents.createdAt,
      })
      .from(aiUsageEvents)
      .where(eq(aiUsageEvents.userId, userId))
      .orderBy(desc(aiUsageEvents.createdAt))
      .limit(12),
  ]);
  const events = recentRows.map(sanitizeAiUsageEvent);

  return {
    limits,
    hourlyUsed,
    dailyUsed,
    hourlyRemaining: Math.max(0, limits.hourly - hourlyUsed),
    dailyRemaining: Math.max(0, limits.daily - dailyUsed),
    summary: summarizeAiUsageEvents(events),
    events,
  };
}

async function insertAiUsage(input: AiUsageInput, projectId: string | undefined) {
  const id = `ai_usage_${crypto.randomUUID()}`;
  await getDb().insert(aiUsageEvents).values({
    id,
    userId: input.userId,
    projectId,
    action: input.action,
    model: input.model,
    status: input.status,
    promptChars: input.promptChars ?? 0,
    outputChars: input.outputChars ?? 0,
    error: input.error,
    createdAt: new Date(),
  });
  return id;
}

async function countUsageSince(userId: string, since: Date) {
  const [row] = await getDb()
    .select({ total: count() })
    .from(aiUsageEvents)
    .where(and(eq(aiUsageEvents.userId, userId), ne(aiUsageEvents.status, "rate_limited"), gt(aiUsageEvents.createdAt, since)));

  return row?.total ?? 0;
}

function readAiLimits() {
  return {
    hourly: readLimit("AI_HOURLY_LIMIT", defaultHourlyLimit),
    daily: readLimit("AI_DAILY_LIMIT", defaultDailyLimit),
  };
}

function readLimit(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export class AiRateLimitError extends Error {
  constructor(
    public readonly limits: { hourly: number; daily: number },
    public readonly usage: { hourlyUsed: number; dailyUsed: number },
  ) {
    super("AI usage limit reached.");
    this.name = "AiRateLimitError";
  }
}
