import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import nodemailer from "nodemailer";

import { getDb } from "@/db/client";
import { authEmail, user } from "@/db/schema";
import {
  productEmailFrom,
  productEmailFromName,
  productEmailIssuer,
  productName,
} from "@/lib/product";

export type AuthEmailPurpose =
  | "email-verification"
  | "password-reset"
  | "email-test";

type AuthEmailInput = {
  userId: string | null;
  recipient: string;
  name: string;
  purpose: AuthEmailPurpose;
  url: string;
};

type TransactionalEmailInput = {
  userId: string | null;
  recipient: string;
  subject: string;
  text: string;
  html: string;
  purpose?: AuthEmailPurpose;
  previewUrl?: string | null;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
};

type BrevoConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
};

export type AuthEmailSummary = {
  id: string;
  subject: string;
  purpose: AuthEmailPurpose;
  deliveryStatus: string;
  previewUrl: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
};

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();

  if (!host) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT ?? "587");

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER?.trim() || undefined,
    password: process.env.SMTP_PASSWORD || undefined,
    from:
      process.env.SMTP_FROM?.trim() ||
      process.env.AUTH_EMAIL_FROM?.trim() ||
      productEmailFrom,
  };
}

function readBrevoConfig(): BrevoConfig | null {
  const apiKey = process.env.BREVO_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    fromEmail: productEmailFrom,
    fromName: productEmailFromName,
  };
}

function shouldStorePreviewUrl(smtp: SmtpConfig | null) {
  const brevo = readBrevoConfig();

  return (
    process.env.AUTH_EMAIL_STORE_PREVIEW_URL === "true" || (!smtp && !brevo)
  );
}

export function createAuthEmailContent(input: AuthEmailInput) {
  const isReset = input.purpose === "password-reset";
  const title = isReset
    ? `Reset your ${productName} password`
    : `Verify your ${productName} email`;
  const actionLabel = isReset ? "Reset password" : "Verify email";
  const safeName = input.name.trim() || "Designer";
  const text = [
    `Hi ${safeName},`,
    "",
    isReset
      ? `Use the link below to choose a new password for your ${productName} account.`
      : `Use the link below to verify your ${productName} email address.`,
    "",
    input.url,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111827">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      <p>Hi ${escapeHtml(safeName)},</p>
      <p>${
        isReset
          ? `Use this secure link to choose a new password for your ${productName} account.`
          : `Use this secure link to verify your ${productName} email address.`
      }</p>
      <p>
        <a href="${escapeHtml(input.url)}" style="display:inline-block;border-radius:6px;background:#111827;color:#fff;padding:10px 14px;text-decoration:none">${actionLabel}</a>
      </p>
      <p style="font-size:12px;color:#6b7280">If the button does not work, paste this link into your browser:<br />${escapeHtml(
        input.url,
      )}</p>
      <p style="font-size:12px;color:#6b7280">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  return {
    subject: title,
    text,
    html,
  };
}

export function createAuthOtpEmailContent(input: {
  email: string;
  otp: string;
  type: "email-verification" | "forget-password" | "sign-in" | "change-email";
}) {
  const isPasswordReset = input.type === "forget-password";
  const title = isPasswordReset
    ? `Reset your ${productName} password`
    : `Verify your ${productName} email`;
  const purposeText = isPasswordReset
    ? "Use this code to continue resetting your password."
    : "Use this code to confirm your email address.";
  const text = [
    title,
    "",
    purposeText,
    "",
    input.otp,
    "",
    "This code expires soon. If you did not request it, you can ignore this email.",
  ].join("\n");
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111827">
      <p style="margin:0 0 8px;color:#6b7280;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${productName}</p>
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      <p>${purposeText}</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:20px 0">${escapeHtml(
        input.otp,
      )}</p>
      <p style="font-size:12px;color:#6b7280">This code expires soon. If you did not request it, you can ignore this email.</p>
    </div>
  `;

  return {
    subject: title,
    text,
    html,
  };
}

async function sendBrevoEmail(
  config: BrevoConfig,
  input: {
    recipient: string;
    subject: string;
    text: string;
    html: string;
  },
) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": config.apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: config.fromEmail,
        name: config.fromName,
      },
      to: [{ email: input.recipient }],
      subject: input.subject,
      textContent: input.text,
      htmlContent: input.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Brevo delivery failed with ${response.status}: ${body.slice(0, 240)}`,
    );
  }
}

