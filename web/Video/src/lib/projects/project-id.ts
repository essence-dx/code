import { z } from "zod";

const projectIdSchema = z.string().min(1).max(160);

export class InvalidProjectIdError extends Error {
  constructor() {
    super("Project id is invalid.");
    this.name = "InvalidProjectIdError";
  }
}

export function parseProjectIdParam(value: unknown) {
  const parsed = projectIdSchema.safeParse(value);
  if (!parsed.success) {
    throw new InvalidProjectIdError();
  }

  return parsed.data;
}
