import { redirect } from "next/navigation";

import { requestPasswordResetAction } from "@/app/forgot-password/actions";
import { ForgotPasswordCard } from "@/features/auth/forgot-password-card";
import { getServerSession } from "@/lib/auth-session";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    sent?: string;
    error?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const session = await getServerSession();

  if (session?.user) {
    redirect("/designs");
  }

  const params = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <ForgotPasswordCard
        sent={params.sent === "1"}
        hasError={Boolean(params.error)}
        action={requestPasswordResetAction}
      />
    </main>
  );
}
