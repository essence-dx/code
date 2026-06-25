export type PublicQueueScriptOrderResult =
  | {
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

export const publicQueuePackageScriptOrder = [
  '"check:public-queue:imports"',
  '"check:public-queue:order"',
  '"check:public-queue:fixtures"',
  '"test:public-queue:order"',
  '"test:public-queue"',
] as const;

type ScriptPosition = {
  index: number;
  scriptName: (typeof publicQueuePackageScriptOrder)[number];
};

export function checkPublicQueuePackageScriptOrder(
  packageJson: string,
): PublicQueueScriptOrderResult {
  const positions = publicQueuePackageScriptOrder.map((scriptName) => ({
    index: packageJson.indexOf(scriptName),
    scriptName,
  }));

  const expectedOrderLabel = publicQueuePackageScriptOrder.join(" -> ");
  const currentOrderLabel = formatCurrentOrder(positions);
  const missingScript = positions.find(({ index }) => index === -1);

  if (missingScript) {
    return {
      message: `Package script ${missingScript.scriptName} is missing. Expected: ${expectedOrderLabel}. Current: ${currentOrderLabel}.`,
      ok: false,
    };
  }

  for (let index = 1; index < positions.length; index += 1) {
    const previous = positions[index - 1];
    const current = positions[index];

    if (current.index < previous.index) {
      return {
        message: `Package script ${current.scriptName} is out of order. Expected: ${expectedOrderLabel}. Current: ${currentOrderLabel}.`,
        ok: false,
      };
    }
  }

  return { ok: true };
}

function formatCurrentOrder(positions: ScriptPosition[]) {
  const presentScripts = positions
    .filter(({ index }) => index >= 0)
    .slice()
    .sort((left, right) => left.index - right.index)
    .map(({ scriptName }) => scriptName);
  const missingScripts = positions
    .filter(({ index }) => index === -1)
    .map(({ scriptName }) => `${scriptName} (missing)`);

  return [...presentScripts, ...missingScripts].join(" -> ") || "none";
}
