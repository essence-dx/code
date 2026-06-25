import {
  canCommentWorkbook,
  canEditWorkbook,
  canManageWorkbookSharing,
  normalizeWorkbookCollaboratorRole,
  normalizeWorkbookRole,
  pickStrongerWorkbookRole,
} from "@/features/workbooks/sharing-permissions";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(normalizeWorkbookRole("owner") === "owner", "owner role normalizes");
assert(normalizeWorkbookRole("bad") === "viewer", "bad role falls back to viewer");
assert(
  normalizeWorkbookCollaboratorRole("owner") === "viewer",
  "collaborators cannot become owners",
);
assert(canManageWorkbookSharing("owner"), "owners manage sharing");
assert(!canManageWorkbookSharing("editor"), "editors cannot manage sharing");
assert(canEditWorkbook("editor"), "editors can save workbooks");
assert(!canEditWorkbook("commenter"), "commenters cannot save workbooks");
assert(canCommentWorkbook("commenter"), "commenters can comment");
assert(
  pickStrongerWorkbookRole("editor", "viewer") === "editor",
  "share links do not downgrade stronger roles",
);
assert(
  pickStrongerWorkbookRole("viewer", "editor") === "editor",
  "stronger share link role upgrades access",
);

console.log("Workbook sharing permission checks passed.");
