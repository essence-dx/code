import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { admin, emailOTP } from "better-auth/plugins"

import { getDb } from "@/server/db"
import * as schema from "@/server/db/schema"
import { sendAuthOtpEmail } from "@/server/email/brevo"
import { getAuthSecret, getSiteUrl, normalizeServerEnv } from "@/server/env"

normalizeServerEnv()

export const auth = betterAuth({
  appName: "Essence PowerPoint",
  baseURL: getSiteUrl(),
  secret: getAuthSecret(),
  database: drizzleAdapter(getDb(), {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 600,
  },
  plugins: [
    emailOTP({
      sendVerificationOTP: sendAuthOtpEmail,
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      storeOTP: "hashed",
      rateLimit: {
        window: 60,
        max: 5,
      },
    }),
    admin({
      adminRoles: ["admin"],
      defaultRole: "user",
    }),
    nextCookies(),
  ],
})
