import assert from "node:assert/strict";
import { isProjectBundleFile, parseProjectBundleText, projectBundleFileSizeLimit, validateProjectBundleFile } from "../src/lib/projects/project-bundle";

assert.equal(isProjectBundleFile({ name: "client-cut.essence-studio.json", type: "" }), true);
assert.equal(isProjectBundleFile({ name: "client-cut.txt", type: "application/json" }), true);
assert.equal(isProjectBundleFile({ name: "client-cut.mp4", type: "video/mp4" }), false);

assert.doesNotThrow(() => validateProjectBundleFile({ name: "client-cut.json", type: "application/json", size: projectBundleFileSizeLimit }));
assert.throws(() => validateProjectBundleFile({ name: "client-cut.mp4", type: "video/mp4", size: 1000 }), /JSON/);
assert.throws(() => validateProjectBundleFile({ name: "client-cut.json", type: "application/json", size: projectBundleFileSizeLimit + 1 }), /too large/);
assert.throws(() => parseProjectBundleText(""), /empty/);
assert.throws(() => parseProjectBundleText("{"), /not valid/);

console.log("Project bundle import checks passed.");
