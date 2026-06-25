import { resetPasswordAction } from "@/app/reset-password/actions";
import { ResetPasswordCard } from "@/features/auth/reset-password-card";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
    error?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <ResetPasswordCard
        token={params.token ?? ""}
        error={params.error ?? null}
        action={resetPasswordAction}
      />
    </main>
  );
}
