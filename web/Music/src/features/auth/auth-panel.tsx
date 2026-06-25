"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, LogOut, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getOnlineActionTitle,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";

export function AuthPanel() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const onlineGuard = useOnlineActionGuard();
  const connectionDisabled = !onlineGuard.canUseConnectionActions;
  const accountActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "account", title);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("essencefromexistence");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(mode: "sign-in" | "sign-up") {
    if (connectionDisabled) {
      toast.error(onlineGuard.accountDisabledReason);
      return;
    }

    setBusy(true);
    try {
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name });

      if (result.error) {
        toast.error(result.error.message ?? "Authentication failed.");
        if (mode === "sign-in") {
          setVerificationEmail(email);
        }
        return;
      }

      await refetch();
      if (mode === "sign-up") {
        setVerificationEmail(email);
        toast.success("Account created. Check your email for the code.");
      } else {
        toast.success("Signed in.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function sendVerificationCode() {
    if (connectionDisabled) {
      toast.error(onlineGuard.accountDisabledReason);
      return;
    }

    const targetEmail = (verificationEmail || email).trim();
    if (!targetEmail) {
      toast.error("Enter your email first.");
      return;
    }

    setBusy(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: targetEmail,
        type: "email-verification",
      });

      if (result.error) {
        toast.error(result.error.message ?? "Could not send code.");
        return;
      }

      setVerificationEmail(targetEmail);
      toast.success("Verification code sent.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmail() {
    if (connectionDisabled) {
      toast.error(onlineGuard.accountDisabledReason);
      return;
    }

    const targetEmail = (verificationEmail || email).trim();
    if (!targetEmail || !otp.trim()) {
      toast.error("Enter your email and code.");
      return;
    }

    setBusy(true);
    try {
      const result = await authClient.emailOtp.verifyEmail({
        email: targetEmail,
        otp: otp.trim(),
      });

      if (result.error) {
        toast.error(result.error.message ?? "Could not verify email.");
        return;
      }

      setOtp("");
      await refetch();
      toast.success("Email verified. You can sign in now.");
    } finally {
      setBusy(false);
    }
  }

  if (session?.user) {
    return (
      <Card className="border-white/10 bg-white/[0.04]">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Account</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.user.email}
            </p>
          </div>
          <Badge className="gap-1 bg-emerald-400/15 text-emerald-200">
            <ShieldCheck className="size-3" />
            {session.user.emailVerified ? "verified" : "active"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {connectionDisabled ? (
            <Badge variant="outline">{onlineGuard.accountDisabledReason}</Badge>
          ) : null}
          {!session.user.emailVerified ? (
            <EmailVerificationForm
              busy={busy || isPending}
              disabled={connectionDisabled}
              disabledReason={onlineGuard.accountDisabledReason}
              email={verificationEmail || session.user.email}
              otp={otp}
              setEmail={setVerificationEmail}
              setOtp={setOtp}
              onSend={sendVerificationCode}
              onVerify={verifyEmail}
            />
          ) : null}
          <Button
            variant="secondary"
            className="gap-2"
            disabled={connectionDisabled}
            title={accountActionTitle("Sign out")}
            onClick={async () => {
              if (connectionDisabled) {
                toast.error(onlineGuard.accountDisabledReason);
                return;
              }

              await authClient.signOut();
              await refetch();
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="size-4 text-emerald-200" />
          Account access
        </CardTitle>
      </CardHeader>
      <CardContent>
        {connectionDisabled ? (
          <Badge variant="outline">{onlineGuard.accountDisabledReason}</Badge>
        ) : null}
        <Tabs defaultValue="sign-in">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign-in">Sign in</TabsTrigger>
            <TabsTrigger value="sign-up">Create</TabsTrigger>
          </TabsList>
          <TabsContent value="sign-in" className="space-y-4 pt-4">
            <AuthFields
              email={email}
              password={password}
              setEmail={setEmail}
              setPassword={setPassword}
            />
            <Button
              className="w-full"
              disabled={busy || isPending || connectionDisabled}
              title={accountActionTitle("Sign in")}
              onClick={() => submit("sign-in")}
            >
              Sign in
            </Button>
          </TabsContent>
          <TabsContent value="sign-up" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="auth-name">Name</Label>
              <Input
                id="auth-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <AuthFields
              email={email}
              password={password}
              setEmail={setEmail}
              setPassword={setPassword}
            />
            <Button
              className="w-full"
              disabled={busy || isPending || connectionDisabled}
              title={accountActionTitle("Create account")}
              onClick={() => submit("sign-up")}
            >
              Create account
            </Button>
          </TabsContent>
        </Tabs>
        <div className="mt-5 rounded-md border border-white/10 bg-slate-950/50 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <KeyRound className="size-4 text-emerald-200" />
            Verify email
          </div>
          <EmailVerificationForm
            busy={busy || isPending}
            disabled={connectionDisabled}
            disabledReason={onlineGuard.accountDisabledReason}
            email={verificationEmail || email}
            otp={otp}
            setEmail={setVerificationEmail}
            setOtp={setOtp}
            onSend={sendVerificationCode}
            onVerify={verifyEmail}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function EmailVerificationForm({
  busy,
  disabled,
  disabledReason,
  email,
  otp,
  onSend,
  onVerify,
  setEmail,
  setOtp,
}: {
  busy: boolean;
  disabled?: boolean;
  disabledReason?: string;
  email: string;
  otp: string;
  onSend: () => void;
  onVerify: () => void;
  setEmail: (value: string) => void;
  setOtp: (value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        <Button
          variant="secondary"
          disabled={busy || disabled}
          title={disabled ? disabledReason : "Send verification code"}
          onClick={onSend}
        >
          Send code
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Input
          inputMode="numeric"
          maxLength={8}
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          placeholder="6-digit code"
        />
        <Button
          className="gap-2"
          disabled={busy || disabled}
          title={disabled ? disabledReason : "Verify email"}
          onClick={onVerify}
        >
          <CheckCircle2 className="size-4" />
          Verify
        </Button>
      </div>
    </div>
  );
}

function AuthFields({
  email,
  password,
  setEmail,
  setPassword,
}: {
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="auth-email">Email</Label>
        <Input
          id="auth-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-password">Password</Label>
        <Input
          id="auth-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimum 8 characters"
        />
      </div>
    </>
  );
}
