import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { sendAuthOtpEmail } from "@/lib/email/brevo";
import { envValue, optionalEnvValue } from "@/lib/env";

export const auth = betterAuth({
  appName: "Essence Suno",
  baseURL: optionalEnvValue("BETTER_AUTH_URL"),
  trustedOrigins: trustedOrigins(),
  secret: optionalEnvValue("BETTER_AUTH_SECRET"),
  database: drizzleAdapter(getDb(), {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  plugins: [
    emailOTP({
      allowedAttempts: 5,
      expiresIn: Number(process.env.AUTH_OTP_EXPIRES_SECONDS ?? 600),
      otpLength: 6,
      overrideDefaultEmailVerification: true,
      sendVerificationOnSignUp: true,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp, type }) {
        await sendAuthOtpEmail({ email, otp, type });
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;

function trustedOrigins() {
  return envValue("BETTER_AUTH_TRUSTED_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
