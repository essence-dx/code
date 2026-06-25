import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { sendBrevoEmail } from "@/lib/brevo-email";

const authBaseURL = getAuthBaseURL();
if (authBaseURL) {
  process.env.BETTER_AUTH_URL = authBaseURL;
}
const trustedOrigins = getTrustedOrigins(authBaseURL);

export const auth = betterAuth({
  appName: "Essence",
  baseURL: authBaseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(getDb(), {
    provider: "sqlite",
    schema,
  }),
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  trustedOrigins,
  plugins: [
    emailOTP({
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: 10 * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      resendStrategy: "rotate",
      async sendVerificationOTP({ email, otp, type }) {
        await sendBrevoEmail({
          to: email,
          subject: getOtpSubject(type),
          html: getOtpHtml(otp),
          text: `Your Essence verification code is ${otp}. It expires in 10 minutes.`,
        });
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;

function getAuthBaseURL() {
  const betterAuthURL = getURLFromEnv("BETTER_AUTH_URL");

  if (betterAuthURL) {
    return betterAuthURL;
  }

  const appURL = getURLFromEnv("NEXT_PUBLIC_APP_URL");

  if (appURL) {
    return appURL;
  }

  const vercelURL = getVercelURL("VERCEL_URL");

  if (vercelURL) {
    return vercelURL;
  }

  return undefined;
}

function getURLFromEnv(name: string) {
  const value = getNormalizedEnvValue(name);

  if (!value) {
    return undefined;
  }

  return value.replace(/\/+$/, "");
}

function getVercelURL(name: string) {
  const value = getURLFromEnv(name);

  if (!value) {
    return undefined;
  }

  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;
}

function getNormalizedEnvValue(name: string) {
  return (
    process.env[name]?.replace(/[\uFEFF\u200B-\u200F\u2060]/g, "").trim() ||
    undefined
  );
}

function isDefined(value: string | undefined): value is string {
  return Boolean(value);
}

function getTrustedOrigins(baseURL: string | undefined) {
  const extraTrustedOrigins = getNormalizedEnvValue("TRUSTED_ORIGINS")
    ?.split(",")
    .map((origin) =>
      origin.replace(/[\uFEFF\u200B-\u200F\u2060]/g, "").trim().replace(/\/+$/, ""),
    )
    .filter(isDefined);
  const origins = [
    baseURL,
    getURLFromEnv("NEXT_PUBLIC_APP_URL"),
    getVercelURL("VERCEL_URL"),
    getVercelURL("VERCEL_BRANCH_URL"),
    getVercelURL("VERCEL_PROJECT_PRODUCTION_URL"),
    ...(extraTrustedOrigins ?? []),
  ];

  if (process.env.NODE_ENV !== "production") {
    origins.push(
      "http://localhost:*",
      "http://127.0.0.1:*",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
    );
  }

  return Array.from(new Set(origins.filter(isDefined)));
}

function getOtpSubject(
  type: "sign-in" | "email-verification" | "forget-password" | "change-email",
) {
  if (type === "sign-in") {
    return "Your Essence sign-in code";
  }

  if (type === "change-email") {
    return "Confirm your Essence email change";
  }

  if (type === "forget-password") {
    return "Reset your Essence password";
  }

  return "Verify your Essence account";
}

function getOtpHtml(otp: string) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#18181b">
      <h1 style="font-size:20px;margin:0 0 12px">Verify your Essence account</h1>
      <p style="margin:0 0 16px">Use this code to finish signing in:</p>
      <div style="display:inline-block;border:1px solid #d4d4d8;border-radius:12px;padding:14px 18px;font-size:28px;font-weight:700;letter-spacing:6px">${otp}</div>
      <p style="margin:16px 0 0;color:#52525b">This code expires in 10 minutes.</p>
    </div>
  `;
}
