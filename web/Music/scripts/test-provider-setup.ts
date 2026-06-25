import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { ProviderCapability } from "../src/lib/ai/schemas";
import {
  getProviderSetupItems,
  getProviderSetupBadge,
  getProviderSetupBadgeLabel,
  getProviderSetupOutcome,
  getProviderSetupOutcomeGroup,
  getProviderSetupSummary,
  getRemainingProviderSetupItemCount,
  groupProviderSetupItems,
  isProviderSetupOutcomeCompact,
  providerSetupOutcomeMaxLength,
} from "../src/features/suno/provider-setup";

function capability(
  id: string,
  state: ProviderCapability["state"] = "disabled",
): ProviderCapability {
  return {
    disabledReason: "Connect a provider.",
    env: [],
    group: "music",
    id,
    label: id,
    requirement: "provider",
    state,
    summary: "Provider-backed path.",
  };
}

type ProviderSetupCopyGroup = "fallback" | "pending" | "priority";
type ProviderSetupCopyState = "locked" | "pending" | "ready";
type ProviderSetupCopyInventoryKey =
  `${ProviderSetupCopyGroup}:${ProviderSetupCopyState}`;

type ProviderSetupCopyCase = {
  badgeLabel: string;
  capabilities: ProviderCapability[];
  group: ProviderSetupCopyGroup;
  name: string;
  state: ProviderSetupCopyState;
  summary: string;
};

type ProviderSetupCopyDuplicateNameFixture = {
  duplicateCaseName: string;
  originalName: string;
};

type ProviderSetupCopyExpectedMismatchCase = {
  readonly fixtureDeclaration: string;
  readonly label: ProviderSetupCopyExpectedMismatchCaseLabel;
  readonly matchingDeclaration: string;
  readonly rejectedDeclaration: string;
};

type ProviderSetupCopyExpectedMismatchCaseOrder = readonly [
  ProviderSetupCopyExpectedMismatchCase,
  ProviderSetupCopyExpectedMismatchCase,
];

type ProviderSetupCopyExpectedMismatchCaseLabel =
  | "mismatched entrypoint declaration fixture"
  | "expected entrypoint declaration fixture";

type ProviderSetupCopyExpectedMismatchCaseLabelOrder = readonly [
  "mismatched entrypoint declaration fixture",
  "expected entrypoint declaration fixture",
];

const expectedProviderSetupCopyExpectedMismatchCaseLabels:
  ProviderSetupCopyExpectedMismatchCaseLabelOrder = [
    "mismatched entrypoint declaration fixture",
    "expected entrypoint declaration fixture",
  ];
const [
  providerSetupCopyExpectedMismatchMismatchedCaseLabel,
  providerSetupCopyExpectedMismatchExpectedCaseLabel,
] = expectedProviderSetupCopyExpectedMismatchCaseLabels;

const providerSetupCopyCases: ProviderSetupCopyCase[] = [
  {
    badgeLabel: "Checking",
    capabilities: [],
    group: "pending",
    name: "pending: no capability data",
    state: "pending",
    summary: "Checking creation paths",
  },
  {
    badgeLabel: "Ready",
    capabilities: [
      capability("song-generation", "ready"),
      capability("cover-remix", "ready"),
    ],
    group: "priority",
    name: "priority ready: all priority paths ready",
    state: "ready",
    summary: "Priority paths ready",
  },
  {
    badgeLabel: "2/3 locked",
    capabilities: [
      capability("song-generation"),
      capability("cover-remix", "ready"),
      capability("extend-song"),
      capability("custom-model-training"),
    ],
    group: "priority",
    name: "priority locked: mixed priority paths",
    state: "locked",
    summary: "2/3 priority paths locked",
  },
  {
    badgeLabel: "1/2 locked",
    capabilities: [
      capability("song-generation"),
      capability("cover-remix", "ready"),
    ],
    group: "priority",
    name: "priority locked: single priority path",
    state: "locked",
    summary: "1/2 priority path locked",
  },
  {
    badgeLabel: "1/2 locked",
    capabilities: [
      capability("custom-model-training"),
      capability("unknown-provider-gap", "ready"),
    ],
    group: "fallback",
    name: "fallback locked: single fallback path",
    state: "locked",
    summary: "1/2 path locked",
  },
  {
    badgeLabel: "2/3 locked",
    capabilities: [
      capability("custom-model-training"),
      capability("unknown-provider-gap"),
      capability("sample-provider-gap", "ready"),
    ],
    group: "fallback",
    name: "fallback locked: mixed fallback paths",
    state: "locked",
    summary: "2/3 paths locked",
  },
  {
    badgeLabel: "Ready",
    capabilities: [capability("custom-model-training", "ready")],
    group: "fallback",
    name: "fallback ready: all fallback paths ready",
    state: "ready",
    summary: "Provider paths ready",
  },
];

const providerSetupCopyDuplicateNameFixtures: ProviderSetupCopyDuplicateNameFixture[] = [
  {
    duplicateCaseName: "priority ready: all priority paths ready",
    originalName: "pending: no capability data",
  },
  {
    duplicateCaseName: "priority locked: single priority path",
    originalName: "priority locked: mixed priority paths",
  },
  {
    duplicateCaseName: "fallback locked: single fallback path",
    originalName: "pending: no capability data",
  },
];

const expectedProviderSetupCopyGroupOrder: ProviderSetupCopyGroup[] = [
  "pending",
  "priority",
  "fallback",
];

const expectedProviderSetupCopyStateOrder: ProviderSetupCopyState[] = [
  "locked",
  "pending",
  "ready",
];

const expectedProviderSetupCopyGroupCounts: Record<
  ProviderSetupCopyGroup,
  number
> = {
  fallback: 3,
  pending: 1,
  priority: 3,
};

const expectedProviderSetupCopyStateCounts: Record<
  ProviderSetupCopyState,
  number
> = {
  locked: 4,
  pending: 1,
  ready: 2,
};

const expectedProviderSetupCopyInventory: ProviderSetupCopyInventoryKey[] = [
  "pending:pending",
  "priority:ready",
  "priority:locked",
  "priority:locked",
  "fallback:locked",
  "fallback:locked",
  "fallback:ready",
];

const expectedProviderSetupCopyInventoryPhaseCalls = [
  "assertProviderSetupCopyFixtureValidity(cases);",
  "assertProviderSetupCopyStructure(cases);",
  "assertProviderSetupCopyBalance(cases);",
];

const providerSetupCopySourceGuardDiagnosticsCall =
  "assertProviderSetupCopySourceGuardDiagnostics(source);";

const providerSetupCopySourceGuardEntrypointFunctionName =
  "assertProviderSetupCopySourceGuards";

const providerSetupCopyExpectedMismatchMismatchedCase: ProviderSetupCopyExpectedMismatchCase = {
  fixtureDeclaration:
    providerSetupCopySourceGuardExpectedMismatchMismatchedDeclarationFixture(),
  label: providerSetupCopyExpectedMismatchMismatchedCaseLabel,
  matchingDeclaration:
    providerSetupCopySourceGuardEntrypointMismatchedDeclaration(),
  rejectedDeclaration: providerSetupCopySourceGuardEntrypointDeclaration(),
};
const providerSetupCopyExpectedMismatchExpectedCase: ProviderSetupCopyExpectedMismatchCase = {
  fixtureDeclaration:
    providerSetupCopySourceGuardExpectedMismatchExpectedDeclarationFixture(),
  label: providerSetupCopyExpectedMismatchExpectedCaseLabel,
  matchingDeclaration: providerSetupCopySourceGuardEntrypointDeclaration(),
  rejectedDeclaration:
    providerSetupCopySourceGuardEntrypointMismatchedDeclaration(),
};

