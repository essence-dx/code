import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { toDataURL } from "qrcode";

import { getDb } from "@/db/client";
import { userTwoFactor, type UserTwoFactorRow } from "@/db/schema";
import {
  createTotpUri,
  generateTotpSecret,
  verifyTotpCode,
} from "@/features/security/totp";
import { productEmailIssuer } from "@/lib/product";

export type TwoFactorProfile = {
  enabled: boolean;
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
  enabledAt: string | null;
};

function toProfile(input: {
  row: UserTwoFactorRow;
  accountName: string;
  qrDataUrl: string;
}): TwoFactorProfile {
  const otpauthUrl = createTotpUri({
    issuer: productEmailIssuer,
    accountName: input.accountName,
    secret: input.row.secret,
  });

  return {
    enabled: Boolean(input.row.enabledAt),
    secret: input.row.secret,
    otpauthUrl,
    qrDataUrl: input.qrDataUrl,
    enabledAt: input.row.enabledAt?.toISOString() ?? null,
  };
}

export async function getTwoFactorProfile(input: {
  userId: string;
  accountName: string;
}) {
  const row = await getOrCreateTwoFactorRow(input.userId);
  const otpauthUrl = createTotpUri({
    issuer: productEmailIssuer,
    accountName: input.accountName,
    secret: row.secret,
  });
  const qrDataUrl = await toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 192,
  });

  return toProfile({
    row,
    accountName: input.accountName,
    qrDataUrl,
  });
}

export async function isTwoFactorEnabled(userId: string) {
  const [row] = await getDb()
    .select({ enabledAt: userTwoFactor.enabledAt })
    .from(userTwoFactor)
    .where(eq(userTwoFactor.userId, userId))
    .limit(1);

  return Boolean(row?.enabledAt);
}

export async function verifyTwoFactorCode(input: {
  userId: string;
  code: string;
}) {
  const [row] = await getDb()
    .select()
    .from(userTwoFactor)
    .where(eq(userTwoFactor.userId, input.userId))
    .limit(1);

  return row ? verifyTotpCode({ secret: row.secret, code: input.code }) : false;
}

export async function enableTwoFactor(input: { userId: string; code: string }) {
  const row = await getOrCreateTwoFactorRow(input.userId);

  if (!verifyTotpCode({ secret: row.secret, code: input.code })) {
    return false;
  }

  await getDb()
    .update(userTwoFactor)
    .set({
      enabledAt: row.enabledAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userTwoFactor.userId, input.userId));

  return true;
}

export async function disableTwoFactor(input: {
  userId: string;
  code: string;
}) {
  const [row] = await getDb()
    .select()
    .from(userTwoFactor)
    .where(eq(userTwoFactor.userId, input.userId))
    .limit(1);

  if (!row || !verifyTotpCode({ secret: row.secret, code: input.code })) {
    return false;
  }

  await getDb()
    .update(userTwoFactor)
    .set({
      secret: generateTotpSecret(),
      enabledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(userTwoFactor.userId, input.userId));

  return true;
}

async function getOrCreateTwoFactorRow(userId: string) {
  const [existing] = await getDb()
    .select()
    .from(userTwoFactor)
    .where(eq(userTwoFactor.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const now = new Date();
  const [created] = await getDb()
    .insert(userTwoFactor)
    .values({
      id: nanoid(),
      userId,
      secret: generateTotpSecret(),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}
