"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { Gate } from "@/components/Gate";
import { BottomBar, Button, ErrorText, Input, Screen, Spinner, Wordmark, errMsg } from "@/components/ui";
import { INTEREST_BY_KEY, INTEREST_OPTIONS, PLATFORM_LABEL } from "@/lib/interests";

export default function SquadsPage() {
  return (
    <Gate>
      <Squads />
    </Gate>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  none: { label: "Not started", cls: "bg-surface-2 text-muted" },
  drafting: { label: "Voting", cls: "card-wildcard text-card-ink" },
  live: { label: "Live", cls: "card-everyday text-card-ink" },
  done: { label: "Results are in", cls: "bg-coin text-card-ink" },
};

function Squads() {
  const squads = useQuery(api.squads.mine);
  const me = useQuery(api.users.me);
  const { signOut } = useAuthActions();
  // Rendered client-side only (behind the auth gate), so reading the URL here is safe.
  const [mode, setMode] = useState<"list" | "create" | "join">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1" ? "create" : "list",
  );

  if (squads === undefined) return <Spinner />;
  if (mode === "create") return <CreateSquad onBack={() => setMode("list")} />;
  if (mode === "join") return <JoinSquad onBack={() => setMode("list")} />;

  return (
    <Screen>
      <header className="flex items-center justify-between pt-2">
        <Wordmark className="text-2xl" />
        <button className="text-sm text-faint" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>
      <div className="pt-6">
        <p className="text-muted">Hey {me?.name} 👋</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Your squads</h1>
      </div>
      <div className="mt-6 space-y-3">
        {squads.length === 0 && (
          <div className="rounded-3xl bg-surface p-5 ring-1 ring-line">
            <p className="font-display text-lg font-extrabold">No squad yet.</p>
            <p className="mt-1 text-muted">
              Start one for your group chat and drop the invite link in there, or open a link a friend sent you.
            </p>
          </div>
        )}
        {squads.map((s) => {
          const ws: string = s.weekStatus;
          const st = STATUS[ws] ?? STATUS.none;
          return (
            <Link
              key={s._id}
              href={ws === "drafting" || ws === "none" ? `/s/${s._id}/draft` : ws === "done" ? `/s/${s._id}/recap` : `/s/${s._id}`}
              className="block rounded-3xl bg-surface p-5 ring-1 ring-line transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold leading-tight">{s.name}</h2>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {s.memberCount} member{s.memberCount === 1 ? "" : "s"}
                {s.weekNo ? ` · Week ${s.weekNo}` : ""}
                {s.chatPlatform ? ` · ${PLATFORM_LABEL[s.chatPlatform]}` : ""}
              </p>
              {s.interests.length > 0 && (
                <p className="mt-2 text-sm">{s.interests.map((i) => INTEREST_BY_KEY[i]?.emoji).join(" ")}</p>
              )}
            </Link>
          );
        })}
      </div>
      <BottomBar>
        <div className="space-y-2">
          <Button onClick={() => setMode("create")}>Start a squad</Button>
          <button className="w-full py-2 text-sm font-semibold text-muted" onClick={() => setMode("join")}>
            Got an invite code?
          </button>
        </div>
      </BottomBar>
    </Screen>
  );
}

const PLATFORMS = ["whatsapp", "telegram", "discord", "imessage"] as const;
type Platform = (typeof PLATFORMS)[number];

