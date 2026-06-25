import { and, eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { hashPassword } from "better-auth/crypto"

import { auth } from "@/server/auth"
import { getDb } from "@/server/db"
import { account, user } from "@/server/db/schema"
import { getSeedAdminEmail, getSeedAdminPassword } from "@/server/env"

export async function seedAdminAccount() {
  const db = getDb()
  const email = getSeedAdminEmail()
  const password = getSeedAdminPassword()
  const now = new Date()
  let adminUser = await db.query.user.findFirst({
    where: eq(user.email, email),
  })

  if (!adminUser) {
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: "Essence Admin",
      },
    })

    adminUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    })
  }

  if (!adminUser) {
    throw new Error("Admin account could not be created")
  }

  await db
    .update(user)
    .set({
      role: "admin",
      emailVerified: true,
      banned: false,
      banReason: null,
      banExpires: null,
      updatedAt: now,
    })
    .where(eq(user.id, adminUser.id))

  const credentialAccount = await db.query.account.findFirst({
    where: and(
      eq(account.userId, adminUser.id),
      eq(account.providerId, "credential"),
    ),
  })
  const passwordHash = await hashPassword(password)

  if (credentialAccount) {
    await db
      .update(account)
      .set({
        password: passwordHash,
        updatedAt: now,
      })
      .where(eq(account.id, credentialAccount.id))
  } else {
    await db.insert(account).values({
      id: nanoid(),
      accountId: adminUser.id,
      providerId: "credential",
      userId: adminUser.id,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    })
  }

  return { email, userId: adminUser.id }
}
