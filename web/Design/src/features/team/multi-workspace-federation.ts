import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { TeamWorkspaceRole } from "@/db/team-workspaces";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";

export type MultiWorkspaceFederationStatus = "ready" | "review" | "blocked";

export type MultiWorkspaceCommandTarget =
  | "member_roles"
  | "pending_invites"
  | "audit_activity"
  | "access_scope";

export type MultiWorkspaceFederatedCommand = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  status: MultiWorkspaceFederationStatus;
  target: MultiWorkspaceCommandTarget;
  title: string;
  detail: string;
  actionLabel: string;
  auditLogIds: string[];
};

export type MultiWorkspaceFederatedAuditEvent = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  actorEmail: string | null;
  createdAt: string;
  source: "workspace" | "global";
};

export type MultiWorkspaceFederationScope = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  role: TeamWorkspaceRole;
  manageable: boolean;
  status: MultiWorkspaceFederationStatus;
  memberCount: number;
  adminCount: number;
  pendingInviteCount: number;
  recentAuditCount: number;
  commandCount: number;
};

export type MultiWorkspaceCommandPacket = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  commandIds: string[];
  auditEventIds: string[];
  status: MultiWorkspaceFederationStatus;
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type MultiWorkspaceFederationCenter = {
  status: MultiWorkspaceFederationStatus;
  score: number;
  scopes: MultiWorkspaceFederationScope[];
  commands: MultiWorkspaceFederatedCommand[];
  federatedAuditEvents: MultiWorkspaceFederatedAuditEvent[];
  commandPackets: MultiWorkspaceCommandPacket[];
  nextActions: string[];
  totals: {
    workspaces: number;
    manageableWorkspaces: number;
    federatedAuditEvents: number;
    commands: number;
    blockedCommands: number;
    reviewCommands: number;
    commandPackets: number;
  };
};

