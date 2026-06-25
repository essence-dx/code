import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { authSchema } from "@/db/schema";
import { getDb } from "@/db/client";
import { emailPasswordAuthPolicy } from "@/lib/auth-policy";
import { sendVerificationOtpEmail } from "@/lib/email/brevo";

function cleanEnvValue(value: string | undefined) {
  return value?.trim().replace(/^\uFEFF/, "").replace(/^\u200B/, "").replace(/^"(.*)"$/, "$1");
}

function getRequiredEnv(name: string) {
  const secret = cleanEnvValue(process.env[name]);

  if (!secret) {
    throw new Error(`${name} is required for authentication.`);
  }

  return secret;
}

export const auth = betterAuth({
  appName: "Essence Spline",
  secret: getRequiredEnv("BETTER_AUTH_SECRET"),
  baseURL: cleanEnvValue(process.env.BETTER_AUTH_URL),
  database: drizzleAdapter(getDb(), {
    provider: "sqlite",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: emailPasswordAuthPolicy.requireEmailVerification,
    minPasswordLength: emailPasswordAuthPolicy.minPasswordLength,
    maxPasswordLength: emailPasswordAuthPolicy.maxPasswordLength,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
  },
  plugins: [
    emailOTP({
      expiresIn: 10 * 60,
      otpLength: 6,
      overrideDefaultEmailVerification: true,
      sendVerificationOnSignUp: true,
      sendVerificationOTP: async ({ email, otp, type }) => {
        await sendVerificationOtpEmail({ email, otp, type });
      },
    }),
    nextCookies(),
  ],
});
