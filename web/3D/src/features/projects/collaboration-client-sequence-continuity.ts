export interface ProjectCollaborationClientSequenceContinuity {
  expectedSequence: number | null;
  latestSequence: number;
  status: "contiguous" | "gap" | "gap-fill" | "initial" | "unsequenced";
}

export interface ProjectCollaborationClientSequenceRecovery {
  clientId: string;
  expectedSequence: number;
  latestSequence: number;
  rejectedSequence: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeSequence(value: number | null | undefined) {
  return Number.isInteger(value) && value && value > 0 ? value : 0;
}

export function evaluateProjectCollaborationClientSequenceContinuity(input: {
  incomingSequence: number | null | undefined;
  latestSequence: number | null | undefined;
}): ProjectCollaborationClientSequenceContinuity {
  const incomingSequence = normalizeSequence(input.incomingSequence);
  const latestSequence = normalizeSequence(input.latestSequence);

  if (incomingSequence === 0) {
    return {
      expectedSequence: null,
      latestSequence,
      status: "unsequenced",
    };
  }

  if (latestSequence === 0) {
    return {
      expectedSequence: 1,
      latestSequence,
      status: "initial",
    };
  }

  if (incomingSequence === latestSequence + 1) {
    return {
      expectedSequence: incomingSequence,
      latestSequence,
      status: "contiguous",
    };
  }

  if (incomingSequence <= latestSequence) {
    return {
      expectedSequence: latestSequence + 1,
      latestSequence,
      status: "gap-fill",
    };
  }

  return {
    expectedSequence: latestSequence + 1,
    latestSequence,
    status: "gap",
  };
}

export function isProjectCollaborationClientSequenceRecovery(value: unknown): value is ProjectCollaborationClientSequenceRecovery {
  if (
    !isRecord(value) ||
    typeof value.clientId !== "string" ||
    typeof value.expectedSequence !== "number" ||
    typeof value.latestSequence !== "number" ||
    typeof value.rejectedSequence !== "number"
  ) {
    return false;
  }

  const clientId = value.clientId.trim();

  return (
    clientId.length > 0 &&
    clientId.length <= 120 &&
    Number.isInteger(value.latestSequence) &&
    value.latestSequence >= 0 &&
    Number.isInteger(value.expectedSequence) &&
    value.expectedSequence === value.latestSequence + 1 &&
    Number.isInteger(value.rejectedSequence) &&
    value.rejectedSequence > value.expectedSequence
  );
}
