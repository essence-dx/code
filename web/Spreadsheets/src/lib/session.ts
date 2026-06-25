export async function getSession() { return { user: { id: "static-user" } }; }
export async function getRequiredSession() { return getSession(); }
