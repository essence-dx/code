"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Box, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";

type AuthMode = "signin" | "signup";
type AuthStep = "credentials" | "verification";

export function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [step, setStep] = useState<AuthStep>("credentials");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationPassword, setVerificationPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function sendVerificationOtp(email: string) {
    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });

    if (result.error) {
      throw new Error(result.error.message ?? "Could not send verification code");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "Creator");

    setPending(true);

    try {
      if (mode === "signin") {
        const result = await authClient.signIn.email({ email, password });

        if (result.error) {
          const message = result.error.message ?? "Sign in failed";
          const code = "code" in result.error ? String(result.error.code ?? "") : "";

          if (`${code} ${message}`.toLowerCase().includes("verif")) {
            await sendVerificationOtp(email);
            setVerificationEmail(email);
            setVerificationPassword(password);
            setStep("verification");
            toast.message("Verification code sent");
            return;
          }

          throw new Error(result.error.message ?? "Sign in failed");
        }
      } else {
        const result = await authClient.signUp.email({ email, password, name });

        if (result.error) {
          throw new Error(result.error.message ?? "Sign up failed");
        }

        setVerificationEmail(email);
        setVerificationPassword(password);
        setStep("verification");
        toast.message("Verification code sent");
        return;
      }

      toast.success(mode === "signin" ? "Signed in" : "Account created");
      router.push("/projects");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setPending(false);
    }
  }

  async function handleVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const otp = String(formData.get("otp") ?? "");

    setPending(true);

    try {
      const result = await authClient.emailOtp.verifyEmail({
        email: verificationEmail,
        otp,
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Verification failed");
      }

      if (verificationPassword) {
        await authClient.signIn.email({ email: verificationEmail, password: verificationPassword });
      }

      toast.success("Email verified");
      router.push("/projects");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    setPending(true);

    try {
      await sendVerificationOtp(verificationEmail);
      toast.message("New verification code sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend code");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          {step === "verification" ? <MailCheck className="size-5" /> : <Box className="size-5" />}
        </div>
        <CardTitle>{step === "verification" ? "Confirm your email" : "Essence Spline"}</CardTitle>
        <CardDescription>{step === "verification" ? `Enter the 6-digit code sent to ${verificationEmail}.` : "Sign in to manage scenes, publishing, and shared projects."}</CardDescription>
      </CardHeader>
      <CardContent>
        {step === "verification" ? (
          <VerificationForm pending={pending} onBack={() => setStep("credentials")} onResend={handleResend} onSubmit={handleVerification} />
        ) : (
          <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <AuthForm mode="signin" pending={pending} onSubmit={handleSubmit} />
            </TabsContent>
            <TabsContent value="signup">
              <AuthForm mode="signup" pending={pending} onSubmit={handleSubmit} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function AuthForm({ mode, pending, onSubmit }: { mode: AuthMode; pending: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="mt-4 space-y-4" onSubmit={onSubmit}>
      {mode === "signup" ? (
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${mode}-email`}>Email</Label>
        <Input id={`${mode}-email`} name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-password`}>Password</Label>
        <Input id={`${mode}-password`} name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required />
      </div>
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Working" : mode === "signin" ? "Sign in" : "Create account"}
      </Button>
    </form>
  );
}

function VerificationForm({
  pending,
  onBack,
  onResend,
  onSubmit,
}: {
  pending: boolean;
  onBack: () => void;
  onResend: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="otp">Verification code</Label>
        <Input autoComplete="one-time-code" id="otp" inputMode="numeric" maxLength={6} minLength={6} name="otp" pattern="[0-9]{6}" required />
      </div>
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Verifying" : "Verify email"}
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button disabled={pending} type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button disabled={pending} type="button" variant="ghost" onClick={onResend}>
          Resend code
        </Button>
      </div>
    </form>
  );
}
