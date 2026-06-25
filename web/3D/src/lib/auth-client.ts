"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

function cleanEnvValue(value: string | undefined) {
  return value?.trim().replace(/^\uFEFF/, "").replace(/^\u200B/, "").replace(/^"(.*)"$/, "$1") || undefined;
}

export const authClient = createAuthClient({
  baseURL: cleanEnvValue(process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_AUTH_URL ?? process.env.BETTER_AUTH_URL),
  plugins: [emailOTPClient()],
});
