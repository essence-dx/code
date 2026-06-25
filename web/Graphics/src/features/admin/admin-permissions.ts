export const DEFAULT_ADMIN_EMAIL = "essencefromexistence@gmail.com";

export function isAdminEmail(email: string) {
  return getAdminEmails().includes(email.toLowerCase());
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? DEFAULT_ADMIN_EMAIL)
    .split(",")
    .map((email) =>
      email.replace(/[\uFEFF\u200B-\u200F\u2060]/g, "").trim().toLowerCase(),
    )
    .filter(Boolean);
}
