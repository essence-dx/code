export class InvalidJsonRequestError extends Error {
  constructor() {
    super("Request body must be valid JSON.");
    this.name = "InvalidJsonRequestError";
  }
}

export async function readJsonRequest(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new InvalidJsonRequestError();
  }
}
