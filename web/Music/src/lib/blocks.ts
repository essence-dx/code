import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userBlocks } from "@/db/schema";

export async function isUserBlocked(blockerUserId: string, blockedUserId: string) {
  if (!blockerUserId || !blockedUserId || blockerUserId === blockedUserId) {
    return false;
  }

  const [block] = await getDb()
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(
      and(
        eq(userBlocks.blockerUserId, blockerUserId),
        eq(userBlocks.blockedUserId, blockedUserId),
      ),
    )
    .limit(1);

  return Boolean(block);
}
