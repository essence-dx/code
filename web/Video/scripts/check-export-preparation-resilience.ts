import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const exportPanel = readFileSync(new URL("../src/features/editor/components/export-panel.tsx", import.meta.url), "utf8");

assert.match(exportPanel, /const \[isPreparingExport, setIsPreparingExport\]/);
assert.match(exportPanel, /const isExportBusy = isPreparingExport \|\| isRendering/);
assert.match(exportPanel, /if \(isExportBusy\) return/);
assert.match(exportPanel, /setIsPreparingExport\(true\)/);
assert.match(exportPanel, /await preflightRenderPlan\(plan, project, assets\)/);
assert.match(exportPanel, /catch \{[\s\S]*?Export could not prepare\. Check your media and try again\./);
assert.match(exportPanel, /finally \{[\s\S]*?setIsPreparingExport\(false\)/);
assert.match(exportPanel, /onClick=\{\(\) => void render\(\)\}/);
assert.match(exportPanel, /disabled=\{isExportBusy\}/);

console.log("Export preparation resilience checks passed.");