const providerSetupCopySourceGuardEntrypointOrderMessagePrefix =
  "Expected provider setup source guard entrypoint order to stay stable.";

const expectedProviderSetupCopySourceGuardEntrypointCalls = [
  "assertProviderSetupCopyInventoryPhaseOrder(source);",
  "assertProviderSetupCopyPhaseGuardPlacement(source);",
  providerSetupCopySourceGuardDiagnosticsCall,
];

const expectedProviderSetupCopySourceGuardEntrypointDiagnosticMarkers = [
  "assertProviderSetupCopySourceGuardEntrypointMessagePatternDiagnostics();",
  "providerSetupCopySourceGuardEntrypointReorderedFixture()",
  "providerSetupCopySourceGuardEntrypointMissingCallFixture(",
];

const providerSetupCopySourceGuardEntrypointOrderDiagnosticsFunctionName =
  "assertProviderSetupCopySourceGuardEntrypointOrderDiagnostics";

const expectedProviderSetupCopyPhaseGuardSourceMarkers = [
  "function assertProviderSetupCopyInventoryPhaseOrder(",
  "function providerSetupCopyInventoryPhasePositions(",
  "type ProviderSetupCopyInventoryPhasePosition = {",
  "function orderedProviderSetupCopyInventoryPhaseCalls(",
  "function providerSetupCopyInventoryPhaseOrderMessage(",
  "function assertProviderSetupCopyInventoryPhaseOrderDiagnostics(",
  "function providerSetupCopyFunctionBody(",
];

const expectedProviderSetupCopySourceGuardDirectCallNames = [
  "assertProviderSetupCopyInventoryPhaseOrder",
  "assertProviderSetupCopyPhaseGuardPlacement",
];

const expectedProviderSetupCopyGuardPatternSourceMarkers = [
  "function providerSetupCopySourceGuardEntryFixture(",
  "function providerSetupCopySourceGuardEntryCall(",
  "function assertProviderSetupCopySourceGuardNoDirectCall(",
  "function providerSetupCopySourceGuardEntryCallPattern(",
  "function assertProviderSetupCopySourceGuardCallPattern(",
  "function assertProviderSetupCopySourceGuardGroupedEntryCallPattern(",
  "type ProviderSetupCopySourceGuardCallPatternOptions = {",
  "function assertProviderSetupCopySourceGuardCallPatternMatches(",
];

const setupItems = getProviderSetupItems([
  capability("custom-model-training"),
  capability("voice-generation"),
  capability("cover-remix"),
  capability("song-generation"),
  capability("stem-extraction", "ready"),
  capability("extend-song"),
  capability("custom-song-generation"),
]);

assert.deepEqual(
  setupItems.map((item) => item.id),
  ["song-generation", "custom-song-generation", "extend-song", "cover-remix"],
);

assert.deepEqual(
  groupProviderSetupItems([
    capability("custom-model-training"),
    capability("voice-generation"),
    capability("cover-remix"),
    capability("song-generation"),
    capability("stem-extraction", "ready"),
    capability("extend-song"),
    capability("custom-song-generation"),
  ]).map((group) => ({
    ids: group.items.map((item) => item.id),
    label: group.label,
  })),
  [
    {
      ids: ["song-generation", "custom-song-generation"],
      label: "Create songs",
    },
    {
      ids: ["extend-song", "cover-remix"],
      label: "Transform tracks",
    },
  ],
);

assert.deepEqual(
  groupProviderSetupItems([
    capability("stem-extraction"),
    capability("voice-generation"),
    capability("unknown-provider-gap"),
  ]).map((group) => ({
    ids: group.items.map((item) => item.id),
    label: group.label,
  })),
  [
    {
      ids: ["stem-extraction"],
      label: "Studio prep",
    },
    {
      ids: ["voice-generation"],
      label: "Voice",
    },
    {
      ids: ["unknown-provider-gap"],
      label: "Other unlocks",
    },
  ],
);

assert.equal(
  getRemainingProviderSetupItemCount(
    [
      capability("song-generation"),
      capability("custom-song-generation"),
      capability("extend-song"),
      capability("cover-remix"),
      capability("voice-generation"),
      capability("stem-extraction", "ready"),
    ],
    4,
  ),
  1,
);

assert.equal(
  getRemainingProviderSetupItemCount([capability("song-generation", "ready")], 0),
  0,
);

for (const copyCase of providerSetupCopyCases) {
  assertProviderSetupCopyCase(copyCase);
}

assertProviderSetupCopyInventory(providerSetupCopyCases);
const providerSetupTestSource = readFileSync(new URL(import.meta.url), "utf8");
assertProviderSetupCopySourceGuardEntry(providerSetupTestSource);
assertProviderSetupCopySourceGuardEntryDiagnostics();
assertProviderSetupCopySourceGuards(providerSetupTestSource);

assert.equal(
  getProviderSetupOutcome(capability("song-generation")),
  "Unlock full song generation from a short prompt.",
);
assert.equal(
  getProviderSetupOutcome(capability("custom-song-generation")),
  "Unlock full songs from your lyrics, title, and style.",
);
assert.equal(
  getProviderSetupOutcome(capability("extend-song")),
  "Unlock continuations from an existing clip.",
);
assert.equal(
  getProviderSetupOutcome(capability("cover-remix")),
  "Unlock covers and remixes from an existing song.",
);
assert.equal(
  getProviderSetupOutcome(capability("stem-extraction")),
  "Unlock vocal and instrumental stems for Studio edits.",
);
assert.equal(
  getProviderSetupOutcome(capability("voice-generation")),
  "Unlock generated vocals from a verified voice profile.",
);
assert.equal(
  getProviderSetupOutcome(capability("unknown-provider-gap")),
  "Provider-backed path.",
);
assert.equal(getProviderSetupOutcomeGroup(capability("song-generation")), "create");
assert.equal(getProviderSetupOutcomeGroup(capability("cover-remix")), "transform");
assert.equal(getProviderSetupOutcomeGroup(capability("stem-extraction")), "studio");
assert.equal(getProviderSetupOutcomeGroup(capability("voice-generation")), "voice");
assert.equal(getProviderSetupOutcomeGroup(capability("unknown-provider-gap")), "other");

for (const item of [
  "song-generation",
  "custom-song-generation",
  "extend-song",
  "cover-remix",
  "stem-extraction",
  "voice-generation",
]) {
  assert.equal(
    isProviderSetupOutcomeCompact(capability(item)),
    true,
    `${item} outcome copy should fit within ${providerSetupOutcomeMaxLength} characters`,
  );
}

const providerPanelSource = readFileSync(
  new URL("../src/features/suno/provider-capability-panel.tsx", import.meta.url),
  "utf8",
);

