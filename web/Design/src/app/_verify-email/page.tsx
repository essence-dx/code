import { EmailVerificationCard } from "@/features/auth/email-verification-card";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <EmailVerificationCard initialEmail={params.email ?? ""} />
    </main>
  );
}
