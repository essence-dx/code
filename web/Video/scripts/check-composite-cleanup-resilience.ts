import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const renderer = readFileSync(new URL("../src/lib/render/composite-renderer.ts", import.meta.url), "utf8");

assert.match(renderer, /let layers: PreparedLayer\[\] = \[\];/);
assert.match(renderer, /let stream: MediaStream \| null = null;/);
assert.match(renderer, /let interval: ReturnType<typeof setInterval> \| null = null;/);
assert.match(renderer, /let settled = false;/);
assert.match(renderer, /layers = await prepareLayers\(manifest\.layers, audioContext, audioDestination\);/);
assert.match(renderer, /stream = new MediaStream\(\[/);
assert.match(renderer, /const cleanupTimeline = \(\) => \{/);
assert.match(renderer, /options\.signal\?\.removeEventListener\("abort", abort\);/);
assert.match(renderer, /const fail = \(error: Error \| DOMException\) => \{/);
assert.match(renderer, /recorder\.addEventListener\("error", \(\) => fail\(new Error\("Composite recording failed\."\)\)\);/);
assert.match(renderer, /try \{\s*recorder\.start\(250\);\s*\} catch \{/);
assert.match(renderer, /drawFrameSafely\(\);\s*if \(settled\) return;\s*interval = setInterval\(drawFrameSafely, 1000 \/ fps\);/);
assert.match(renderer, /if \(settled\) return;\s*try \{\s*const elapsed = \(performance\.now\(\) - startedAt\) \/ 1000;/);
assert.match(renderer, /animationFrame = requestAnimationFrame\(tick\);\s*\} catch \{\s*fail\(new Error\("Composite rendering failed\."\)\);/);
assert.match(renderer, /function drawFrameSafely\(\)/);
assert.match(renderer, /fail\(new Error\("Composite rendering failed\."\)\);/);
assert.match(renderer, /finally \{\s*stream\?\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\);\s*releasePreparedLayers\(layers\);\s*await closeAudioContext\(audioContext\);/);
assert.match(renderer, /catch \(error\) \{\s*releasePreparedLayers\(layers\);\s*throw error;\s*\}/);
assert.match(renderer, /const prepared: PreparedLayer = \{ layer, media, objectUrlToRevoke \};\s*layers\.push\(prepared\);/);
assert.match(renderer, /catch \(error\) \{\s*if \(storedObjectUrl\) revokeObjectUrl\(storedObjectUrl\);\s*throw error;\s*\}/);
assert.match(renderer, /function releasePreparedLayers\(layers: PreparedLayer\[\]\)/);
assert.match(renderer, /if \(isPlayable\(item\.media\)\) item\.media\.pause\(\);/);
assert.match(renderer, /if \(item\.objectUrlToRevoke\) revokeObjectUrl\(item\.objectUrlToRevoke\);/);
assert.match(renderer, /async function closeAudioContext\(audioContext: AudioContext\)/);
assert.match(renderer, /if \(audioContext\.state === "closed"\) return;/);
assert.match(renderer, /await audioContext\.close\(\);/);
assert.match(renderer, /function revokeObjectUrl\(objectUrl: string\)/);
assert.match(renderer, /objectUrl\.startsWith\("blob:"\)/);

console.log("Composite cleanup resilience checks passed.");