export async function sendAuthEmail(input: AuthEmailInput) {
  const brevo = readBrevoConfig();
  const smtp = readSmtpConfig();
  const content = createAuthEmailContent(input);
  const now = new Date();
  const [record] = await getDb()
    .insert(authEmail)
    .values({
      id: nanoid(),
      userId: input.userId,
      recipient: input.recipient.toLowerCase(),
      subject: content.subject,
      purpose: input.purpose,
      deliveryStatus: brevo || smtp ? "queued" : "preview",
      previewUrl: shouldStorePreviewUrl(smtp) ? input.url : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!brevo && !smtp) {
    console.info(
      `[${productEmailIssuer}] ${content.subject} for ${input.recipient}: ${input.url}`,
    );
    return record;
  }

  try {
    if (brevo) {
      await sendBrevoEmail(brevo, {
        recipient: input.recipient,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });
    } else if (smtp) {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth:
          smtp.user && smtp.password
            ? {
                user: smtp.user,
                pass: smtp.password,
              }
            : undefined,
      });

      await transporter.sendMail({
        from: smtp.from,
        to: input.recipient,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });
    }

    const [updated] = await getDb()
      .update(authEmail)
      .set({
        deliveryStatus: "sent",
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(authEmail.id, record.id))
      .returning();

    return updated ?? record;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email delivery failed";

    const [updated] = await getDb()
      .update(authEmail)
      .set({
        deliveryStatus: "failed",
        errorMessage: message.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(authEmail.id, record.id))
      .returning();

    console.error(`[${productEmailIssuer}] Email delivery failed: ${message}`);
    return updated ?? record;
  }
}

export async function sendTransactionalEmail(input: TransactionalEmailInput) {
  const brevo = readBrevoConfig();
  const smtp = readSmtpConfig();
  const now = new Date();
  const [record] = await getDb()
    .insert(authEmail)
    .values({
      id: nanoid(),
      userId: input.userId,
      recipient: input.recipient.toLowerCase(),
      subject: input.subject,
      purpose: input.purpose ?? "email-test",
      deliveryStatus: brevo || smtp ? "queued" : "preview",
      previewUrl: input.previewUrl ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!brevo && !smtp) {
    console.info(
      `[${productEmailIssuer}] ${input.subject} for ${input.recipient}`,
    );
    return record;
  }

  try {
    if (brevo) {
      await sendBrevoEmail(brevo, {
        recipient: input.recipient,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
    } else if (smtp) {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth:
          smtp.user && smtp.password
            ? {
                user: smtp.user,
                pass: smtp.password,
              }
            : undefined,
      });

      await transporter.sendMail({
        from: smtp.from,
        to: input.recipient,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
    }

    const [updated] = await getDb()
      .update(authEmail)
      .set({
        deliveryStatus: "sent",
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(authEmail.id, record.id))
      .returning();

    return updated ?? record;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Transactional email failed";

    const [updated] = await getDb()
      .update(authEmail)
      .set({
        deliveryStatus: "failed",
        errorMessage: message.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(authEmail.id, record.id))
      .returning();

    console.error(`[${productEmailIssuer}] Email delivery failed: ${message}`);
    return updated ?? record;
  }
}

export async function sendAuthVerificationOtpEmail(input: {
  email: string;
  otp: string;
  type: "email-verification" | "forget-password" | "sign-in" | "change-email";
}) {
  const brevo = readBrevoConfig();
  const smtp = readSmtpConfig();
  const content = createAuthOtpEmailContent(input);
  const now = new Date();
  const [recipientUser] = await getDb()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, input.email.toLowerCase()))
    .limit(1);
  const [record] = await getDb()
    .insert(authEmail)
    .values({
      id: nanoid(),
      userId: recipientUser?.id ?? null,
      recipient: input.email.toLowerCase(),
      subject: content.subject,
      purpose: "email-verification",
      deliveryStatus: brevo || smtp ? "queued" : "preview",
      previewUrl: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!brevo && !smtp) {
    console.info(
      `[${productEmailIssuer}] ${content.subject} for ${input.email}: ${input.otp}`,
    );
    return record;
  }

  try {
    if (brevo) {
      await sendBrevoEmail(brevo, {
        recipient: input.email,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });
    } else if (smtp) {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth:
          smtp.user && smtp.password
            ? {
                user: smtp.user,
                pass: smtp.password,
              }
            : undefined,
      });

      await transporter.sendMail({
        from: smtp.from,
        to: input.email,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });
    }

    const [updated] = await getDb()
      .update(authEmail)
      .set({
        deliveryStatus: "sent",
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(authEmail.id, record.id))
      .returning();

    return updated ?? record;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OTP email delivery failed";

    const [updated] = await getDb()
      .update(authEmail)
      .set({
        deliveryStatus: "failed",
        errorMessage: message.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(authEmail.id, record.id))
      .returning();

    console.error(`[${productEmailIssuer}] OTP delivery failed: ${message}`);
    return updated ?? record;
  }
}

export async function listAccountAuthEmails(input: {
  userId: string;
  limit?: number;
}) {
  const rows = await getDb()
    .select()
    .from(authEmail)
    .where(eq(authEmail.userId, input.userId))
    .orderBy(desc(authEmail.createdAt))
    .limit(input.limit ?? 5);

  return rows.map<AuthEmailSummary>((row) => ({
    id: row.id,
    subject: row.subject,
    purpose: row.purpose as AuthEmailPurpose,
    deliveryStatus: row.deliveryStatus,
    previewUrl: row.previewUrl,
    errorMessage: row.errorMessage,
    sentAt: row.sentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