function CreateSquad({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const create = useMutation(api.squads.create);
  const fetchName = useAction(api.og.groupName);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [linkChat, setLinkChat] = useState(false);
  const [platform, setPlatform] = useState<Platform>("whatsapp");
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function toggle(k: string) {
    setInterests((p) => (p.includes(k) ? p.filter((x) => x !== k) : p.length >= 3 ? p : [...p, k]));
  }

  async function onUrlBlur() {
    if (!url.trim() || nameTouched || platform === "imessage") return;
    setFetching(true);
    try {
      const n = await fetchName({ url });
      if (n && !nameTouched) setName(n);
    } catch {
      /* silent */
    } finally {
      setFetching(false);
    }
  }

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      const withChat = linkChat && (platform === "imessage" || url.trim());
      const { squadId } = await create({
        name,
        interests,
        chatPlatform: withChat ? platform : undefined,
        chatUrl: withChat && platform !== "imessage" ? url : undefined,
      });
      router.push(`/s/${squadId}/draft`);
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <button className="mt-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2" onClick={onBack} aria-label="Back">
        ←
      </button>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight">Start a squad</h1>
      <p className="mt-1 text-muted">One squad per group chat, 3–15 friends. You&apos;ll get an invite link to drop in the chat.</p>

      <div className="mt-6">
        <label className="text-sm font-bold">Squad name</label>
        <Input
          className="mt-2"
          placeholder={fetching ? "Looking up your group name…" : "e.g. Sunday Runners"}
          value={name}
          onChange={(e) => {
            setNameTouched(true);
            setName(e.target.value);
          }}
          maxLength={40}
        />
      </div>

      <div className="mt-7">
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-bold">What&apos;s the squad into?</label>
          <span className="text-sm font-bold tabular-nums text-muted">{interests.length}/3</span>
        </div>
        <p className="text-sm text-muted">Pick 3. They decide which cards get dealt each week.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {INTEREST_OPTIONS.map((o) => {
            const on = interests.includes(o.key);
            const full = !on && interests.length >= 3;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => toggle(o.key)}
                disabled={full}
                className={`flex items-center gap-2 rounded-2xl px-4 py-3.5 text-left font-semibold ring-2 transition active:scale-[0.98] disabled:opacity-35 ${
                  on ? "bg-accent text-accent-ink ring-accent" : "bg-surface text-ink ring-line"
                }`}
              >
                <span className="text-xl">{o.emoji}</span>
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-7 rounded-3xl bg-surface p-4 ring-1 ring-line">
        <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setLinkChat((x) => !x)}>
          <span>
            <span className="block text-sm font-bold">Link your group chat</span>
            <span className="block text-sm text-muted">Optional. Adds an &quot;Open chat&quot; button. You can do it later.</span>
          </span>
          <span className="text-xl">{linkChat ? "−" : "+"}</span>
        </button>
        {linkChat && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`rounded-xl px-1 py-2.5 text-xs font-bold ring-2 ${
                    platform === p ? "bg-accent text-accent-ink ring-accent" : "bg-bg ring-line"
                  }`}
                >
                  {PLATFORM_LABEL[p]}
                </button>
              ))}
            </div>
            {platform !== "imessage" ? (
              <Input
                placeholder={platform === "whatsapp" ? "https://chat.whatsapp.com/…" : platform === "telegram" ? "https://t.me/+…" : "https://discord.gg/…"}
                inputMode="url"
                autoCapitalize="off"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={onUrlBlur}
              />
            ) : (
              <p className="text-sm text-muted">iMessage groups have no link. We&apos;ll just remember it&apos;s iMessage.</p>
            )}
          </div>
        )}
      </div>

      <ErrorText>{err}</ErrorText>
      <BottomBar>
        <Button onClick={submit} disabled={busy || !name.trim() || interests.length !== 3}>
          {busy ? "Creating…" : interests.length !== 3 ? `Pick ${3 - interests.length} more` : "Create squad"}
        </Button>
      </BottomBar>
    </Screen>
  );
}

function JoinSquad({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <Screen>
      <button className="mt-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2" onClick={onBack} aria-label="Back">
        ←
      </button>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight">Join a squad</h1>
      <p className="mt-1 text-muted">Tap the invite link in your group chat, or type the code.</p>
      <Input
        className="mt-6 text-center font-display text-2xl font-extrabold tracking-[0.3em]"
        placeholder="CODE"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        autoCapitalize="characters"
        maxLength={8}
        autoFocus
      />
      <div className="mt-4">
        <Button onClick={() => router.push(`/join/${code.trim()}`)} disabled={code.trim().length < 4}>
          Continue
        </Button>
      </div>
    </Screen>
  );
}
