type AuthOtpType =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email";

type SendAuthOtpEmailInput = {
  email: string;
  otp: string;
  type: AuthOtpType;
};

const brevoEndpoint = "https://api.brevo.com/v3/smtp/email";

export async function sendAuthOtpEmail({
  email,
  otp,
  type,
}: SendAuthOtpEmailInput) {
  const apiKey = envValue("BREVO_API_KEY");

  if (!apiKey) {
    throw new Error("Email delivery is not configured.");
  }

  const senderEmail =
    envValue("BREVO_SENDER_EMAIL") || "ajju40959@gmail.com";
  const senderName = envValue("BREVO_SENDER_NAME") || "Essence Suno";
  const purpose = otpPurpose(type);
  const minutes = Math.round(Number(process.env.AUTH_OTP_EXPIRES_SECONDS ?? 600) / 60);
  const response = await fetch(brevoEndpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [{ email }],
      subject: `${purpose} code for Essence Suno`,
      textContent: `Your Essence Suno ${purpose.toLowerCase()} code is ${otp}. It expires in ${minutes} minutes.`,
      htmlContent: renderOtpEmail({ otp, purpose, minutes }),
    }),
  });

  if (!response.ok) {
    throw new Error(`Email delivery failed with status ${response.status}.`);
  }
}

function otpPurpose(type: AuthOtpType) {
  if (type === "sign-in") {
    return "Sign in";
  }
  if (type === "forget-password") {
    return "Password reset";
  }
  if (type === "change-email") {
    return "Email change";
  }

  return "Email verification";
}

function renderOtpEmail({
  minutes,
  otp,
  purpose,
}: {
  minutes: number;
  otp: string;
  purpose: string;
}) {
  return `
    <div style="margin:0;background:#080b12;padding:32px;font-family:Inter,Arial,sans-serif;color:#f8fafc">
      <div style="margin:0 auto;max-width:520px;border:1px solid rgba(255,255,255,0.12);border-radius:12px;background:#0f172a;padding:28px">
        <p style="margin:0 0 8px;color:#6ee7b7;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Essence Suno</p>
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25">${purpose}</h1>
        <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.6">Use this one-time code to continue. It expires in ${minutes} minutes.</p>
        <div style="margin:0 0 20px;border-radius:10px;background:#020617;padding:18px;text-align:center;font-size:32px;font-weight:800;letter-spacing:0.24em">${otp}</div>
        <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5">If you did not request this code, you can ignore this email.</p>
      </div>
    </div>
  `;
}
import { envValue } from "@/lib/env";