function matchCount(source: string, pattern: RegExp) {
  return Array.from(source.matchAll(pattern)).length;
}

function assertProviderSetupCopyCase({
  badgeLabel,
  capabilities,
  name,
  summary,
}: ProviderSetupCopyCase) {
  assert.equal(getProviderSetupSummary(capabilities), summary, `${name} summary`);
  assert.equal(
    getProviderSetupBadgeLabel(capabilities),
    badgeLabel,
    `${name} badge label`,
  );
  assert.deepEqual(
    getProviderSetupBadge(capabilities),
    {
      label: badgeLabel,
      summary,
    },
    `${name} badge`,
  );
}

function assertProviderSetupCopyInventory(cases: ProviderSetupCopyCase[]) {
  assertProviderSetupCopyFixtureValidity(cases);
  assertProviderSetupCopyStructure(cases);
  assertProviderSetupCopyBalance(cases);
}

function assertProviderSetupCopyFixtureValidity(
  cases: ProviderSetupCopyCase[],
) {
  assertProviderSetupCopyCaseNames(cases);
  assertProviderSetupCopyCaseNameDiagnostics(cases);
  assertProviderSetupCopyCaseLookupDiagnostics(cases);
}

function assertProviderSetupCopyStructure(cases: ProviderSetupCopyCase[]) {
  assertProviderSetupCopyGroupOrder(cases);
  assertProviderSetupCopyInventoryKeys(cases);
}

function assertProviderSetupCopyBalance(cases: ProviderSetupCopyCase[]) {
  const groupCounts = countProviderSetupCopyValues(
    cases,
    ({ group }) => group,
    expectedProviderSetupCopyGroupOrder,
  );
  const stateCounts = countProviderSetupCopyValues(
    cases,
    ({ state }) => state,
    expectedProviderSetupCopyStateOrder,
  );

  assertProviderSetupCopyGroupCounts(groupCounts);
  assertProviderSetupCopyStateCounts(stateCounts);
}

function countProviderSetupCopyValues<Value extends string>(
  cases: ProviderSetupCopyCase[],
  selectValue: (copyCase: ProviderSetupCopyCase) => Value,
  expectedValues: Value[],
) {
  const counts = Object.fromEntries(
    expectedValues.map((value) => [value, 0]),
  ) as Record<Value, number>;

  for (const copyCase of cases) {
    counts[selectValue(copyCase)] += 1;
  }

  return counts;
}

function assertProviderSetupCopyCountKeys<Value extends string>(
  counts: Record<Value, number>,
  expectedValues: Value[],
) {
  assert.deepEqual(Object.keys(counts), expectedValues);
}

function assertProviderSetupCopyCaseNames(cases: ProviderSetupCopyCase[]) {
  assert.deepEqual(duplicateProviderSetupCopyCaseNames(cases), []);
  assert.equal(uniqueProviderSetupCopyCaseNames(cases).length, cases.length);
}

function assertProviderSetupCopyCaseNameDiagnostics(
  cases: ProviderSetupCopyCase[],
) {
  const duplicateNameCases = providerSetupCopyDuplicateNameCases(
    cases,
    providerSetupCopyDuplicateNameFixtures,
  );

  assert.deepEqual(
    duplicateProviderSetupCopyCaseNames(duplicateNameCases),
    expectedProviderSetupCopyDuplicateNames(
      providerSetupCopyDuplicateNameFixtures,
    ),
  );
}

function assertProviderSetupCopyCaseLookupDiagnostics(
  cases: ProviderSetupCopyCase[],
) {
  assert.throws(
    () => providerSetupCopyCaseByName(cases, "missing provider setup copy case"),
    /Missing provider setup copy case fixture: missing provider setup copy case/,
  );
}

function assertProviderSetupCopySourceGuards(source: string) {
  assertProviderSetupCopyInventoryPhaseOrder(source);
  assertProviderSetupCopyPhaseGuardPlacement(source);
  assertProviderSetupCopySourceGuardDiagnostics(source);
  assertProviderSetupCopySourceGuardEntrypointOrder(source);
}

function assertProviderSetupCopySourceGuardDiagnostics(source: string) {
  assertProviderSetupCopyInventoryPhaseOrderDiagnostics();
  assertProviderSetupCopyPhaseGuardPlacementDiagnostics();
  assertProviderSetupCopySourceGuardEntrypointDiagnosticOrder(source);
}

function assertProviderSetupCopySourceGuardEntry(source: string) {
  assert.equal(
    matchCount(
      source,
      providerSetupCopySourceGuardEntryCallPattern(
        providerSetupCopySourceGuardEntrypointFunctionName,
      ),
    ),
    1,
    "Expected provider setup source guard checks to run through the grouped entry point.",
  );
  for (const functionName of expectedProviderSetupCopySourceGuardDirectCallNames) {
    assertProviderSetupCopySourceGuardNoDirectCall(source, functionName);
  }
}

function assertProviderSetupCopySourceGuardDirectCallList() {
  assert.deepEqual(
    expectedProviderSetupCopySourceGuardDirectCallNames,
    [
      "assertProviderSetupCopyInventoryPhaseOrder",
      "assertProviderSetupCopyPhaseGuardPlacement",
    ],
  );
}

function assertProviderSetupCopySourceGuardEntrypointOrder(source: string) {
  const body = providerSetupCopyFunctionBody(
    source,
    providerSetupCopySourceGuardEntrypointFunctionName,
  );
  const actualCalls = providerSetupCopyOrderedSourceGuardEntrypointCalls(body);

  assert.deepEqual(
    actualCalls,
    expectedProviderSetupCopySourceGuardEntrypointCalls,
    providerSetupCopySourceGuardEntrypointOrderMessage(actualCalls),
  );
}

function providerSetupCopyOrderedSourceGuardEntrypointCalls(body: string) {
  return expectedProviderSetupCopySourceGuardEntrypointCalls
    .map((call) => {
      const index = body.indexOf(call);

      assert.notEqual(
        index,
        -1,
        providerSetupCopySourceGuardEntrypointMissingCallMessage(call),
      );

      return { call, index };
    })
    .sort((a, b) => a.index - b.index)
    .map(({ call }) => call);
}

function providerSetupCopySourceGuardEntrypointMissingCallMessage(call: string) {
  return `${call} missing from provider setup source guard entrypoint flow`;
}

function providerSetupCopySourceGuardEntrypointMissingCallMessagePattern(
  call: string,
) {
  return new RegExp(
    escapeProviderSetupCopyRegExpLiteral(
      providerSetupCopySourceGuardEntrypointMissingCallMessage(call),
    ),
  );
}

function providerSetupCopySourceGuardEntrypointOrderMessagePattern() {
  return new RegExp(
    escapeProviderSetupCopyRegExpLiteral(
      providerSetupCopySourceGuardEntrypointOrderMessagePrefix,
    ),
  );
}

function providerSetupCopySourceGuardEntrypointOrderMessage(
  actualCalls: string[],
) {
  return [
    providerSetupCopySourceGuardEntrypointOrderMessagePrefix,
    `Expected: ${expectedProviderSetupCopySourceGuardEntrypointCalls.join(" -> ")}`,
    `Actual: ${actualCalls.join(" -> ")}`,
  ].join(" ");
}

