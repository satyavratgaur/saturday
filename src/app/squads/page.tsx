"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { Gate } from "@/components/Gate";
import { Button, ErrorText, Input, Screen, Spinner, errMsg } from "@/components/ui";
import { PLATFORM_LABEL } from "@/lib/interests";

export default function SquadsPage() {
  return (
    <Gate redirectTo="/squads">
      <Squads />
    </Gate>
  );
}

const STATUS_LABEL: Record<string, string> = {
  none: "Not started",
  drafting: "Drafting",
  live: "Live",
  done: "Week over",
};

function Squads() {
  const squads = useQuery(api.squads.mine);
  const me = useQuery(api.users.me);
  const { signOut } = useAuthActions();
  const [mode, setMode] = useState<"list" | "create" | "join">("list");

  if (squads === undefined) return <Spinner />;

  if (mode === "create") return <CreateSquad onBack={() => setMode("list")} />;
  if (mode === "join") return <JoinSquad onBack={() => setMode("list")} />;

  return (
    <Screen>
      <div className="flex items-center justify-between pt-4">
        <div>
          <p className="text-sm text-white/50">Hey {me?.name}</p>
          <h1 className="text-3xl font-bold tracking-tight">Your squads</h1>
        </div>
        <button className="text-sm text-white/40" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
      <div className="mt-6 space-y-3">
        {squads.length === 0 && (
          <p className="rounded-3xl bg-white/[0.06] p-5 text-white/60 ring-1 ring-white/10">
            No squads yet. Create one for your group chat, or open an invite link a friend posted.
          </p>
        )}
        {squads.map((s) => (
          <Link
            key={s._id}
            href={s.weekStatus === "drafting" ? `/s/${s._id}/draft` : `/s/${s._id}`}
            className="block rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10 active:bg-white/10"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{s.name}</h2>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{STATUS_LABEL[s.weekStatus]}</span>
            </div>
            <p className="mt-1 text-sm text-white/50">
              {s.memberCount} member{s.memberCount === 1 ? "" : "s"} · {PLATFORM_LABEL[s.chatPlatform]}
              {s.weekNo ? ` · Week ${s.weekNo}` : ""}
            </p>
          </Link>
        ))}
      </div>
      <div className="mt-8 space-y-3">
        <Button onClick={() => setMode("create")}>Create a squad</Button>
        <Button variant="secondary" onClick={() => setMode("join")}>
          I have an invite code
        </Button>
      </div>
    </Screen>
  );
}

const PLATFORMS = ["whatsapp", "telegram", "discord", "imessage"] as const;
type Platform = (typeof PLATFORMS)[number];

function CreateSquad({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const create = useMutation(api.squads.create);
  const fetchName = useAction(api.og.groupName);
  const [platform, setPlatform] = useState<Platform>("whatsapp");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

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
      const { squadId } = await create({ name, chatPlatform: platform, chatUrl: platform === "imessage" ? undefined : url });
      router.push(`/s/${squadId}/draft`);
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <Screen title="New squad">
      <button className="mb-4 text-sm text-white/50" onClick={onBack}>
        ← Back
      </button>
      <p className="text-white/60">One squad per group chat. 3–15 people.</p>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlatform(p)}
            className={`rounded-2xl px-2 py-3 text-sm font-medium ring-1 ${
              platform === p ? "bg-white text-black ring-white" : "bg-white/[0.06] ring-white/10"
            }`}
          >
            {PLATFORM_LABEL[p]}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
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
          <p className="text-sm text-white/50">iMessage has no group link. Just name the squad.</p>
        )}
        <Input
          placeholder={fetching ? "Looking up group name…" : "Squad name"}
          value={name}
          onChange={(e) => {
            setNameTouched(true);
            setName(e.target.value);
          }}
          maxLength={40}
        />
      </div>
      <div className="mt-6">
        <Button onClick={submit} disabled={busy || !name.trim() || (platform !== "imessage" && !url.trim())}>
          {busy ? "Creating…" : "Create squad"}
        </Button>
        <ErrorText>{err}</ErrorText>
      </div>
    </Screen>
  );
}

function JoinSquad({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <Screen title="Join a squad">
      <button className="mb-4 text-sm text-white/50" onClick={onBack}>
        ← Back
      </button>
      <Input placeholder="Invite code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" maxLength={8} />
      <div className="mt-4">
        <Button onClick={() => router.push(`/join/${code.trim()}`)} disabled={code.trim().length < 4}>
          Continue
        </Button>
      </div>
    </Screen>
  );
}
