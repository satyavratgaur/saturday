"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/Card";
import { BottomBar, Button, Input, Screen, Wordmark } from "@/components/ui";
import { SAMPLE_CARDS } from "@/lib/interests";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me);
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);

  // Signed-in players skip the pitch.
  useEffect(() => {
    if (isAuthenticated && me?.onboarded) router.replace("/squads");
  }, [isAuthenticated, me, router]);

  return (
    <Screen>
      <header className="flex items-center justify-between pt-2">
        <Wordmark className="text-2xl" />
        <Link href="/squads" className="rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold">
          Sign in
        </Link>
      </header>

      <section className="pt-8">
        <h1 className="font-display text-[2.6rem] font-extrabold leading-[0.98] tracking-tight">
          Three cards.
          <br />
          Seven days.
          <br />
          <span className="text-sun">Results drop Saturday.</span>
        </h1>
        <p className="mt-4 text-lg leading-snug text-muted">
          Real-world challenges for your group chat. Do the thing, snap a photo, and you&apos;ll only see your friends&apos; photos once
          you&apos;ve posted yours.
        </p>
      </section>

      <section className="relative mt-8 space-y-[-0.9rem] pb-4" aria-label="Example cards">
        {SAMPLE_CARDS.map((c, i) => (
          <div key={c.key} className="rise" style={{ animationDelay: `${i * 120}ms`, ["--tilt" as string]: `${[-3, 2.5, -1.5][i]}deg` }}>
            <Card card={c} compact tilt={[-3, 2.5, -1.5][i]} />
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">How a week works</h2>
        <ol className="mt-4 space-y-3">
          <Step day="Sun" title="Draft" body="Six cards get dealt. Everyone votes; the top three become the week. Drop a forfeit in the pool while you're at it." />
          <Step day="Mon–Sat" title="Play" body="Do a card, post a camera photo. No camera roll, no faking it. Friends' photos stay hidden until you post yours." />
          <Step day="Sat 8pm" title="Reveal" body="Most points takes the crown. Fewest points draws a forfeit from the pool, maybe the one you wrote." highlight />
        </ol>
      </section>

      <section className="mt-8 grid grid-cols-4 gap-2 text-center">
        <Pts cls="card-everyday" n="3" label="Everyday" />
        <Pts cls="card-stretch" n="4" label="Stretch" />
        <Pts cls="card-wildcard" n="2" label="Wildcard" />
        <div className="rounded-2xl bg-coin p-2 text-card-ink">
          <div className="font-display text-xl font-extrabold">+1</div>
          <div className="text-[11px] font-semibold">First to post</div>
        </div>
      </section>

      <p className="mt-8 text-center text-sm text-muted">3–15 friends. One squad per group chat. Free.</p>

      <BottomBar>
        {showCode ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim().length >= 4) router.push(`/join/${code.trim().toUpperCase()}`);
            }}
          >
            <Input
              placeholder="Invite code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
              autoFocus
            />
            <button type="submit" className="shrink-0 rounded-2xl bg-accent px-5 font-bold text-accent-ink" disabled={code.trim().length < 4}>
              Go
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            <Button onClick={() => router.push("/squads?new=1")}>Start a squad</Button>
            <button className="w-full py-2 text-sm font-semibold text-muted" onClick={() => setShowCode(true)}>
              Got an invite code?
            </button>
          </div>
        )}
      </BottomBar>
    </Screen>
  );
}

function Step({ day, title, body, highlight }: { day: string; title: string; body: string; highlight?: boolean }) {
  return (
    <li className={`flex gap-4 rounded-3xl p-4 ring-1 ${highlight ? "bg-hero text-hero-ink ring-hero" : "bg-surface ring-line"}`}>
      <div className={`w-16 shrink-0 pt-0.5 text-xs font-bold uppercase tracking-wider ${highlight ? "text-coin" : "text-sun"}`}>{day}</div>
      <div>
        <div className="font-display text-lg font-extrabold">{title}</div>
        <p className={`text-sm leading-snug ${highlight ? "opacity-80" : "text-muted"}`}>{body}</p>
      </div>
    </li>
  );
}

function Pts({ cls, n, label }: { cls: string; n: string; label: string }) {
  return (
    <div className={`${cls} rounded-2xl p-2 text-card-ink`}>
      <div className="font-display text-xl font-extrabold">{n}</div>
      <div className="text-[11px] font-semibold">{label}</div>
    </div>
  );
}
