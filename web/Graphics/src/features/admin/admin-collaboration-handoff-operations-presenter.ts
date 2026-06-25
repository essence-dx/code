import type {
  AdminCollaborationPresenterState,
} from "@/features/admin/admin-collaboration-handoff-operations-types";
import { toIsoFromMs } from "@/features/admin/admin-collaboration-handoff-operations-utils";
import type { DesignCollaborationPresenceEvent } from "@/features/editor/types";

type PresenterCandidate = {
  peerId: string;
  peerName: string;
  peerEmail: string | null;
  latestOnAt: number;
  latestOffAt: number;
};

export function getAdminCollaborationPresenterState(
  events: DesignCollaborationPresenceEvent[],
): AdminCollaborationPresenterState {
  const spotlightEvents = events.filter(
    (event) => event.kind === "spotlight-on" || event.kind === "spotlight-off",
  );
  const followEvents = events.filter(
    (event) => event.kind === "followed" || event.kind === "unfollowed",
  );
  const activePresenters = getActivePresenters(spotlightEvents);
  const owner = activePresenters.length === 1 ? activePresenters[0] : null;
  const status =
    activePresenters.length > 1 ? "conflict" : owner ? "owned" : "idle";
  const replayEventCount = spotlightEvents.length + followEvents.length;
  const lastHandoffAt =
    replayEventCount > 0
      ? Math.max(
          ...[...spotlightEvents, ...followEvents].map((event) => event.createdAt),
        )
      : null;

  return {
    status,
    ownerName: owner?.peerName ?? null,
    ownerEmail: owner?.peerEmail ?? null,
    activePresenterCount: activePresenters.length,
    spotlightEventCount: spotlightEvents.length,
    followEventCount: followEvents.length,
    replayEventCount,
    lastHandoffAt: toIsoFromMs(lastHandoffAt),
    summary: getPresenterSummary({
      activePresenterCount: activePresenters.length,
      ownerName: owner?.peerName ?? null,
      replayEventCount,
      status,
    }),
  };
}

function getActivePresenters(events: DesignCollaborationPresenceEvent[]) {
  const byPeer = new Map<string, PresenterCandidate>();

  for (const event of events) {
    const peerId = event.peerId ?? event.peerEmail ?? event.peerName;
    const current =
      byPeer.get(peerId) ??
      ({
        peerId,
        peerName: event.peerName,
        peerEmail: event.peerEmail ?? null,
        latestOnAt: 0,
        latestOffAt: 0,
      } satisfies PresenterCandidate);

    byPeer.set(peerId, {
      ...current,
      peerName: event.peerName,
      peerEmail: event.peerEmail ?? current.peerEmail,
      latestOnAt:
        event.kind === "spotlight-on"
          ? Math.max(current.latestOnAt, event.createdAt)
          : current.latestOnAt,
      latestOffAt:
        event.kind === "spotlight-off"
          ? Math.max(current.latestOffAt, event.createdAt)
          : current.latestOffAt,
    });
  }

  return [...byPeer.values()].filter(
    (candidate) => candidate.latestOnAt > candidate.latestOffAt,
  );
}

function getPresenterSummary({
  activePresenterCount,
  ownerName,
  replayEventCount,
  status,
}: {
  activePresenterCount: number;
  ownerName: string | null;
  replayEventCount: number;
  status: AdminCollaborationPresenterState["status"];
}) {
  if (status === "conflict") {
    return `${activePresenterCount} collaborators appear to own presenter spotlight.`;
  }

  if (status === "owned") {
    return `${ownerName ?? "A collaborator"} owns presenter handoff with ${replayEventCount} replay events.`;
  }

  return replayEventCount > 0
    ? `No active presenter, but ${replayEventCount} presenter replay events are available.`
    : "No presenter ownership or replay evidence has been recorded.";
}
