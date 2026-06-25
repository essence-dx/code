import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword } from "better-auth/crypto";
import { DEFAULT_ADMIN_EMAIL } from "../src/features/admin/admin-permissions";

config({ path: ".env.local" });

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "password";
const adminName = process.env.SEED_ADMIN_NAME ?? "essencefromexistence";
const grantExistingFileAccess = process.env.SEED_ADMIN_FILE_ACCESS !== "0";

const { getDb } = await import("../src/db/client");
const { account, designFile, designFileCollaborator, user } = await import(
  "../src/db/schema"
);

const db = getDb();
const now = new Date();
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
      name: adminName,
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
    image: null,
    createdAt: now,
    updatedAt: now,
  });
}

const password = await hashPassword(adminPassword);
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
      password,
      updatedAt: now,
    })
    .where(eq(account.id, credentialAccount.id));
} else {
  await db.insert(account).values({
    id: nanoid(),
    accountId: userId,
    providerId: "credential",
    userId,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password,
    createdAt: now,
    updatedAt: now,
  });
}

let accessGrantCount = 0;

if (grantExistingFileAccess) {
  const files = await db
    .select({
      id: designFile.id,
      ownerId: designFile.ownerId,
    })
    .from(designFile);

  for (const file of files) {
    if (file.ownerId === userId) {
      continue;
    }

    const [existingAccess] = await db
      .select()
      .from(designFileCollaborator)
      .where(
        and(
          eq(designFileCollaborator.fileId, file.id),
          eq(designFileCollaborator.userId, userId),
        ),
      )
      .limit(1);

    if (existingAccess) {
      if (existingAccess.role !== "editor") {
        await db
          .update(designFileCollaborator)
          .set({
            role: "editor",
            updatedAt: now,
          })
          .where(eq(designFileCollaborator.id, existingAccess.id));
        accessGrantCount += 1;
      }

      continue;
    }

    await db.insert(designFileCollaborator).values({
      id: nanoid(),
      fileId: file.id,
      userId,
      invitedById: userId,
      role: "editor",
      createdAt: now,
      updatedAt: now,
    });
    accessGrantCount += 1;
  }
}

console.log(`Seeded administrator account: ${adminEmail}`);
if (grantExistingFileAccess) {
  console.log(
    `Granted editor access to ${accessGrantCount} existing design file${
      accessGrantCount === 1 ? "" : "s"
    }.`,
  );
}
