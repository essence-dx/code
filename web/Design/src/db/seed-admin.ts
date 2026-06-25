import { existsSync } from "node:fs";

import { hashPassword } from "better-auth/crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
}

import { getDb } from "@/db/client";
import { account, user } from "@/db/schema";

const adminEmail = (process.env.ADMIN_SEED_EMAIL ?? "admin@mail.com")
  .trim()
  .toLowerCase();
const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? "password";
const adminName = process.env.ADMIN_SEED_NAME ?? "Admin";

async function seedAdmin() {
  const db = getDb();
  const now = new Date();
  const passwordHash = await hashPassword(adminPassword);
  const [existingUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, adminEmail))
    .limit(1);
  const userId = existingUser?.id ?? nanoid();

  if (existingUser) {
    await db
      .update(user)
      .set({
        name: existingUser.name || adminName,
        emailVerified: true,
        updatedAt: now,
      })
      .where(eq(user.id, existingUser.id));
  } else {
    await db.insert(user).values({
      id: userId,
      name: adminName,
      email: adminEmail,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  const [existingAccount] = await db
    .select()
    .from(account)
    .where(eq(account.userId, userId))
    .limit(1);

  if (existingAccount) {
    await db
      .update(account)
      .set({
        accountId: userId,
        providerId: "credential",
        password: passwordHash,
        updatedAt: now,
      })
      .where(eq(account.id, existingAccount.id));
  } else {
    await db.insert(account).values({
      id: nanoid(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log(`Seeded admin account: ${adminEmail}`);
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
