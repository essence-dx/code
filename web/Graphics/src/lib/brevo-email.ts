type SendBrevoEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendBrevoEmail({
  to,
  subject,
  html,
  text,
}: SendBrevoEmailInput) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? "Essence";

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is required to send verification email.");
  }

  if (!senderEmail) {
    throw new Error("BREVO_SENDER_EMAIL is required to send verification email.");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
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
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Brevo email delivery failed with status ${response.status}${
        detail ? `: ${detail}` : ""
      }`,
    );
  }
}
