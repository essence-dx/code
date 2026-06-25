import { z } from "zod";

export const projectPresenceCursorSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const projectPresenceHeartbeatSchema = z.object({
  cursor: projectPresenceCursorSchema.nullable().optional(),
  selectedObjectId: z.string().nullable().optional(),
});

export type ProjectPresenceCursor = z.infer<typeof projectPresenceCursorSchema>;

export interface ProjectPresenceSummary {
  userId: string;
  name: string;
  email: string;
  color: string;
  cursor: ProjectPresenceCursor | null;
  selectedObjectId: string | null;
  lastSeenAt: string;
}
