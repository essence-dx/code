export const productName = "Design";
export const productDescription =
  "A private design studio for creating, organizing, and publishing visual work.";
export const productEmailFrom =
  process.env.BREVO_FROM_EMAIL?.trim() ||
  process.env.SMTP_FROM?.trim() ||
  "ajju40959@gmail.com";
export const productEmailFromName =
  process.env.BREVO_FROM_NAME?.trim() || productName;
export const productEmailIssuer = "Essence Studio";
export const productUserAgent = "EssenceStudio/0.1";
