"use client";

import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLocaleSelect, useAuthLocale } from "@/features/auth/auth-locale";
import { getAuthCopy } from "@/features/auth/auth-localization";
import { productName } from "@/lib/product";

type EmailVerificationCardProps = {
  initialEmail?: string;
};

type FormState = {
  tone: "idle" | "success" | "error";
  message: string;
};

export function EmailVerificationCard({
  initialEmail = "",
}: EmailVerificationCardProps) {
  const router = useRouter();
  const { locale, updateLocale } = useAuthLocale();
  const copy = getAuthCopy(locale);
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<FormState>({
    tone: "idle",
    message: "",
  });
  const [isPending, startTransition] = useTransition();

  function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const emailValue = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

    startTransition(async () => {
      const response = await fetch(
        "/api/auth/email-otp/send-verification-otp",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: emailValue,
            type: "email-verification",
          }),
        },
      );

      setState(
        response.ok
          ? {
              tone: "success",
              message: copy.verifyEmail.codeSent,
            }
          : {
              tone: "error",
              message: copy.verifyEmail.sendCodeFailed,
            },
      );
    });
  }

  function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const emailValue = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const otp = String(formData.get("otp") ?? "").trim();

    startTransition(async () => {
      const response = await fetch("/api/auth/email-otp/verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailValue, otp }),
      });

      if (!response.ok) {
        setState({
          tone: "error",
          message: copy.verifyEmail.codeMismatch,
        });
        return;
      }

      setState({
        tone: "success",
        message: copy.verifyEmail.verified,
      });
      router.refresh();
      router.push("/designs");
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-2 flex justify-end">
          <AuthLocaleSelect
            label={copy.language}
            locale={locale}
            onLocaleChange={updateLocale}
          />
        </div>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          {copy.verifyEmail.title}
        </CardTitle>
        <CardDescription>
          {copy.verifyEmail.description(productName)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verify-email">{copy.verifyEmail.email}</Label>
            <Input
              id="verify-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verify-otp">
              {copy.verifyEmail.verificationCode}
            </Label>
            <Input
              id="verify-otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              required
            />
          </div>
          {state.tone !== "idle" ? (
            <Alert variant={state.tone === "error" ? "destructive" : "default"}>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? copy.verifyEmail.checking
              : copy.verifyEmail.verifyAndContinue}
          </Button>
        </form>

        <form onSubmit={handleSendCode}>
          <input type="hidden" name="email" value={email} />
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={isPending || !email}
          >
            <MailCheck className="h-4 w-4" />
            {copy.verifyEmail.sendNewCode}
          </Button>
        </form>

        <Button asChild variant="ghost" className="w-full">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            {copy.verifyEmail.backToSignIn}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
