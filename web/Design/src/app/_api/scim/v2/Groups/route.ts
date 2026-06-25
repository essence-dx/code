import { NextResponse } from "next/server";

import {
  createScimListResponse,
  parseEnterpriseScimGroupResource,
  validateScimBearerToken,
} from "@/features/security/enterprise-sso-scim-enforcement";

export async function GET(request: Request) {
  const auth = authorizeScimRequest(request);

  if (!auth.ok) return createScimError(auth.error, auth.status);

  return NextResponse.json(createScimListResponse({ resources: [] }));
}

export async function POST(request: Request) {
  const auth = authorizeScimRequest(request);

  if (!auth.ok) return createScimError(auth.error, auth.status);

  const group = parseEnterpriseScimGroupResource(await request.json());

  if (!group) return createScimError("Invalid SCIM group resource.", 400);

  return NextResponse.json(
    {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
      id: group.id,
      displayName: group.displayName,
      members: group.members.map((member) => ({ value: member })),
    },
    { status: 201 },
  );
}

function authorizeScimRequest(request: Request) {
  return validateScimBearerToken({
    authorization: request.headers.get("authorization"),
    expectedToken:
      process.env.ESSENCE_SCIM_BEARER_TOKEN ?? process.env.SCIM_BEARER_TOKEN,
  });
}

function createScimError(error: string, status: number) {
  return NextResponse.json(
    {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: error,
      status: String(status),
    },
    { status },
  );
}