function assertProviderSetupCopySourceGuardEntrypointDiagnosticOrder(
  source: string,
) {
  assertProviderSetupCopySourceMarkerOrder(
    providerSetupCopyFunctionBody(
      source,
      providerSetupCopySourceGuardEntrypointOrderDiagnosticsFunctionName,
    ),
    expectedProviderSetupCopySourceGuardEntrypointDiagnosticMarkers,
    "source guard entrypoint diagnostics",
  );
}

function assertProviderSetupCopySourceGuardEntryDiagnostics() {
  for (const functionName of expectedProviderSetupCopySourceGuardDirectCallNames) {
    assert.throws(
      () =>
        assertProviderSetupCopySourceGuardEntry(
          providerSetupCopySourceGuardEntryFixture([functionName]),
        ),
      new RegExp(
        `Expected provider setup source guard checks to stay grouped; found direct ${functionName} call`,
      ),
    );
  }

  assert.deepEqual(
    providerSetupCopySourceGuardEntryFixture(
      expectedProviderSetupCopySourceGuardDirectCallNames,
    ).split("\n"),
    [
      providerSetupCopySourceGuardEntryCall(
        providerSetupCopySourceGuardEntrypointFunctionName,
      ),
      ...expectedProviderSetupCopySourceGuardDirectCallNames.map(
        providerSetupCopySourceGuardEntryCall,
      ),
    ],
  );
  assertProviderSetupCopySourceGuardDirectCallList();
  assertProviderSetupCopySourceGuardEntrypointNameDiagnostics();
  assertProviderSetupCopySourceGuardEntrypointDiagnosticOrderDiagnostics();
  assertProviderSetupCopySourceGuardEntrypointOrderDiagnostics();
  assertProviderSetupCopySourceGuardCallPattern();
  assertProviderSetupCopySourceGuardGroupedEntryCallPattern();
  assertProviderSetupCopyRegExpLiteralEscaping();
}

function assertProviderSetupCopySourceGuardEntrypointNameDiagnostics() {
  assertProviderSetupCopySourceGuardEntrypointExpectedCallDiagnostics();
  assertProviderSetupCopySourceGuardEntrypointDeclarationDiagnostics();
}

function assertProviderSetupCopySourceGuardEntrypointExpectedCallDiagnostics() {
  assertProviderSetupCopySourceGuardEntrypointExpectedCallPatternDiagnostics();
  assertProviderSetupCopySourceGuardEntrypointExpectedCallEqualityDiagnostics();
}

function assertProviderSetupCopySourceGuardEntrypointExpectedCallEqualityDiagnostics() {
  assert.equal(
    providerSetupCopySourceGuardEntrypointExpectedCallFixture(),
    providerSetupCopySourceGuardEntrypointGeneratedCall(),
  );
  assert.notEqual(
    providerSetupCopySourceGuardEntrypointExpectedCallFixture(),
    providerSetupCopySourceGuardEntrypointAlternateCall(),
  );
}

function assertProviderSetupCopySourceGuardEntrypointExpectedCallPatternDiagnostics() {
  assert.match(
    providerSetupCopySourceGuardEntrypointExpectedCallFixture(),
    providerSetupCopySourceGuardEntrypointExpectedCallPattern(),
  );
  assert.doesNotMatch(
    providerSetupCopySourceGuardEntrypointAlternateCall(),
    providerSetupCopySourceGuardEntrypointExpectedCallPattern(),
  );
}

function providerSetupCopySourceGuardEntrypointExpectedCallPattern() {
  return new RegExp(
    escapeProviderSetupCopyRegExpLiteral(
      providerSetupCopySourceGuardEntrypointExpectedCallFixture(),
    ),
  );
}

function providerSetupCopySourceGuardEntrypointAlternateCall() {
  return providerSetupCopySourceGuardEntryCall(
    providerSetupCopySourceGuardEntrypointAlternateFunctionName(),
  );
}

function providerSetupCopySourceGuardEntrypointGeneratedCall() {
  return providerSetupCopySourceGuardEntryCall(
    providerSetupCopySourceGuardEntrypointFunctionName,
  );
}

function providerSetupCopySourceGuardEntrypointAlternateFunctionName() {
  return "otherEntrypoint";
}

