export type DeckActorRole = "anonymous" | "none" | "viewer" | "editor" | "owner";

export type DeckCollaboratorRole = Extract<DeckActorRole, "viewer" | "editor">;

export type DeckOperation =
  | "read"
  | "presence"
  | "comment"
  | "save"
  | "merge"
  | "restore"
  | "share"
  | "delete";

export type DeckOperationAccessMode = "read" | "write" | "owner";

export type DeckOperationAccessDecision =
  | {
      ok: true;
      mode: DeckOperationAccessMode;
      operation: DeckOperation;
      role: Extract<DeckActorRole, "viewer" | "editor" | "owner">;
    }
  | {
      ok: false;
      error: "Unauthorized" | "Forbidden";
      operation: DeckOperation;
      role: DeckActorRole;
      status: 401 | 403;
    };

const rolePermissions: Record<DeckActorRole, readonly DeckOperation[]> = {
  anonymous: [],
  none: [],
  viewer: ["read", "presence", "comment"],
  editor: ["read", "presence", "comment", "save", "merge", "restore"],
  owner: ["read", "presence", "comment", "save", "merge", "restore", "share", "delete"],
};

const writeOperations = new Set<DeckOperation>(["comment", "save", "merge", "restore"]);
const ownerOperations = new Set<DeckOperation>(["share", "delete"]);

export function resolveDeckActorRole(input: {
  collaboratorRole?: DeckCollaboratorRole | null;
  ownerId: string;
  userId?: string | null;
}): DeckActorRole {
  if (!input.userId) {
    return "anonymous";
  }

  if (input.userId === input.ownerId) {
    return "owner";
  }

  if (input.collaboratorRole === "editor" || input.collaboratorRole === "viewer") {
    return input.collaboratorRole;
  }

  return "none";
}

export function resolveDeckOperationAccess(input: {
  operation: DeckOperation;
  role: DeckActorRole;
}): DeckOperationAccessDecision {
  if (input.role === "anonymous" || input.role === "none") {
    return {
      ok: false,
      error: input.role === "anonymous" ? "Unauthorized" : "Forbidden",
      operation: input.operation,
      role: input.role,
      status: input.role === "anonymous" ? 401 : 403,
    };
  }

  const allowed = rolePermissions[input.role].includes(input.operation);

  if (!allowed) {
    return {
      ok: false,
      error: "Forbidden",
      operation: input.operation,
      role: input.role,
      status: 403,
    };
  }

  return {
    ok: true,
    mode: resolveAccessMode(input.operation, input.role),
    operation: input.operation,
    role: input.role,
  };
}

export function assertDeckOperationAccess(input: {
  operation: DeckOperation;
  role: DeckActorRole;
}): Extract<DeckOperationAccessDecision, { ok: true }> {
  const decision = resolveDeckOperationAccess(input);

  if (!decision.ok) {
    throw new Error(decision.status === 401 ? "unauthorized" : "forbidden");
  }

  return decision;
}

function resolveAccessMode(operation: DeckOperation, role: DeckActorRole): DeckOperationAccessMode {
  if (role === "owner" || ownerOperations.has(operation)) {
    return "owner";
  }

  if (writeOperations.has(operation)) {
    return "write";
  }

  return "read";
}
