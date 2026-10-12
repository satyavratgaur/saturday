"use client";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button, ErrorText, Input, errMsg } from "./ui";

const ALLOW_GUEST = process.env.NEXT_PUBLIC_ALLOW_GUEST === "1";

/** Email → 6-digit code. Same account on web, Android and the iOS app. */
export function SignInPanel({ cta = "Send me a code" }: { cta?: string }) {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    setErr("");
    setBusy(true);
    try {
      await signIn("resend-otp", { email: email.trim().toLowerCase() });
      setStep("code");
      setCode("");
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify(c = code) {
    if (c.length !== 6) return;
    setErr("");
    setBusy(true);
    try {
      await signIn("resend-otp", { email: email.trim().toLowerCase(), code: c });
      // Auth state flips; the parent re-renders into the next step.
    } catch {
      setErr("That code didn't work. Check the latest email, or send a new one.");
      setBusy(false);
    }
  }

  async function guest() {
    setErr("");
    setBusy(true);
    try {
      await signIn("anonymous");
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
      >
        <p className="text-muted">
          We sent a 6-digit code to <span className="font-semibold text-ink">{email}</span>.
        </p>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          placeholder="••••••"
          value={code}
          maxLength={6}
          autoFocus
          className="text-center font-display text-3xl font-extrabold tracking-[0.5em]"
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(c);
            if (c.length === 6) void verify(c);
          }}
        />
        <Button type="submit" disabled={busy || code.length !== 6}>
          {busy ? "Checking…" : "Continue"}
        </Button>
        <div className="flex justify-between text-sm text-muted">
          <button type="button" className="underline" onClick={() => setStep("email")}>
            Different email
          </button>
          <button type="button" className="underline" onClick={() => void send()} disabled={busy}>
            Send a new code
          </button>
        </div>
        <ErrorText>{err}</ErrorText>
      </form>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <Input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim())}>
        {busy ? "Sending…" : cta}
      </Button>
      <p className="text-center text-xs text-faint">No password. We email you a code each time you sign in on a new device.</p>
      {ALLOW_GUEST && (
        <button type="button" onClick={guest} disabled={busy} className="w-full text-sm text-muted underline">
          Continue as guest (demo)
        </button>
      )}
      <ErrorText>{err}</ErrorText>
    </form>
  );
}

/** The only onboarding question: what your squad calls you. */
export function NameStep({ onDone, title = "What do your friends call you?" }: { onDone?: () => void; title?: string }) {
  const onboard = useMutation(api.users.onboard);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit() {
    setErr("");
    setBusy(true);
    try {
      await onboard({ name });
      onDone?.();
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
      <p className="text-muted">It goes on every photo you post.</p>
      <Input placeholder="First name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoFocus autoComplete="given-name" />
      <Button type="submit" disabled={busy || !name.trim()}>
        {busy ? "Saving…" : "That's me"}
      </Button>
      <ErrorText>{err}</ErrorText>
    </form>
  );
}
