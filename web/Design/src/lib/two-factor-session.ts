import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isTwoFactorEnabled } from "@/db/two-factor";

const twoFactorCookieName = "essence_2fa_verified_user";
const verifiedMaxAgeSeconds = 60 * 60 * 12;

export async function isTwoFactorVerifiedForRequest(userId: string) {
  const cookieStore = await cookies();

  return cookieStore.get(twoFactorCookieName)?.value === userId;
}

export async function markTwoFactorVerified(userId: string) {
  const cookieStore = await cookies();

  cookieStore.set(twoFactorCookieName, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: verifiedMaxAgeSeconds,
  });
}

export async function clearTwoFactorVerified() {
  const cookieStore = await cookies();

  cookieStore.delete(twoFactorCookieName);
}

export async function requireTwoFactorVerified(
  userId: string,
  nextPath: string,
) {
  const enabled = await isTwoFactorEnabled(userId);

  if (!enabled || (await isTwoFactorVerifiedForRequest(userId))) {
    return;
  }

  redirect(`/security/verify?next=${encodeURIComponent(nextPath)}`);
}

export function getSafeTwoFactorNextPath(
  value: FormDataEntryValue | string | null,
) {
  const next = String(value ?? "/designs");

  return next.startsWith("/") && !next.startsWith("//") ? next : "/designs";
}
