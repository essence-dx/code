export const emailPasswordAuthPolicy = {
  maxPasswordLength: 128,
  minPasswordLength: 8,
  requireEmailVerification: true,
} as const;

export function isPasswordAllowedByAuthPolicy(password: string) {
  return password.length >= emailPasswordAuthPolicy.minPasswordLength && password.length <= emailPasswordAuthPolicy.maxPasswordLength;
}
