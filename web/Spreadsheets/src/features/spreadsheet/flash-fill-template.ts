import type { FlashFillCandidate } from "@/features/spreadsheet/flash-fill-candidates";

export type FlashFillOrientation = "column" | "row";

export type FlashFillTemplatePart =
  | { kind: "literal"; value: string }
  | { kind: "candidate"; id: string };

export type FlashFillExample = {
  candidates: FlashFillCandidate[];
  target: string;
};

export function inferFlashFillTemplate(examples: FlashFillExample[]) {
  const first = examples[0];

  if (!first) {
    return null;
  }

  const templates = inferTemplatesFromExample(first.target, first.candidates);
  const firstCandidateValues = candidatesById(first.candidates);

  return templates
    .filter((template) =>
      template.some((part) => part.kind === "candidate") &&
      examples.every(
        (example) =>
          renderFlashFillTemplate(template, candidatesById(example.candidates)) ===
          example.target,
      ),
    )
    .sort((left, right) =>
      compareTemplates(left, right, firstCandidateValues),
    )[0] ?? null;
}

export function renderFlashFillTemplate(
  template: FlashFillTemplatePart[],
  candidates: Map<string, string>,
) {
  let result = "";

  for (const part of template) {
    if (part.kind === "literal") {
      result += part.value;
      continue;
    }

    const value = candidates.get(part.id);

    if (!value) {
      return "";
    }

    result += value;
  }

  return result;
}

export function flashFillCandidatesById(candidates: FlashFillCandidate[]) {
  return new Map(candidates.map((candidate) => [candidate.id, candidate.value]));
}

export function describeFlashFillTemplate(
  orientation: FlashFillOrientation,
  template: FlashFillTemplatePart[],
) {
  const placeholders = template.filter((part) => part.kind === "candidate").length;
  const axis = orientation === "column" ? "rows" : "columns";

  return `${placeholders} source part${placeholders === 1 ? "" : "s"} across ${axis}`;
}

function inferTemplatesFromExample(
  target: string,
  candidates: FlashFillCandidate[],
) {
  const usableCandidates = candidates
    .filter((candidate) => candidate.value && target.includes(candidate.value))
    .sort((left, right) => right.value.length - left.value.length);
  const templates: FlashFillTemplatePart[][] = [];

  function walk(position: number, parts: FlashFillTemplatePart[]) {
    if (templates.length > 80) {
      return;
    }

    if (position >= target.length) {
      templates.push(compactTemplate(parts));
      return;
    }

    let matched = false;

    for (const candidate of usableCandidates) {
      const nextIndex = target.indexOf(candidate.value, position);

      if (nextIndex < position) {
        continue;
      }

      matched = true;
      walk(nextIndex + candidate.value.length, [
        ...parts,
        ...(nextIndex > position
          ? [{ kind: "literal" as const, value: target.slice(position, nextIndex) }]
          : []),
        { kind: "candidate", id: candidate.id },
      ]);
    }

    if (!matched) {
      walk(target.length, [
        ...parts,
        { kind: "literal", value: target.slice(position) },
      ]);
    }
  }

  walk(0, []);

  return templates;
}

function compactTemplate(parts: FlashFillTemplatePart[]) {
  const compacted: FlashFillTemplatePart[] = [];

  for (const part of parts) {
    const previous = compacted.at(-1);

    if (part.kind === "literal" && previous?.kind === "literal") {
      previous.value += part.value;
    } else {
      compacted.push({ ...part });
    }
  }

  return compacted;
}

function compareTemplates(
  left: FlashFillTemplatePart[],
  right: FlashFillTemplatePart[],
  candidateValues: Map<string, string>,
) {
  return (
    templateScore(right, candidateValues) - templateScore(left, candidateValues)
  );
}

function templateScore(
  template: FlashFillTemplatePart[],
  candidateValues: Map<string, string>,
) {
  const placeholderCount = template.filter((part) => part.kind === "candidate").length;
  const dynamicLength = template.reduce(
    (total, part) =>
      total +
      (part.kind === "candidate"
        ? (candidateValues.get(part.id)?.length ?? 0)
        : 0),
    0,
  );
  const literalLength = template.reduce(
    (total, part) => total + (part.kind === "literal" ? part.value.length : 0),
    0,
  );

  return dynamicLength * 10 + placeholderCount * 2 - literalLength * 5 - template.length;
}

function candidatesById(candidates: FlashFillCandidate[]) {
  return flashFillCandidatesById(candidates);
}
