import {
  getBrevoApiKey,
  getBrevoSenderEmail,
  getBrevoSenderName,
} from "@/server/env"

type BrevoEmailInput = {
  to: string
  subject: string
  textContent: string
  htmlContent: string
}

const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email"

export async function sendBrevoEmail(input: BrevoEmailInput) {
  const apiKey = getBrevoApiKey()

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured")
  }

  const response = await fetch(BREVO_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: getBrevoSenderEmail(),
        name: getBrevoSenderName(),
      },
      to: [{ email: input.to }],
      subject: input.subject,
      textContent: input.textContent,
      htmlContent: input.htmlContent,
    }),
  })

  if (!response.ok) {
    throw new Error(`Brevo email failed with status ${response.status}`)
  }
}

export async function sendAuthOtpEmail(input: {
  email: string
  otp: string
  type: "sign-in" | "email-verification" | "forget-password" | "change-email"
}) {
  const subject =
    input.type === "forget-password"
      ? "Reset your Essence PowerPoint password"
      : "Confirm your Essence PowerPoint email"

  await sendBrevoEmail({
    to: input.email,
    subject,
    textContent: `Your Essence PowerPoint confirmation code is ${input.otp}. It expires soon.`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h1 style="font-size:20px;margin:0 0 12px">Essence PowerPoint</h1>
        <p style="margin:0 0 12px">Use this confirmation code to continue:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0;color:#111827">${input.otp}</div>
        <p style="margin:0;color:#4b5563">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  })
}
