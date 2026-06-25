export async function grantFileAccess() { return { ok: true }; }
export async function listFileAccess() { return []; }
export async function removeFileAccess() { return { ok: true }; }
export async function updateFileAccessRole() { return { ok: true }; }
export async function getFileAccessForUser() { return null; }
export async function requireFileAccess() { throw new Error("Not implemented"); }
export async function requireOwnedFile() { throw new Error("Not implemented"); }
