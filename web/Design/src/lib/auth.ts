import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";

import { getDb } from "@/db/client";
import { sendAuthEmail, sendAuthVerificationOtpEmail } from "@/db/auth-emails";
import * as schema from "@/db/schema";
import { productName } from "@/lib/product";

export const auth = betterAuth({
  appName: productName,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(getDb(), {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        userId: user.id,
        recipient: user.email,
        name: user.name,
        purpose: "password-reset",
        url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        userId: user.id,
        recipient: user.email,
        name: user.name,
        purpose: "email-verification",
        url,
      });
    },
  },
  plugins: [
    emailOTP({
      expiresIn: 10 * 60,
      otpLength: 6,
      overrideDefaultEmailVerification: true,
      sendVerificationOnSignUp: true,
      storeOTP: "hashed",
      sendVerificationOTP: async ({ email, otp, type }) => {
        await sendAuthVerificationOtpEmail({
          email,
          otp,
          type,
        });
      },
    }),
    nextCookies(),
  ],
});
