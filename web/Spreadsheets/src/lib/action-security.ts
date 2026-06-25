export async function requireAuth() { return { id: "static-user" }; }
export async function requireWorkbookAccess() { return { workbook: {} }; }
