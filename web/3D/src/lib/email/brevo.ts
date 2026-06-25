type VerificationOtpType = "email-verification" | "sign-in" | "forget-password" | "change-email";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_SENDER_EMAIL = "ajju40959@gmail.com";
const DEFAULT_SENDER_NAME = "Essence Spline";

export interface BrevoEmailRecipient {
  email: string;
  name?: string;
}

export interface BrevoEmailResult {
  messageId: string | null;
}

function cleanEnvValue(value: string | undefined) {
  return value?.trim().replace(/^\uFEFF/, "").replace(/^\u200B/, "").replace(/^"(.*)"$/, "$1");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return replacements[char] ?? char;
  });
}

function getSubject(type: VerificationOtpType) {
  switch (type) {
    case "forget-password":
      return "Reset your Essence Spline password";
    case "sign-in":
      return "Your Essence Spline sign-in code";
    case "change-email":
      return "Confirm your new Essence Spline email";
    case "email-verification":
    default:
      return "Confirm your Essence Spline email";
  }
}

function getIntro(type: VerificationOtpType) {
  switch (type) {
    case "forget-password":
      return "Use this code to reset your password.";
    case "sign-in":
      return "Use this code to finish signing in.";
    case "change-email":
      return "Use this code to confirm your new email address.";
    case "email-verification":
    default:
      return "Use this code to confirm your account email.";
  }
}

export async function sendBrevoEmail(input: {
  htmlContent: string;
  subject: string;
  textContent: string;
  to: BrevoEmailRecipient[];
}): Promise<BrevoEmailResult> {
  const apiKey = cleanEnvValue(process.env.BREVO_API_KEY);
  const senderEmail = cleanEnvValue(process.env.BREVO_SENDER_EMAIL) || DEFAULT_SENDER_EMAIL;
  const senderName = cleanEnvValue(process.env.BREVO_SENDER_NAME) || DEFAULT_SENDER_NAME;

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is required to send email.");
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      htmlContent: input.htmlContent,
      sender: {
        email: senderEmail,
        name: senderName,
      },
      subject: input.subject,
      textContent: input.textContent,
      to: input.to,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Brevo email delivery failed with status ${response.status}: ${message}`);
  }

  const payload = await response.json().catch(() => null);
  const messageId = typeof payload?.messageId === "string" ? payload.messageId : null;

  return { messageId };
}

export async function sendVerificationOtpEmail({ email, otp, type }: { email: string; otp: string; type: VerificationOtpType }) {
  const safeOtp = escapeHtml(otp);
  const safeIntro = escapeHtml(getIntro(type));

  await sendBrevoEmail({
    htmlContent: `
        <div style="font-family: Inter, Arial, sans-serif; color: #18181b; line-height: 1.55;">
          <p>${safeIntro}</p>
          <p style="font-size: 32px; letter-spacing: 8px; font-weight: 700; margin: 24px 0;">${safeOtp}</p>
          <p>This code expires shortly. If you did not request it, you can ignore this email.</p>
        </div>
      `,
    subject: getSubject(type),
    textContent: `${getIntro(type)}\n\n${otp}\n\nThis code expires shortly. If you did not request it, you can ignore this email.`,
    to: [{ email }],
  });
}
