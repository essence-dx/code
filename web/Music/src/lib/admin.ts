import { jsonError } from "@/lib/api";
import { envValue } from "@/lib/env";
import { requireUser } from "@/lib/session";

const defaultAdminEmail = "admin@mail.com";

export function adminEmails() {
  return (envValue("ADMIN_EMAILS") || defaultAdminEmail)
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  return Boolean(email && adminEmails().includes(email.toLowerCase()));
}

export async function requireAdminUser(request: Request) {
  const user = await requireUser(request);

  if (!isAdminEmail(user.email)) {
    throw new AdminForbiddenError();
  }

  return user;
}

export class AdminForbiddenError extends Error {
  constructor() {
    super("Admin access is required.");
    this.name = "AdminForbiddenError";
  }
}

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminForbiddenError) {
    return jsonError("Admin access is required.", 403);
  }

  return undefined;
}