function providerSetupCopySourceGuardEntrypointExpectedCallFixture() {
  return `${providerSetupCopySourceGuardEntrypointFunctionName}(providerSetupTestSource);`;
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationDiagnostics() {
  assertProviderSetupCopySourceGuardEntrypointDeclarationSourceMatchDiagnostics();
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationSourceMatchDiagnostics() {
  assertProviderSetupCopySourceGuardEntrypointDeclarationSourceInclusionDiagnostics();
  assertProviderSetupCopySourceGuardEntrypointDeclarationPatternDiagnostics();
  assertProviderSetupCopySourceGuardEntrypointDeclarationSourceMatchesPattern();
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationSourceMatchesPattern() {
  assert.match(
    providerSetupCopySourceGuardEntrypointDeclarationSourceFixture(),
    providerSetupCopySourceGuardEntrypointDeclarationPattern(),
  );
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationSourceInclusionDiagnostics() {
  assertProviderSetupCopySourceGuardEntrypointDeclarationSourceIncludesExpectedDeclaration();
  assertProviderSetupCopySourceGuardEntrypointDeclarationSourceRejectsMismatchedDeclaration();
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationSourceIncludesExpectedDeclaration() {
  assert.equal(
    providerSetupCopySourceGuardEntrypointDeclarationSourceIncludesDeclaration(
      providerSetupCopySourceGuardEntrypointDeclaration(),
    ),
    true,
  );
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationSourceRejectsMismatchedDeclaration() {
  assert.equal(
    providerSetupCopySourceGuardEntrypointDeclarationSourceIncludesDeclaration(
      providerSetupCopySourceGuardEntrypointMismatchedDeclaration(),
    ),
    false,
  );
}

function providerSetupCopySourceGuardEntrypointDeclarationSourceIncludesDeclaration(
  declaration: string,
) {
  return providerSetupCopySourceGuardEntrypointDeclarationSourceFixture().includes(
    declaration,
  );
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationPatternDiagnostics() {
  assertProviderSetupCopySourceGuardEntrypointDeclarationPatternFixtureDiagnostics();
  assertProviderSetupCopySourceGuardEntrypointDeclarationPatternMatchesDeclaration();
  assertProviderSetupCopySourceGuardEntrypointDeclarationPatternRejectsMismatchedDeclaration();
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationPatternMatchesDeclaration() {
  assert.equal(
    providerSetupCopySourceGuardEntrypointDeclarationPatternMatchesDeclaration(
      providerSetupCopySourceGuardEntrypointDeclarationExpectedPatternFixture(),
    ),
    true,
  );
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationPatternRejectsMismatchedDeclaration() {
  assert.equal(
    providerSetupCopySourceGuardEntrypointDeclarationPatternMatchesDeclaration(
      providerSetupCopySourceGuardEntrypointMismatchedDeclaration(),
    ),
    false,
  );
}

function providerSetupCopySourceGuardEntrypointDeclarationPatternMatchesDeclaration(
  declaration: string,
) {
  return providerSetupCopySourceGuardEntrypointDeclarationPattern().test(
    declaration,
  );
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationPatternFixtureDiagnostics() {
  assertProviderSetupCopySourceGuardEntrypointDeclarationExpectedPatternFixtureDiagnostics();
  assertProviderSetupCopySourceGuardEntrypointDeclarationPatternFixtureMatchesExpectedDeclaration();
  assertProviderSetupCopySourceGuardEntrypointDeclarationPatternFixtureRejectsMismatchedDeclaration();
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationExpectedPatternFixtureDiagnostics() {
  assertProviderSetupCopySourceGuardEntrypointDeclarationExpectedPatternFixtureMatchesDeclaration();
  assertProviderSetupCopySourceGuardEntrypointDeclarationExpectedPatternFixtureDoesNotMatchMismatchedDeclaration();
  assertProviderSetupCopySourceGuardEntrypointDeclarationExpectedPatternMismatchedFixtureDiagnostics();
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationExpectedPatternFixtureMatchesDeclaration() {
  assert.equal(
    providerSetupCopySourceGuardEntrypointDeclarationExpectedPatternFixtureMatchesDeclaration(
      providerSetupCopySourceGuardEntrypointDeclaration(),
    ),
    true,
  );
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationExpectedPatternFixtureDoesNotMatchMismatchedDeclaration() {
  assert.equal(
    providerSetupCopySourceGuardEntrypointDeclarationExpectedPatternFixtureMatchesDeclaration(
      providerSetupCopySourceGuardEntrypointDeclarationExpectedPatternMismatchedFixture(),
    ),
    false,
  );
}

function providerSetupCopySourceGuardEntrypointDeclarationExpectedPatternFixtureMatchesDeclaration(
  declaration: string,
) {
  return (
    providerSetupCopySourceGuardEntrypointDeclarationExpectedPatternFixture() ===
    declaration
  );
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationExpectedPatternMismatchedFixtureDiagnostics() {
  assertProviderSetupCopySourceGuardExpectedMismatchEqualityDiagnostics();
  assertProviderSetupCopySourceGuardEntrypointDeclarationExpectedPatternMismatchedFixtureMatchesMismatchedDeclaration();
  assertProviderSetupCopySourceGuardEntrypointDeclarationExpectedPatternMismatchedFixtureRejectsExpectedDeclaration();
}

function assertProviderSetupCopySourceGuardExpectedMismatchEqualityDiagnostics() {
  assertProviderSetupCopySourceGuardExpectedMismatchEqualityFixtureDiagnostics();
  assertProviderSetupCopySourceGuardExpectedMismatchMatchesMismatchedDeclaration();
  assertProviderSetupCopySourceGuardExpectedMismatchRejectsExpectedDeclaration();
}

function assertProviderSetupCopySourceGuardExpectedMismatchMatchesMismatchedDeclaration() {
  assert.equal(
    providerSetupCopySourceGuardExpectedMismatchEqualsDeclaration(
      providerSetupCopySourceGuardExpectedMismatchMismatchedDeclarationFixture(),
    ),
    true,
  );
}

function assertProviderSetupCopySourceGuardExpectedMismatchRejectsExpectedDeclaration() {
  assert.equal(
    providerSetupCopySourceGuardExpectedMismatchEqualsDeclaration(
      providerSetupCopySourceGuardExpectedMismatchExpectedDeclarationFixture(),
    ),
    false,
  );
}

function assertProviderSetupCopySourceGuardExpectedMismatchEqualityFixtureDiagnostics() {
  const mismatchCases = providerSetupCopySourceGuardExpectedMismatchCases();

  assertProviderSetupCopySourceGuardExpectedMismatchFixtureDeclarations();
  assertProviderSetupCopySourceGuardExpectedMismatchCaseLabels();
  assertProviderSetupCopySourceGuardExpectedMismatchCaseOrder(mismatchCases);
  assertProviderSetupCopySourceGuardExpectedMismatchCaseConstants(mismatchCases);

  for (const mismatchCase of mismatchCases) {
    assertProviderSetupCopySourceGuardExpectedMismatchCase(mismatchCase);
  }
}

function assertProviderSetupCopySourceGuardExpectedMismatchFixtureDeclarations() {
  assertProviderSetupCopySourceGuardExpectedMismatchMismatchedDeclarationFixture();
  assertProviderSetupCopySourceGuardExpectedMismatchExpectedDeclarationFixture();
}

function assertProviderSetupCopySourceGuardExpectedMismatchMismatchedDeclarationFixture() {
  assert.equal(
    providerSetupCopySourceGuardExpectedMismatchMismatchedDeclarationFixture(),
    providerSetupCopySourceGuardEntrypointMismatchedDeclaration(),
  );
}

function assertProviderSetupCopySourceGuardExpectedMismatchExpectedDeclarationFixture() {
  assert.equal(
    providerSetupCopySourceGuardExpectedMismatchExpectedDeclarationFixture(),
    providerSetupCopySourceGuardEntrypointDeclaration(),
  );
}

function assertProviderSetupCopySourceGuardExpectedMismatchCaseConstants(
  mismatchCases: ProviderSetupCopyExpectedMismatchCaseOrder,
) {
  assert.equal(mismatchCases[0], providerSetupCopyExpectedMismatchMismatchedCase);
  assert.equal(mismatchCases[1], providerSetupCopyExpectedMismatchExpectedCase);
}

function assertProviderSetupCopySourceGuardExpectedMismatchCaseLabels() {
  assert.equal(
    providerSetupCopyExpectedMismatchMismatchedCaseLabel,
    "mismatched entrypoint declaration fixture",
  );
  assert.equal(
    providerSetupCopyExpectedMismatchExpectedCaseLabel,
    "expected entrypoint declaration fixture",
  );
}

function assertProviderSetupCopySourceGuardExpectedMismatchCaseOrder(
  mismatchCases: readonly ProviderSetupCopyExpectedMismatchCase[],
) {
  assert.deepEqual(
    mismatchCases.map(({ label }) => label),
    expectedProviderSetupCopyExpectedMismatchCaseLabels,
  );
}

function assertProviderSetupCopySourceGuardExpectedMismatchCase({
  fixtureDeclaration,
  label,
  matchingDeclaration,
  rejectedDeclaration,
}: ProviderSetupCopyExpectedMismatchCase) {
  assert.equal(fixtureDeclaration, matchingDeclaration, `${label} matches`);
  assert.notEqual(
    fixtureDeclaration,
    rejectedDeclaration,
    `${label} rejects opposite declaration`,
  );
}

function providerSetupCopySourceGuardExpectedMismatchCases():
  ProviderSetupCopyExpectedMismatchCaseOrder {
  return [
    providerSetupCopyExpectedMismatchMismatchedCase,
    providerSetupCopyExpectedMismatchExpectedCase,
  ];
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationExpectedPatternMismatchedFixtureMatchesMismatchedDeclaration() {
  assert.equal(
    providerSetupCopySourceGuardExpectedMismatchEqualsDeclaration(
      providerSetupCopySourceGuardExpectedMismatchMismatchedDeclarationFixture(),
    ),
    true,
  );
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationExpectedPatternMismatchedFixtureRejectsExpectedDeclaration() {
  assert.equal(
    providerSetupCopySourceGuardExpectedMismatchEqualsDeclaration(
      providerSetupCopySourceGuardExpectedMismatchExpectedDeclarationFixture(),
    ),
    false,
  );
}

function providerSetupCopySourceGuardExpectedMismatchMismatchedDeclarationFixture() {
  return providerSetupCopySourceGuardEntrypointMismatchedDeclaration();
}

function providerSetupCopySourceGuardExpectedMismatchExpectedDeclarationFixture() {
  return providerSetupCopySourceGuardEntrypointDeclaration();
}

function providerSetupCopySourceGuardExpectedMismatchEqualsDeclaration(
  declaration: string,
) {
  return (
    providerSetupCopySourceGuardEntrypointDeclarationExpectedPatternMismatchedFixture() ===
    declaration
  );
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationPatternFixtureMatchesExpectedDeclaration() {
  assert.equal(
    providerSetupCopySourceGuardEntrypointDeclarationPatternFixtureMatchesDeclaration(
      providerSetupCopySourceGuardEntrypointDeclarationExpectedPatternFixture(),
    ),
    true,
  );
}

function assertProviderSetupCopySourceGuardEntrypointDeclarationPatternFixtureRejectsMismatchedDeclaration() {
  assert.equal(
    providerSetupCopySourceGuardEntrypointDeclarationPatternFixtureMatchesDeclaration(
      providerSetupCopySourceGuardEntrypointMismatchedDeclaration(),
    ),
    false,
  );
}

function providerSetupCopySourceGuardEntrypointDeclarationPatternFixtureMatchesDeclaration(
  declaration: string,
) {
  return (
    providerSetupCopySourceGuardEntrypointDeclarationPatternFixture() ===
    declaration
  );
}

function providerSetupCopySourceGuardEntrypointDeclarationPattern() {
  return new RegExp(
    escapeProviderSetupCopyRegExpLiteral(
      providerSetupCopySourceGuardEntrypointDeclarationPatternFixture(),
    ),
  );
}

function providerSetupCopySourceGuardEntrypointDeclarationPatternFixture() {
  return providerSetupCopySourceGuardEntrypointDeclaration();
}

function providerSetupCopySourceGuardEntrypointDeclarationExpectedPatternFixture() {
  return providerSetupCopySourceGuardEntrypointDeclaration();
}

function providerSetupCopySourceGuardEntrypointDeclarationExpectedPatternMismatchedFixture() {
  return providerSetupCopySourceGuardEntrypointMismatchedDeclaration();
}

function providerSetupCopySourceGuardEntrypointDeclaration() {
  return `function ${providerSetupCopySourceGuardEntrypointFunctionName}(source: string) {`;
}

function providerSetupCopySourceGuardEntrypointDeclarationSourceFixture() {
  return providerSetupCopySourceGuardEntrypointFixture([]);
}

function providerSetupCopySourceGuardEntrypointMismatchedDeclaration() {
  return providerSetupCopySourceGuardEntrypointDeclaration().replace(
    providerSetupCopySourceGuardEntrypointFunctionName,
    providerSetupCopySourceGuardEntrypointAlternateFunctionName(),
  );
}

function assertProviderSetupCopySourceGuardEntrypointDiagnosticOrderDiagnostics() {
  assert.throws(
    () =>
      assertProviderSetupCopySourceGuardEntrypointDiagnosticOrder(
        providerSetupCopySourceGuardEntrypointDiagnosticOrderFixture(
          [...expectedProviderSetupCopySourceGuardEntrypointDiagnosticMarkers]
            .reverse(),
        ),
      ),
    providerSetupCopySourceMarkerOrderMessagePattern(
      "source guard entrypoint diagnostics",
    ),
  );
}

function providerSetupCopySourceGuardEntrypointDiagnosticOrderFixture(
  markers: string[],
) {
  return [
    `function ${providerSetupCopySourceGuardEntrypointOrderDiagnosticsFunctionName}() {`,
    ...markers.map((marker) => `  ${marker}`),
    "}",
  ].join("\n");
}

function assertProviderSetupCopySourceGuardEntrypointOrderDiagnostics() {
  assertProviderSetupCopySourceGuardEntrypointMessagePatternDiagnostics();
  assert.throws(
    () =>
      assertProviderSetupCopySourceGuardEntrypointOrder(
        providerSetupCopySourceGuardEntrypointReorderedFixture(),
      ),
    providerSetupCopySourceGuardEntrypointOrderMessagePattern(),
  );
  assert.throws(
    () =>
      assertProviderSetupCopySourceGuardEntrypointOrder(
        providerSetupCopySourceGuardEntrypointMissingCallFixture(
          providerSetupCopySourceGuardDiagnosticsCall,
        ),
      ),
    providerSetupCopySourceGuardEntrypointMissingCallMessagePattern(
      providerSetupCopySourceGuardDiagnosticsCall,
    ),
  );
}

function assertProviderSetupCopySourceGuardEntrypointMessagePatternDiagnostics() {
  assertProviderSetupCopySourceGuardEntrypointOrderMessagePatternDiagnostics();
  assertProviderSetupCopySourceGuardEntrypointMissingCallMessagePatternDiagnostics();
}

function assertProviderSetupCopySourceGuardEntrypointOrderMessagePatternDiagnostics() {
  assert.match(
    providerSetupCopySourceGuardEntrypointOrderMessage(
      [...expectedProviderSetupCopySourceGuardEntrypointCalls].reverse(),
    ),
    providerSetupCopySourceGuardEntrypointOrderMessagePattern(),
  );
  assert.doesNotMatch(
    "Expected provider setup source guard entrypoint call set to stay stable.",
    providerSetupCopySourceGuardEntrypointOrderMessagePattern(),
  );
}

function assertProviderSetupCopySourceGuardEntrypointMissingCallMessagePatternDiagnostics() {
  const call = providerSetupCopySourceGuardDiagnosticsCall;
  const pattern =
    providerSetupCopySourceGuardEntrypointMissingCallMessagePattern(call);

  assert.match(
    providerSetupCopySourceGuardEntrypointMissingCallMessage(call),
    pattern,
  );
  assert.doesNotMatch(
    providerSetupCopySourceGuardEntrypointMissingCallMessage(`${call}.extra`),
    pattern,
  );
}

function providerSetupCopySourceGuardEntrypointReorderedFixture() {
  return providerSetupCopySourceGuardEntrypointFixture(
    [...expectedProviderSetupCopySourceGuardEntrypointCalls].reverse(),
  );
}

function providerSetupCopySourceGuardEntrypointMissingCallFixture(call: string) {
  return providerSetupCopySourceGuardEntrypointFixture(
    expectedProviderSetupCopySourceGuardEntrypointCalls.filter(
      (expectedCall) => expectedCall !== call,
    ),
  );
}

function providerSetupCopySourceGuardEntrypointFixture(calls: string[]) {
  return [
    providerSetupCopySourceGuardEntrypointDeclaration(),
    ...calls.map((call) => `  ${call}`),
    "}",
  ].join("\n");
}

function providerSetupCopySourceGuardEntryFixture(directCallNames: string[]) {
  const directCalls = directCallNames.map(
    providerSetupCopySourceGuardEntryCall,
  );

  return [
    providerSetupCopySourceGuardEntryCall(
      providerSetupCopySourceGuardEntrypointFunctionName,
    ),
    ...directCalls,
  ].join("\n");
}

function providerSetupCopySourceGuardEntryCall(functionName: string) {
  return `${functionName}(providerSetupTestSource);`;
}

function assertProviderSetupCopySourceGuardNoDirectCall(
  source: string,
  functionName: string,
) {
  assert.doesNotMatch(
    source,
    providerSetupCopySourceGuardEntryCallPattern(functionName),
    `Expected provider setup source guard checks to stay grouped; found direct ${functionName} call.`,
  );
}

function providerSetupCopySourceGuardEntryCallPattern(functionName: string) {
  return new RegExp(`^${functionName}\\(providerSetupTestSource\\);$`, "gm");
}

function assertProviderSetupCopySourceGuardCallPattern() {
  for (const functionName of expectedProviderSetupCopySourceGuardDirectCallNames) {
    assertProviderSetupCopySourceGuardCallPatternMatches(functionName, {
      expectedIndentedMatchCount: 0,
      expectedRepeatedTopLevelMatchCount: 2,
    });
  }
}

function assertProviderSetupCopySourceGuardGroupedEntryCallPattern() {
  assertProviderSetupCopySourceGuardCallPatternMatches(
    providerSetupCopySourceGuardEntrypointFunctionName,
    {
      expectedIndentedMatchCount: 0,
      expectedRepeatedTopLevelMatchCount: 2,
    },
  );
}

type ProviderSetupCopySourceGuardCallPatternOptions = {
  expectedIndentedMatchCount: number;
  expectedRepeatedTopLevelMatchCount: number;
};

function assertProviderSetupCopySourceGuardCallPatternMatches(
  functionName: string,
  {
    expectedIndentedMatchCount,
    expectedRepeatedTopLevelMatchCount,
  }: ProviderSetupCopySourceGuardCallPatternOptions,
) {
  const call = providerSetupCopySourceGuardEntryCall(functionName);
  const pattern = providerSetupCopySourceGuardEntryCallPattern(functionName);

  assert.equal(matchCount(call, pattern), 1);
  assert.equal(
    matchCount(`${call}\n${call}`, pattern),
    expectedRepeatedTopLevelMatchCount,
  );
  assert.equal(matchCount(`  ${call}`, pattern), expectedIndentedMatchCount);
}

function assertProviderSetupCopyInventoryPhaseOrder(source: string) {
  const inventoryBody = providerSetupCopyFunctionBody(
    source,
    "assertProviderSetupCopyInventory",
  );
  const actualPhaseCalls = orderedProviderSetupCopyInventoryPhaseCalls(
    providerSetupCopyInventoryPhasePositions(inventoryBody),
  );

  assert.deepEqual(
    actualPhaseCalls,
    expectedProviderSetupCopyInventoryPhaseCalls,
    providerSetupCopyInventoryPhaseOrderMessage(actualPhaseCalls),
  );
}

function providerSetupCopyInventoryPhasePositions(
  inventoryBody: string,
): ProviderSetupCopyInventoryPhasePosition[] {
  return expectedProviderSetupCopyInventoryPhaseCalls.map((call) => {
    const index = inventoryBody.indexOf(call);

    assert.notEqual(
      index,
      -1,
      `${call} missing from provider setup copy inventory flow`,
    );

    return { call, index };
  });
}

type ProviderSetupCopyInventoryPhasePosition = {
  call: string;
  index: number;
};

function orderedProviderSetupCopyInventoryPhaseCalls(
  phasePositions: ProviderSetupCopyInventoryPhasePosition[],
) {
  return [...phasePositions]
    .sort((a, b) => a.index - b.index)
    .map(({ call }) => call);
}

function providerSetupCopyInventoryPhaseOrderMessage(actualPhaseCalls: string[]) {
  return [
    "Expected provider setup copy inventory phase order to stay stable.",
    `Expected: ${expectedProviderSetupCopyInventoryPhaseCalls.join(" -> ")}`,
    `Actual: ${actualPhaseCalls.join(" -> ")}`,
  ].join(" ");
}

function assertProviderSetupCopyInventoryPhaseOrderDiagnostics() {
  assert.throws(
    () =>
      assertProviderSetupCopyInventoryPhaseOrder(`
function assertProviderSetupCopyInventory(cases: ProviderSetupCopyCase[]) {
  assertProviderSetupCopyBalance(cases);
  assertProviderSetupCopyStructure(cases);
  assertProviderSetupCopyFixtureValidity(cases);
}
`),
    /Expected provider setup copy inventory phase order to stay stable/,
  );
}

function assertProviderSetupCopyPhaseGuardPlacement(source: string) {
  assertProviderSetupCopySourceMarkerOrder(
    source,
    expectedProviderSetupCopyPhaseGuardSourceMarkers,
    "source guard helpers",
  );
  assertProviderSetupCopySourceMarkerOrder(
    source,
    expectedProviderSetupCopyGuardPatternSourceMarkers,
    "source guard pattern helpers",
  );
}

function assertProviderSetupCopyPhaseGuardPlacementDiagnostics() {
  assert.throws(
    () => assertProviderSetupCopyPhaseGuardPlacement(""),
    providerSetupCopyMissingSourceMarkerMessagePattern(
      expectedProviderSetupCopyPhaseGuardSourceMarkers[0],
    ),
  );
  assert.throws(
    () =>
      assertProviderSetupCopyPhaseGuardPlacement(
        expectedProviderSetupCopyPhaseGuardSourceMarkers.join("\n"),
      ),
    providerSetupCopyMissingSourceMarkerMessagePattern(
      expectedProviderSetupCopyGuardPatternSourceMarkers[0],
    ),
  );
  assertProviderSetupCopyMissingSourceMarkerMessagePatternDiagnostics();
  assert.throws(
    () =>
      assertProviderSetupCopySourceMarkerOrder(
        providerSetupCopyReversedMarkerSource(
          expectedProviderSetupCopyPhaseGuardSourceMarkers,
        ),
        expectedProviderSetupCopyPhaseGuardSourceMarkers,
        "source guard helpers",
      ),
    providerSetupCopySourceMarkerOrderMessagePattern("source guard helpers"),
  );
  assert.throws(
    () =>
      assertProviderSetupCopySourceMarkerOrder(
        providerSetupCopyReversedMarkerSource(
          expectedProviderSetupCopyGuardPatternSourceMarkers,
        ),
        expectedProviderSetupCopyGuardPatternSourceMarkers,
        "source guard pattern helpers",
      ),
    providerSetupCopySourceMarkerOrderMessagePattern(
      "source guard pattern helpers",
    ),
  );
}

function assertProviderSetupCopySourceMarkerOrder(
  source: string,
  markers: string[],
  label: string,
) {
  const markerIndexes = markers.map((marker) =>
    providerSetupCopySourceMarkerIndex(source, marker),
  );

  assert.deepEqual(
    markerIndexes,
    [...markerIndexes].sort((a, b) => a - b),
    providerSetupCopySourceMarkerOrderMessage(label),
  );
}

function providerSetupCopySourceMarkerOrderMessage(label: string) {
  return `Expected provider setup ${label} to stay in readable order.`;
}

function providerSetupCopySourceMarkerOrderMessagePattern(label: string) {
  return new RegExp(providerSetupCopySourceMarkerOrderMessage(label));
}

function providerSetupCopyReversedMarkerSource(markers: string[]) {
  return [...markers].reverse().join("\n");
}

function providerSetupCopySourceMarkerIndex(source: string, marker: string) {
  const index = source.indexOf(marker);

  assert.notEqual(
    index,
    -1,
    providerSetupCopyMissingSourceMarkerMessage(marker),
  );

  return index;
}

function providerSetupCopyMissingSourceMarkerMessage(marker: string) {
  return `Missing provider setup source guard marker: ${marker}`;
}

function providerSetupCopyMissingSourceMarkerMessagePattern(marker: string) {
  return new RegExp(
    escapeProviderSetupCopyRegExpLiteral(
      providerSetupCopyMissingSourceMarkerMessage(marker),
    ),
  );
}

function assertProviderSetupCopyMissingSourceMarkerMessagePatternDiagnostics() {
  const marker = "function providerSetupCopySourceMarkerIndex(source: string)";
  const message = providerSetupCopyMissingSourceMarkerMessage(marker);

  assert.match(
    message,
    providerSetupCopyMissingSourceMarkerMessagePattern(marker),
  );
  assert.doesNotMatch(
    message,
    providerSetupCopyMissingSourceMarkerMessagePattern(`${marker}.extra`),
  );
}

function assertProviderSetupCopyRegExpLiteralEscaping() {
  const source = "function helper(name: string) { return name + value; }";
  const pattern = new RegExp(escapeProviderSetupCopyRegExpLiteral(source));

  assert.match(source, pattern);
  assert.doesNotMatch(
    "function helperXname: stringY { return name + value; }",
    pattern,
  );
}

function escapeProviderSetupCopyRegExpLiteral(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function providerSetupCopyFunctionBody(source: string, functionName: string) {
  const match = source.match(
    new RegExp(
      `function ${functionName}\\([^)]*\\) \\{([\\s\\S]*?)\\n\\}`,
    ),
  );
  const body = match?.[1];

  if (!body) {
    assert.fail(`Missing provider setup copy function: ${functionName}`);
  }

  return body;
}

function uniqueProviderSetupCopyCaseNames(cases: ProviderSetupCopyCase[]) {
  return Array.from(new Set(cases.map(({ name }) => name)));
}

function providerSetupCopyDuplicateNameCases(
  cases: ProviderSetupCopyCase[],
  fixtures: ProviderSetupCopyDuplicateNameFixture[],
) {
  const originalCases = expectedProviderSetupCopyDuplicateNames(fixtures).map(
    (name) => providerSetupCopyCaseByName(cases, name),
  );
  const duplicateCases = fixtures.map(({ duplicateCaseName, originalName }) => {
    const originalCase = providerSetupCopyCaseByName(cases, originalName);
    const duplicateCase = providerSetupCopyCaseByName(cases, duplicateCaseName);

    return { ...duplicateCase, name: originalCase.name };
  });

  return [...originalCases, ...duplicateCases];
}

function expectedProviderSetupCopyDuplicateNames(
  fixtures: ProviderSetupCopyDuplicateNameFixture[],
) {
  return Array.from(new Set(fixtures.map(({ originalName }) => originalName)));
}

function providerSetupCopyCaseByName(
  cases: ProviderSetupCopyCase[],
  name: string,
) {
  const copyCase = cases.find((candidate) => candidate.name === name);

  if (!copyCase) {
    assert.fail(`Missing provider setup copy case fixture: ${name}`);
  }

  return copyCase;
}

function duplicateProviderSetupCopyCaseNames(cases: ProviderSetupCopyCase[]) {
  const seenNames = new Set<string>();
  const duplicateNames = new Set<string>();

  for (const { name } of cases) {
    if (seenNames.has(name)) {
      duplicateNames.add(name);
    }

    seenNames.add(name);
  }

  return Array.from(duplicateNames);
}

function assertProviderSetupCopyGroupOrder(cases: ProviderSetupCopyCase[]) {
  assert.deepEqual(
    Array.from(new Set(cases.map(({ group }) => group))),
    expectedProviderSetupCopyGroupOrder,
  );
}

function assertProviderSetupCopyGroupCounts(
  counts: Record<ProviderSetupCopyGroup, number>,
) {
  assertProviderSetupCopyCountKeys(
    counts,
    expectedProviderSetupCopyGroupOrder,
  );
  assert.deepEqual(counts, expectedProviderSetupCopyGroupCounts);
}

function assertProviderSetupCopyStateCounts(
  counts: Record<ProviderSetupCopyState, number>,
) {
  assertProviderSetupCopyCountKeys(
    counts,
    expectedProviderSetupCopyStateOrder,
  );
  assert.deepEqual(counts, expectedProviderSetupCopyStateCounts);
}

function assertProviderSetupCopyInventoryKeys(cases: ProviderSetupCopyCase[]) {
  assert.deepEqual(
    cases.map(providerSetupCopyInventoryKey),
    expectedProviderSetupCopyInventory,
  );
}

function providerSetupCopyInventoryKey({
  group,
  state,
}: Pick<ProviderSetupCopyCase, "group" | "state">): ProviderSetupCopyInventoryKey {
  return `${group}:${state}`;
}

assert.match(providerPanelSource, /Provider setup ready/);
assert.match(providerPanelSource, /ready for matching\s+generation actions/);
assert.match(providerPanelSource, /Provider setup pending/);
assert.match(providerPanelSource, /Creation path details will appear here/);
assert.match(providerPanelSource, /ProviderSetupReadyState\s+badgeLabel/);
assert.match(providerPanelSource, /ProviderSetupEmptyState\s+badgeLabel/);
assert.match(providerPanelSource, /getProviderSetupBadge/);
assert.doesNotMatch(providerPanelSource, /getProviderSetupBadgeLabel/);
assert.doesNotMatch(providerPanelSource, /getProviderSetupSummary/);
assert.equal(
  matchCount(
    providerPanelSource,
    /(?:label|badgeLabel)=\{setupBadge\.label\}/g,
  ),
  3,
);
assert.equal(matchCount(providerPanelSource, /label=\{badgeLabel\}/g), 2);
assert.equal(
  matchCount(providerPanelSource, /summary=\{setupBadge\.summary\}/g),
  3,
);
assert.equal(matchCount(providerPanelSource, /summary=\{summary\}/g), 2);
assert.equal(
  matchCount(providerPanelSource, /<ProviderSetupSummaryBadge/g),
  3,
);
assert.match(providerPanelSource, /title=\{summary\}/);
assert.match(providerPanelSource, /aria-label=\{summary\}/);
assert.match(providerPanelSource, /groupProviderSetupItems/);
assert.match(providerPanelSource, /aria-labelledby/);
assert.match(providerPanelSource, /provider-setup-group-/);
assert.doesNotMatch(
  providerPanelSource,
  /AI_|GROQ|TURSO|DRIZZLE|BETTER_AUTH|DATABASE|WEBHOOK_SECRET|API_KEY/,
);

console.log("provider setup tests passed");
