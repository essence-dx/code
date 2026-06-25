import type { EnterpriseIdentityProviderConfig } from "@/features/security/enterprise-sso-scim-readiness";
import type {
  EnterpriseScimGroupPayload,
  EnterpriseScimUserPayload,
} from "@/features/security/enterprise-sso-scim-enforcement";

export const enterpriseIdentityProviderConfig =
  null satisfies EnterpriseIdentityProviderConfig | null;

export const enterpriseScimProvisioningUsers =
  [] satisfies EnterpriseScimUserPayload[];

export const enterpriseScimProvisioningGroups =
  [] satisfies EnterpriseScimGroupPayload[];
