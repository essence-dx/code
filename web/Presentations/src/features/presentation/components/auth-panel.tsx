"use client"

import { useState } from "react"
import { LogOut, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NotificationInbox } from "@/features/notifications/components/notification-inbox"
import { authClient } from "@/lib/auth-client"

import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"

export function AuthPanel() {
  const { data: session, isPending } = authClient.useSession()
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in")
  const [name, setName] = useState("Creator")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [pendingEmail, setPendingEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  async function sendVerificationCode(targetEmail = email) {
    const normalizedEmail = targetEmail.trim()

    if (!normalizedEmail) {
      setMessage("Enter an email first")
      return
    }

    const response = await fetch("/api/auth/email-otp/send-verification-otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: normalizedEmail,
        type: "email-verification",
      }),
    })

    if (!response.ok) {
      setMessage("Could not send code")
      return
    }

    setPendingEmail(normalizedEmail)
    setMessage("Code sent")
  }

  async function verifyEmailCode() {
    const normalizedEmail = (pendingEmail || email).trim()
    const code = otp.trim()

    if (!normalizedEmail || !code) {
      setMessage("Enter email and code")
      return
    }

    setIsSubmitting(true)
    setMessage("")

    const response = await fetch("/api/auth/email-otp/verify-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, otp: code }),
    })

    if (!response.ok) {
      setMessage("Invalid or expired code")
      setIsSubmitting(false)
      return
    }

    if (password) {
      const result = await authClient.signIn.email({
        email: normalizedEmail,
        password,
      })

      if (result.error) {
        setMessage(result.error.message ?? "Verified. Sign in again.")
      }
    } else {
      setMessage("Verified. Sign in now.")
    }

    setOtp("")
    setIsSubmitting(false)
  }

  async function submit() {
    setMessage("")
    setIsSubmitting(true)
    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password })

    if (result.error) {
      setMessage(result.error.message ?? "Authentication failed")
      if (result.error.message?.toLowerCase().includes("verif")) {
        setPendingEmail(email.trim())
      }
      setIsSubmitting(false)
      return
    }

    if (mode === "sign-up") {
      setPendingEmail(email.trim())
      setMessage("Check your email for the code")
    }
    setIsSubmitting(false)
  }

  if (isPending) {
    return <div className="h-8 w-44 rounded-md bg-muted" />
  }

  if (session?.user) {
    return (
      <div
        className="flex min-w-0 items-center gap-2 rounded-md border bg-background px-2 py-1"
        data-testid={presentationSmokeTestIds.authPanel}
      >
        <UserRound className="size-4 shrink-0 text-muted-foreground" />
        <span className="max-w-36 truncate text-xs font-medium">
          {session.user.name || session.user.email}
        </span>
        <NotificationInbox />
        <Button
          aria-label="Sign out"
          title="Sign out"
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => void authClient.signOut()}
        >
          <LogOut className="size-3" />
        </Button>
      </div>
    )
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid={presentationSmokeTestIds.authPanel}
    >
      {mode === "sign-up" ? (
        <Input
          aria-label="Name"
          className="h-7 w-24 text-xs"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder="Name"
        />
      ) : null}
      <Input
        aria-label="Email"
        className="h-7 w-36 text-xs"
        data-testid={presentationSmokeTestIds.authEmailInput}
        value={email}
        onChange={(event) => setEmail(event.currentTarget.value)}
        placeholder="Email"
        type="email"
      />
      <Input
        aria-label="Password"
        className="h-7 w-28 text-xs"
        data-testid={presentationSmokeTestIds.authPasswordInput}
        value={password}
        onChange={(event) => setPassword(event.currentTarget.value)}
        placeholder="Password"
        type="password"
      />
      <Button
        type="button"
        size="sm"
        data-testid={presentationSmokeTestIds.authSubmitButton}
        onClick={() => void submit()}
      >
        {isSubmitting ? "Wait" : mode === "sign-in" ? "Sign in" : "Create"}
      </Button>
      {pendingEmail ? (
        <>
          <Input
            aria-label="Verification code"
            className="h-7 w-24 text-xs"
            value={otp}
            onChange={(event) => setOtp(event.currentTarget.value)}
            placeholder="Code"
            inputMode="numeric"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void verifyEmailCode()}
          >
            Verify
          </Button>
        </>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-testid={presentationSmokeTestIds.authVerificationCodeButton}
        onClick={() => void sendVerificationCode()}
      >
        Code
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
      >
        {mode === "sign-in" ? "New" : "Back"}
      </Button>
      {message ? (
        <span className="max-w-40 truncate text-xs text-destructive">
          {message}
        </span>
      ) : null}
    </div>
  )
}
