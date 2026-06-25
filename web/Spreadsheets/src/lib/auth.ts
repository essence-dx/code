import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { logAuditEvent } from "@/features/audit/audit-log-service";
import {
  authRateLimitPolicy,
  authSessionPolicy,
  emailOtpPolicy,
} from "@/lib/auth-policies";
import { sendBrevoOtpEmail } from "@/lib/brevo";
import { requireServerEnv } from "@/lib/env";

async function getUserAuditActor(userId: string) {
  const [row] = await getDb()
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  return {
    id: userId,
    email: row?.email ?? "Authenticated user",
  };
}

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: emailOtpPolicy.expiresIn,
      afterEmailVerification: async (verifiedUser) => {
        await logAuditEvent({
          category: "auth",
          action: "auth.email.verified",
          actor: {
            id: verifiedUser.id,
            email: verifiedUser.email,
          },
          targetUserId: verifiedUser.id,
          summary: "Email address verified.",
        });
      },
    },
    session: authSessionPolicy,
    rateLimit: authRateLimitPolicy,
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            await logAuditEvent({
              category: "auth",
              action: "auth.user.created",
              actor: {
                id: createdUser.id,
                email: createdUser.email,
              },
              targetUserId: createdUser.id,
              summary: "User account created.",
              metadata: {
                emailVerified: Boolean(createdUser.emailVerified),
              },
            });
          },
        },
      },
      session: {
        create: {
          after: async (createdSession) => {
            const actor = await getUserAuditActor(createdSession.userId);

            await logAuditEvent({
              category: "auth",
              action: "auth.session.created",
              actor,
              targetUserId: createdSession.userId,
              summary: "User signed in.",
              metadata: {
                sessionId: createdSession.id,
                ipAddress: createdSession.ipAddress ?? null,
                userAgent: createdSession.userAgent?.slice(0, 160) ?? null,
              },
            });
          },
        },
        delete: {
          after: async (deletedSession) => {
            const actor = await getUserAuditActor(deletedSession.userId);

            await logAuditEvent({
              category: "auth",
              action: "auth.session.deleted",
              actor,
              targetUserId: deletedSession.userId,
              summary: "User session ended.",
              metadata: {
                sessionId: deletedSession.id,
              },
            });
          },
        },
      },
    },
    secret: requireServerEnv("BETTER_AUTH_SECRET"),
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [
      process.env.BETTER_AUTH_URL,
      process.env.NEXT_PUBLIC_APP_URL,
    ].filter(Boolean) as string[],
    plugins: [
      emailOTP({
        overrideDefaultEmailVerification: true,
        sendVerificationOnSignUp: true,
        otpLength: emailOtpPolicy.otpLength,
        expiresIn: emailOtpPolicy.expiresIn,
        allowedAttempts: emailOtpPolicy.allowedAttempts,
        storeOTP: "hashed",
        resendStrategy: "rotate",
        rateLimit: emailOtpPolicy.rateLimit,
        sendVerificationOTP: sendBrevoOtpEmail,
      }),
      nextCookies(),
    ],
  });
}

let authInstance: ReturnType<typeof createAuth> | null = null;

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}

export type AuthInstance = ReturnType<typeof getAuth>;
