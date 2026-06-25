import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const serverProjects = read("src/lib/projects/server-projects.ts");
assert.match(serverProjects, /rows\.flatMap\(\(row\) => \{/);
assert.match(serverProjects, /const payload = safeParseProjectPayload\(row\.projectJson\);/);
assert.match(serverProjects, /if \(!payload\) return \[\];/);
assert.match(serverProjects, /function parseProjectPayload\(projectJson: string\): SyncedProjectPayload/);
assert.match(serverProjects, /throw new ProjectDataError\(\);/);
assert.match(serverProjects, /function safeParseProjectPayload\(projectJson: string\): SyncedProjectPayload \| null/);
assert.match(serverProjects, /syncedProjectPayloadSchema\.safeParse\(JSON\.parse\(projectJson\)\)/);
assert.match(serverProjects, /return parsed\.success \? parsed\.data : null;/);
assert.match(serverProjects, /export class ProjectDataError extends Error/);
assert.doesNotMatch(serverProjects, /syncedProjectPayloadSchema\.parse\(JSON\.parse\(projectJson\)\)/);

const projectsRoute = read("src/app/api/projects/route.ts");
assert.match(projectsRoute, /ProjectDataError/);
assert.match(projectsRoute, /Saved project data could not be loaded\./);
assert.match(projectsRoute, /status: 409/);

const projectRoute = read("src/app/api/projects/[id]/route.ts");
assert.match(projectRoute, /ProjectDataError/);
assert.match(projectRoute, /Saved project data could not be loaded\./);
assert.match(projectRoute, /status: 409/);

console.log("Project sync storage resilience checks passed.");
