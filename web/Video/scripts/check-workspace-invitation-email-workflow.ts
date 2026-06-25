import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createWorkspaceInvitationEmailDraft } from "../src/lib/projects/workspace-invitation-email";

const draft = createWorkspaceInvitationEmailDraft({
  email: "reviewer@example.com",
  role: "editor",
  acceptUrl: "https://essence-studio.example/invite/token-123",
  projectTitle: "Launch cut",
  workspaceName: "Essence Studio",
});

assert.equal(draft.to, "reviewer@example.com");
assert.match(draft.subject, /Invitation to Essence Studio/);
assert.match(draft.body, /Editor/);
assert.match(draft.body, /Launch cut/);
assert.match(draft.body, /https:\/\/essence-studio\.example\/invite\/token-123/);
assert.match(draft.mailtoUrl, /^mailto:reviewer%40example\.com\?/);
assert.match(new URL(draft.mailtoUrl).searchParams.get("body") ?? "", /Use the same email address that received this invite/);

const panel = read("src/features/projects/components/cloud-workspace-access-panel.tsx");
assert.match(panel, /createWorkspaceInvitationEmailDraft/);
assert.match(panel, /emailInvitation/);
assert.match(panel, /Email draft opened with the invitation link/);
assert.match(panel, /<Mail className="size-3\.5" \/>/);
assert.match(panel, /invitationAcceptUrl/);
assert.match(panel, /Copy link/);
assert.match(panel, /Revoke/);

const capability = read("src/lib/product/capabilities/collaboration.ts");
assert.match(capability, /email invite drafts/);
assert.doesNotMatch(capability, /Add email notifications after a free transactional email path is selected/);

const todo = read("todo.md");
assert.match(todo, /Add email notifications after a free transactional email path is selected/);

console.log("Workspace invitation email workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
