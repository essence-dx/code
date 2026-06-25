import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword } from "better-auth/crypto";
import { getDb } from "@/db";
import { account, user } from "@/db/schema";

const adminEmail = "admin@mail.com";
const adminPassword = "password";
const now = new Date();

async function seedAdmin() {
  const db = getDb();
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
        emailVerified: true,
        name: existingUser.name || "Essence Admin",
        updatedAt: now,
      })
      .where(eq(user.id, existingUser.id));
  } else {
    await db.insert(user).values({
      id: userId,
      name: "Essence Admin",
      email: adminEmail,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  const password = await hashPassword(adminPassword);
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
        password,
        providerId: "credential",
        updatedAt: now,
      })
      .where(eq(account.id, existingAccount.id));
  } else {
    await db.insert(account).values({
      id: nanoid(),
      accountId: userId,
      providerId: "credential",
      userId,
      password,
      createdAt: now,
      updatedAt: now,
    });
  }
}

seedAdmin()
  .then(() => {
    console.log("Seeded admin@mail.com");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
