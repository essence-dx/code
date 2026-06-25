import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { getDb } from "@/db/client";
import { account, user, workbook } from "@/db/schema";
import { createWorkbook } from "@/features/workbooks/workbook-service";

config({ path: ".env.local" });
config();

const adminEmail = (process.env.ADMIN_SEED_EMAIL ?? "admin@mail.com").toLowerCase();
const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? "password";
const adminName = process.env.ADMIN_SEED_NAME ?? "Essence Admin";

async function seedAdmin() {
  const db = getDb();
  const now = new Date();
  const passwordHash = await hashPassword(adminPassword);
  const [existingUser] = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
  const userId = existingUser?.id ?? crypto.randomUUID();

  if (existingUser) {
    await db
      .update(user)
      .set({
        name: existingUser.name || adminName,
        emailVerified: true,
        updatedAt: now,
      })
      .where(eq(user.id, userId));
  } else {
    await db.insert(user).values({
      id: userId,
      name: adminName,
      email: adminEmail,
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  const [credentialAccount] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);

  if (credentialAccount) {
    await db
      .update(account)
      .set({
        accountId: userId,
        password: passwordHash,
        updatedAt: now,
      })
      .where(eq(account.id, credentialAccount.id));
  } else {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }

  const existingWorkbook = await db
    .select({ id: workbook.id })
    .from(workbook)
    .where(eq(workbook.ownerId, userId))
    .limit(1);

  if (existingWorkbook.length === 0) {
    await createWorkbook(userId, "Admin workspace");
  }

  console.log(`Seeded admin account ${adminEmail}`);
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
