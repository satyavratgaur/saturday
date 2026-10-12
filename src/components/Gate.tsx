"use client";
import { ReactNode, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, AuthLoading, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button, ErrorText, Input, Screen, Spinner, errMsg } from "./ui";
import { INTEREST_OPTIONS } from "@/lib/interests";

/** Wraps a page: sign-in → onboarding → children. */
export function Gate({ children, redirectTo }: { children: ReactNode; redirectTo?: string }) {
  return (
    <>
      <AuthLoading>
        <Spinner />
      </AuthLoading>
      <Unauthenticated>
        <SignIn redirectTo={redirectTo} />
      </Unauthenticated>
      <Authenticated>
        <Onboarded>{children}</Onboarded>
      </Authenticated>
    </>
  );
}

function Onboarded({ children }: { children: ReactNode }) {
  const me = useQuery(api.users.me);
  if (me === undefined) return <Spinner />;
  if (!me || !me.onboarded) return <Onboarding />;
  return <>{children}</>;
}

function SignIn({ redirectTo }: { redirectTo?: string }) {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const dest = redirectTo ?? (typeof window !== "undefined" ? window.location.pathname : "/squads");

  async function sendLink() {
    setErr("");
    setBusy(true);
    try {
      await signIn("resend", { email: email.trim(), redirectTo: dest });
      setSent(true);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
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

  return (
    <Screen>
      <div className="pt-10">
        <p className="text-sm font-medium uppercase tracking-widest text-white/50">Squad Cards</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Three cards a week. Photo or it didn&apos;t happen.</h1>
        <p className="mt-3 text-white/60">Real-world challenges for your group chat. Most points takes the crown. Fewest draws a forfeit.</p>
      </div>
      {sent ? (
        <div className="mt-10 rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10">
          <p className="text-lg font-semibold">Check your email</p>
          <p className="mt-1 text-white/60">We sent a sign-in link to {email}. Open it on this phone.</p>
          <button className="mt-4 text-sm text-white/50 underline" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </div>
      ) : (
        <form
          className="mt-10 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendLink();
          }}
        >
          <Input type="email" inputMode="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" disabled={busy || !email.includes("@")}>
            {busy ? "Sending…" : "Email me a sign-in link"}
          </Button>
          <div className="flex items-center gap-3 py-1 text-xs text-white/30">
            <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
          </div>
          <Button variant="secondary" onClick={guest} disabled={busy}>
            Continue without email
          </Button>
          <ErrorText>{err}</ErrorText>
        </form>
      )}
    </Screen>
  );
}

function Onboarding() {
  const onboard = useMutation(api.users.onboard);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function toggle(k: string) {
    setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : p.length >= 3 ? p : [...p, k]));
  }
  async function submit() {
    setErr("");
    setBusy(true);
    try {
      await onboard({ name, interests: picked });
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <div className="pt-6">
        <h1 className="text-3xl font-bold tracking-tight">Who are you?</h1>
        <p className="mt-1 text-white/60">Your squad sees this name on every photo.</p>
      </div>
      <div className="mt-6">
        <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoFocus />
      </div>
      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Pick 3 interests</h2>
          <span className="text-sm tabular-nums text-white/50">{picked.length}/3</span>
        </div>
        <p className="text-sm text-white/50">They decide which cards your squad gets dealt.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {INTEREST_OPTIONS.map((o) => {
            const on = picked.includes(o.key);
            const full = !on && picked.length >= 3;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => toggle(o.key)}
                disabled={full}
                className={`flex items-center gap-2 rounded-2xl px-4 py-3.5 text-left text-base font-medium ring-1 transition active:scale-[0.98] disabled:opacity-40 ${
                  on ? "bg-white text-black ring-white" : "bg-white/[0.06] text-white ring-white/10"
                }`}
              >
                <span className="text-xl">{o.emoji}</span>
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-8">
        <Button onClick={submit} disabled={busy || name.trim().length === 0 || picked.length !== 3}>
          {busy ? "Saving…" : "Let's go"}
        </Button>
        <ErrorText>{err}</ErrorText>
      </div>
    </Screen>
  );
}
