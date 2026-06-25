import type {
  ReleaseReadinessContext,
  ReleaseReadinessGate,
  ReleaseReadinessItem,
} from "@/features/operations/release-readiness-types";
import {
  average,
  scoreToStatus,
  statusScore,
} from "@/features/operations/release-readiness-utils";

export function createSeededAccountGate(
  context: ReleaseReadinessContext,
): ReleaseReadinessGate {
  const seededEmail = (context.seededAdminEmail ?? "admin@mail.com").toLowerCase();
  const seededUsers = [
    context.accountProfile,
    ...(context.adminUsers ?? []),
  ].filter((user) => user.email.toLowerCase() === seededEmail);
  const verifiedSeededUsers = seededUsers.filter((user) => user.emailVerified);
  const verificationEmails = context.authEmails.filter(
    (email) => email.purpose === "email-verification",
  );
  const deliveredVerificationEmails = verificationEmails.filter((email) =>
    ["sent", "preview"].includes(email.deliveryStatus),
  );
  const failedVerificationEmails = verificationEmails.filter(
    (email) => email.deliveryStatus === "failed",
  );
  const items: ReleaseReadinessItem[] = [
    {
      id: "seeded-admin",
      title: "Seeded admin account",
      detail: seededUsers.length
        ? "The seeded admin account is present in the release account surface."
        : `Create or seed ${seededEmail} before release verification.`,
      href: null,
      status: verifiedSeededUsers.length
        ? "ready"
        : seededUsers.length
          ? "review"
          : "blocked",
      badge: verifiedSeededUsers.length ? "Verified" : "Needs verification",
      meta: [
        `${seededUsers.length} seeded accounts`,
        `${verifiedSeededUsers.length} verified`,
      ],
    },
    {
      id: "verification-email",
      title: "Verification email path",
      detail: failedVerificationEmails.length
        ? "Recent email verification sends include failures."
        : deliveredVerificationEmails.length
          ? "Email verification messages have been generated successfully."
          : "Generate at least one email verification message before release.",
      href: null,
      status: failedVerificationEmails.length
        ? "blocked"
        : deliveredVerificationEmails.length
          ? "ready"
          : "review",
      badge: `${deliveredVerificationEmails.length} sent`,
      meta: [
        `${verificationEmails.length} verification emails`,
        `${failedVerificationEmails.length} failed`,
      ],
    },
  ];
  const score = average(items.map((item) => statusScore(item.status)));

  return {
    id: "seeded-account",
    title: "Seeded account verification",
    description:
      "Admin seed account and email verification evidence for production support access.",
    status: scoreToStatus(score, items.some((item) => item.status === "blocked")),
    score,
    metricLabel: "verified seeded accounts",
    metricValue: verifiedSeededUsers.length,
    items,
  };
}
