import { requireServerEnv } from "@/lib/env";

const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const OTP_EXPIRY_MINUTES = 10;

type SendBrevoOtpEmailInput = {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
};

function otpSubject(type: SendBrevoOtpEmailInput["type"]) {
  if (type === "change-email") {
    return "Confirm your new Essence Excel email";
  }

  if (type === "forget-password") {
    return "Reset your Essence Excel password";
  }

  return "Your Essence Excel confirmation code";
}

function otpHtml(otp: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #18181b;">
      <h1 style="font-size: 20px; margin: 0 0 12px;">Essence Excel confirmation</h1>
      <p style="margin: 0 0 16px;">Use this code to finish signing in:</p>
      <p style="font-size: 28px; letter-spacing: 8px; font-weight: 700; margin: 0 0 16px;">${otp}</p>
      <p style="margin: 0; color: #52525b;">The code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
    </div>
  `;
}

export async function sendBrevoOtpEmail(input: SendBrevoOtpEmailInput) {
  const apiKey = requireServerEnv("BREVO_API_KEY");
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? "ajju40959@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME ?? "Essence Excel";

  const response = await fetch(BREVO_EMAIL_ENDPOINT, {
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
      to: [{ email: input.email }],
      subject: otpSubject(input.type),
      htmlContent: otpHtml(input.otp),
      textContent: `Your Essence Excel confirmation code is ${input.otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Brevo email delivery failed with status ${response.status}: ${body}`);
  }
}
