export async function getRequiredUser() {
  return {
    id: "static-user",
    name: "Static User",
    email: "static@example.com",
    image: null,
  };
}

export async function getOptionalEditorUser() {
  return getRequiredUser();
}
