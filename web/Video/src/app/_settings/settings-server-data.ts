import type { PublicAiGenerationRecord } from "@/lib/ai/generation-records";
import type { getAiUsageReview } from "@/lib/ai/usage";

export type SettingsUsageReview = Awaited<ReturnType<typeof getAiUsageReview>>;

export interface SettingsServerData {
  isSignedIn: boolean;
  usageReview: SettingsUsageReview | null;
  generationReview: PublicAiGenerationRecord[];
}

export async function loadSettingsServerData(input: { databaseConfigured: boolean; staticExport: boolean }): Promise<SettingsServerData> {
  if (input.staticExport || !input.databaseConfigured) return emptySettingsServerData();

  try {
    const [{ getServerSession }, { getAiUsageReview }, { getAiGenerationReview }] = await Promise.all([
      import("@/lib/auth/server"),
      import("@/lib/ai/usage"),
      import("@/lib/ai/generation-records"),
    ]);
    const session = await getServerSession().catch(() => null);
    const userId = session?.user?.id;
    if (!userId) return emptySettingsServerData();

    const [usageReview, generationReview] = await Promise.all([
      getAiUsageReview(userId).catch(() => null),
      getAiGenerationReview(userId).catch(() => []),
    ]);

    return {
      isSignedIn: true,
      usageReview,
      generationReview,
    };
  } catch {
    return emptySettingsServerData();
  }
}

function emptySettingsServerData(): SettingsServerData {
  return {
    isSignedIn: false,
    usageReview: null,
    generationReview: [],
  };
}
