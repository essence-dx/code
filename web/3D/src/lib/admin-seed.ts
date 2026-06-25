import { isPasswordAllowedByAuthPolicy } from "@/lib/auth-policy";

export interface AdminSeedAccount {
  email: string;
  name: string;
  password: string;
}

type SeedEnv = Record<string, string | undefined>;

export const defaultAdminSeedAccount: AdminSeedAccount = {
  email: "admin@mail.com",
  name: "Essence Admin",
  password: "password",
};

export function getAdminSeedAccount(env: SeedEnv = process.env): AdminSeedAccount {
  return {
    email: env.ADMIN_SEED_EMAIL?.trim().toLowerCase() || defaultAdminSeedAccount.email,
    name: env.ADMIN_SEED_NAME?.trim() || defaultAdminSeedAccount.name,
    password: env.ADMIN_SEED_PASSWORD || defaultAdminSeedAccount.password,
  };
}

export function isAdminSeedAccountReady(account: AdminSeedAccount) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email) && account.name.trim().length > 0 && isPasswordAllowedByAuthPolicy(account.password);
}