export type MultiWorkspaceFederationInput = {
  workspaces: TeamWorkspaceManagementSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export function createMultiWorkspaceFederationCenter(
  input: MultiWorkspaceFederationInput,
): MultiWorkspaceFederationCenter {
  const workspacesById = new Map(
    input.workspaces.map((workspace) => [workspace.id, workspace]),
  );
  const federatedAuditEvents = createFederatedAuditEvents({
    workspaces: input.workspaces,
    workspacesById,
    auditLogs: input.auditLogs,
  });
  const auditEventsByWorkspaceId = groupByWorkspace(federatedAuditEvents);
  const commands = input.workspaces.flatMap((workspace) =>
    createWorkspaceCommands({
      workspace,
      auditEvents: auditEventsByWorkspaceId.get(workspace.id) ?? [],
    }),
  );
  const commandsByWorkspaceId = groupCommandsByWorkspace(commands);
  const scopes = input.workspaces.map((workspace) =>
    createFederationScope({
      workspace,
      auditEvents: auditEventsByWorkspaceId.get(workspace.id) ?? [],
      commands: commandsByWorkspaceId.get(workspace.id) ?? [],
    }),
  );
  const blockedCommands = commands.filter(
    (command) => command.status === "blocked",
  ).length;
  const reviewCommands = commands.filter(
    (command) => command.status === "review",
  ).length;
  const commandPackets = createCommandPackets({
    commandsByWorkspaceId,
    auditEventsByWorkspaceId,
    workspacesById,
    now: normalizeNow(input.now),
  });
  const status = blockedCommands
    ? "blocked"
    : reviewCommands
      ? "review"
      : "ready";
  const manageableWorkspaces = input.workspaces.filter((workspace) =>
    canManageWorkspace(workspace.role),
  ).length;

  return {
    status,
    score: scoreFederationCenter({
      workspaces: input.workspaces.length,
      manageableWorkspaces,
      blockedCommands,
      reviewCommands,
      federatedAuditEvents: federatedAuditEvents.length,
    }),
    scopes,
    commands: commands.sort(compareCommands),
    federatedAuditEvents,
    commandPackets,
    nextActions: createNextActions(commands),
    totals: {
      workspaces: input.workspaces.length,
      manageableWorkspaces,
      federatedAuditEvents: federatedAuditEvents.length,
      commands: commands.length,
      blockedCommands,
      reviewCommands,
      commandPackets: commandPackets.length,
    },
  };
}

function createFederatedAuditEvents(input: {
  workspaces: TeamWorkspaceManagementSummary[];
  workspacesById: Map<string, TeamWorkspaceManagementSummary>;
  auditLogs: WorkspaceAuditLogSummary[];
}): MultiWorkspaceFederatedAuditEvent[] {
  const workspaceEvents = input.workspaces.flatMap((workspace) =>
    workspace.recentActivity.map((activity) => ({
      id: activity.id,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      action: activity.action,
      targetType: "team_workspace",
      targetId: workspace.id,
      summary: activity.summary,
      actorEmail: activity.actorEmail,
      createdAt: activity.createdAt,
      source: "workspace" as const,
    })),
  );
  const globalEvents = input.auditLogs.flatMap((log) => {
    const workspace = getAuditWorkspace(log, input.workspacesById);

    if (!workspace) return [];

    return [
      {
        id: log.id,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        summary: log.summary,
        actorEmail: log.actorEmail,
        createdAt: log.createdAt,
        source: "global" as const,
      },
    ];
  });
  const eventById = new Map<string, MultiWorkspaceFederatedAuditEvent>();

  for (const event of [...workspaceEvents, ...globalEvents]) {
    eventById.set(event.id, event);
  }

  return Array.from(eventById.values())
    .sort(
      (left, right) =>
        Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
        left.workspaceName.localeCompare(right.workspaceName),
    )
    .slice(0, 24);
}

function getAuditWorkspace(
  log: WorkspaceAuditLogSummary,
  workspacesById: Map<string, TeamWorkspaceManagementSummary>,
) {
  if (log.targetType === "team_workspace" && log.targetId) {
    return workspacesById.get(log.targetId) ?? null;
  }

  const metadataWorkspaceId = stringOrNull(log.metadata.workspaceId);

  if (metadataWorkspaceId) {
    return workspacesById.get(metadataWorkspaceId) ?? null;
  }

  return null;
}

function createWorkspaceCommands(input: {
  workspace: TeamWorkspaceManagementSummary;
  auditEvents: MultiWorkspaceFederatedAuditEvent[];
}): MultiWorkspaceFederatedCommand[] {
  const commands: MultiWorkspaceFederatedCommand[] = [];
  const manageable = canManageWorkspace(input.workspace.role);
  const adminCount = countAdmins(input.workspace);
  const auditLogIds = input.auditEvents.map((event) => event.id);

  if (!manageable) {
    return commands;
  }

  if (adminCount < 2) {
    commands.push({
      id: `${input.workspace.id}-backup-admin`,
      workspaceId: input.workspace.id,
      workspaceName: input.workspace.name,
      status: "blocked",
      target: "member_roles",
      title: "Add backup admin coverage",
      detail:
        "Only one owner or admin can manage this workspace. Add a second trusted admin before scaling operations.",
      actionLabel: "Review members",
      auditLogIds,
    });
  }

  if (input.workspace.pendingInvites.length) {
    commands.push({
      id: `${input.workspace.id}-pending-invites`,
      workspaceId: input.workspace.id,
      workspaceName: input.workspace.name,
      status: "review",
      target: "pending_invites",
      title: `Review ${input.workspace.pendingInvites.length} pending invite${
        input.workspace.pendingInvites.length === 1 ? "" : "s"
      }`,
      detail:
        "Pending workspace invites should be accepted, re-sent, or revoked before handoff.",
      actionLabel: "Open invites",
      auditLogIds,
    });
  }

  if (!input.auditEvents.length) {
    commands.push({
      id: `${input.workspace.id}-audit-gap`,
      workspaceId: input.workspace.id,
      workspaceName: input.workspace.name,
      status: "review",
      target: "audit_activity",
      title: "Refresh workspace audit visibility",
      detail:
        "No recent federated audit events are visible for this workspace.",
      actionLabel: "Review audit setup",
      auditLogIds: [],
    });
  }

  return commands;
}

function createFederationScope(input: {
  workspace: TeamWorkspaceManagementSummary;
  auditEvents: MultiWorkspaceFederatedAuditEvent[];
  commands: MultiWorkspaceFederatedCommand[];
}): MultiWorkspaceFederationScope {
  const blocked = input.commands.some(
    (command) => command.status === "blocked",
  );
  const review = input.commands.some((command) => command.status === "review");

  return {
    id: `scope-${input.workspace.id}`,
    workspaceId: input.workspace.id,
    workspaceName: input.workspace.name,
    role: input.workspace.role,
    manageable: canManageWorkspace(input.workspace.role),
    status: blocked ? "blocked" : review ? "review" : "ready",
    memberCount: input.workspace.members.length,
    adminCount: countAdmins(input.workspace),
    pendingInviteCount: input.workspace.pendingInvites.length,
    recentAuditCount: input.auditEvents.length,
    commandCount: input.commands.length,
  };
}

function createCommandPackets(input: {
  commandsByWorkspaceId: Map<string, MultiWorkspaceFederatedCommand[]>;
  auditEventsByWorkspaceId: Map<string, MultiWorkspaceFederatedAuditEvent[]>;
  workspacesById: Map<string, TeamWorkspaceManagementSummary>;
  now: Date;
}): MultiWorkspaceCommandPacket[] {
  return Array.from(input.commandsByWorkspaceId.entries())
    .flatMap(([workspaceId, commands]) => {
      const workspace = input.workspacesById.get(workspaceId);

      if (!workspace || !commands.length) return [];

      const auditEvents = input.auditEventsByWorkspaceId.get(workspaceId) ?? [];
      const status: MultiWorkspaceFederationStatus = commands.some(
        (command) => command.status === "blocked",
      )
        ? "blocked"
        : commands.some((command) => command.status === "review")
          ? "review"
          : "ready";
      const payload = {
        kind: "essence-studio.multi-workspace-command-packet",
        version: 1,
        generatedAt: input.now.toISOString(),
        workspace: {
          id: workspace.id,
          name: workspace.name,
          role: workspace.role,
        },
        status,
        commands,
        auditEvents,
      };
      const json = JSON.stringify(payload, null, 2);

      return [
        {
          id: `packet-${workspace.id}`,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          commandIds: commands.map((command) => command.id),
          auditEventIds: auditEvents.map((event) => event.id),
          status,
          download: {
            fileName: `multi-workspace-command-packet-${slugify(
              workspace.name,
            )}.json`,
            href: `data:application/json;charset=utf-8,${encodeURIComponent(
              json,
            )}`,
            json,
          },
        },
      ];
    })
    .sort(
      (left, right) =>
        statusWeight(left.status) - statusWeight(right.status) ||
        left.workspaceName.localeCompare(right.workspaceName),
    );
}

function groupByWorkspace(events: MultiWorkspaceFederatedAuditEvent[]) {
  const grouped = new Map<string, MultiWorkspaceFederatedAuditEvent[]>();

  for (const event of events) {
    const workspaceEvents = grouped.get(event.workspaceId) ?? [];
    workspaceEvents.push(event);
    grouped.set(event.workspaceId, workspaceEvents);
  }

  return grouped;
}

function groupCommandsByWorkspace(commands: MultiWorkspaceFederatedCommand[]) {
  const grouped = new Map<string, MultiWorkspaceFederatedCommand[]>();

  for (const command of commands) {
    const workspaceCommands = grouped.get(command.workspaceId) ?? [];
    workspaceCommands.push(command);
    grouped.set(command.workspaceId, workspaceCommands);
  }

  return grouped;
}

function createNextActions(commands: MultiWorkspaceFederatedCommand[]) {
  return commands
    .sort(compareCommands)
    .map((command) => `${command.workspaceName}: ${command.detail}`)
    .slice(0, 5);
}

function compareCommands(
  left: MultiWorkspaceFederatedCommand,
  right: MultiWorkspaceFederatedCommand,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.workspaceName.localeCompare(right.workspaceName) ||
    left.title.localeCompare(right.title)
  );
}

function scoreFederationCenter(input: {
  workspaces: number;
  manageableWorkspaces: number;
  blockedCommands: number;
  reviewCommands: number;
  federatedAuditEvents: number;
}) {
  if (!input.workspaces) return 70;

  const coverage = Math.round(
    (input.manageableWorkspaces / input.workspaces) * 25,
  );
  const auditScore = Math.min(25, input.federatedAuditEvents * 5);
  const penalty = input.blockedCommands * 18 + input.reviewCommands * 7;

  return Math.max(0, Math.min(100, 50 + coverage + auditScore - penalty));
}

function countAdmins(workspace: TeamWorkspaceManagementSummary) {
  return workspace.members.filter((member) => canManageWorkspace(member.role))
    .length;
}

function canManageWorkspace(role: TeamWorkspaceRole) {
  return role === "owner" || role === "admin";
}

function statusWeight(status: MultiWorkspaceFederationStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

function stringOrNull(value: unknown) {
  const stringValue = String(value ?? "").trim();

  return stringValue || null;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace"
  );
}
