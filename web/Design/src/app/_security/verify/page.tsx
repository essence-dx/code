import { redirect } from "next/navigation";

import { verifyTwoFactorChallengeAction } from "@/app/security/verify/actions";
import { isTwoFactorEnabled } from "@/db/two-factor";
import { TwoFactorChallengeCard } from "@/features/auth/two-factor-challenge-card";
import { getServerSession } from "@/lib/auth-session";
import {
  getSafeTwoFactorNextPath,
  isTwoFactorVerifiedForRequest,
} from "@/lib/two-factor-session";

type TwoFactorVerifyPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function TwoFactorVerifyPage({
  searchParams,
}: TwoFactorVerifyPageProps) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const params = await searchParams;
  const next = getSafeTwoFactorNextPath(params.next ?? "/designs");
  const enabled = await isTwoFactorEnabled(session.user.id);

  if (!enabled || (await isTwoFactorVerifiedForRequest(session.user.id))) {
    redirect(next);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <TwoFactorChallengeCard
        next={next}
        hasError={Boolean(params.error)}
        action={verifyTwoFactorChallengeAction}
      />
    </main>
  );
}
