import { config } from "dotenv";
import { getAdminSeedAccount } from "../src/lib/admin-seed";

config({ path: ".env.local" });

const [{ and, eq }, { hashPassword }, { getDb }, { account, user }] = await Promise.all([
  import("drizzle-orm"),
  import("better-auth/crypto"),
  import("../src/db/client"),
  import("../src/db/schema"),
]);

const adminSeed = getAdminSeedAccount();

const db = getDb();
const now = new Date();
const [existingUser] = await db.select().from(user).where(eq(user.email, adminSeed.email)).limit(1);
const userId = existingUser?.id ?? crypto.randomUUID();

if (existingUser) {
  await db
    .update(user)
    .set({
      emailVerified: true,
      name: existingUser.name || adminSeed.name,
      updatedAt: now,
    })
    .where(eq(user.id, existingUser.id));
} else {
  await db.insert(user).values({
    id: userId,
    name: adminSeed.name,
    email: adminSeed.email,
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  });
}

const passwordHash = await hashPassword(adminSeed.password);
const [existingAccount] = await db
  .select()
  .from(account)
  .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
  .limit(1);

if (existingAccount) {
  await db
    .update(account)
    .set({
      accountId: userId,
      password: passwordHash,
      updatedAt: now,
    })
    .where(eq(account.id, existingAccount.id));
} else {
  await db.insert(account).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  });
}

console.log(`Seeded admin account ${adminSeed.email}`);
