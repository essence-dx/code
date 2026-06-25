export class InvalidSpeechRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSpeechRequestError";
  }
}
