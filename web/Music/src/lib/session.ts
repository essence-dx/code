import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Sign in to use this feature.");
    this.name = "UnauthorizedError";
  }
}

export async function requireUser(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    throw new UnauthorizedError();
  }

  return session.user;
}
