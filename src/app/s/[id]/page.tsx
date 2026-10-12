"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Gate } from "@/components/Gate";
import { Card, CardData } from "@/components/Card";
import { useInvite } from "@/components/Invite";
import { Button, ErrorText, Input, Screen, Sheet, Spinner, errMsg } from "@/components/ui";
import { PLATFORM_LABEL } from "@/lib/interests";

export default function WeekPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Gate>
      <Week squadId={id as Id<"squads">} />
    </Gate>
  );
}

/** Next Saturday 20:00 local. */
function nextReveal(now = new Date()) {
  const d = new Date(now);
  d.setHours(20, 0, 0, 0);
  const add = (6 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + add);
  if (d <= now) d.setDate(d.getDate() + 7);
  return d;
}

function useCountdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ms = nextReveal(now).getTime() - now.getTime();
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function Week({ squadId }: { squadId: Id<"squads"> }) {
  const router = useRouter();
  const data = useQuery(api.submissions.weekView, { squadId });
  const endWeek = useMutation(api.weeks.endWeek);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [optIn, setOptIn] = useState(false);
  const countdown = useCountdown();
  const invite = useInvite(data && "inviteCode" in data ? (data.inviteCode ?? "") : "", data?.squadName ?? "");

  useEffect(() => {
    if (data && (data.week === null || data.week.status === "drafting")) router.replace(`/s/${squadId}/draft`);
    if (data?.week?.status === "done") router.replace(`/s/${squadId}/recap`);
  }, [data, router, squadId]);

  if (!data || !data.week || data.week.status !== "live") return <Spinner />;

  async function doEnd() {
    setErr("");
    setBusy(true);
    try {
      await endWeek({ weekId: data!.week!._id });
      router.replace(`/s/${squadId}/recap`);
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  const myDone = data.cards.filter((c) => c.unlocked).length;

  return (
    <Screen back="/squads" title={data.squadName}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-sun">Week {data.week.weekNo} · Live</p>
          <p className="text-sm font-semibold text-muted">
            {data.optedCount} playing{data.optedIn && ` · you ${myDone}/${data.cards.length}`}
          </p>
        </div>
        <button className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold" onClick={invite.share}>
          {invite.copied ? "Copied ✓" : "＋ Invite"}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-3xl bg-hero px-5 py-4 text-hero-ink">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-coin">Results drop</p>
          <p className="font-display text-xl font-extrabold">Saturday 8pm</p>
        </div>
        <p className="font-display text-3xl font-extrabold tabular-nums">{countdown}</p>
      </div>

      {!data.optedIn && (
        <div className="mt-4 rounded-3xl bg-coin p-4 text-card-ink">
          <p className="font-display text-lg font-extrabold">You&apos;re spectating this week</p>
          <p className="mt-1 text-sm">Add a forfeit to the pool to get in and start posting.</p>
          <button className="mt-3 w-full rounded-2xl bg-card-ink py-3 font-bold text-white" onClick={() => setOptIn(true)}>
            I&apos;m in
          </button>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {data.cards.map((c) =>
          c.card ? (
            <WeekCard
              key={c.weekCardId}
              c={c}
              optedIn={data.optedIn}
              optedCount={data.optedCount}
              onNeedOptIn={() => setOptIn(true)}
              onError={setErr}
            />
          ) : null,
        )}
      </div>

      <div className="mt-6 space-y-3">
        {data.chatUrl ? (
          <a href={data.chatUrl} target="_blank" rel="noreferrer" className="block w-full rounded-2xl bg-surface-2 px-4 py-4 text-center font-bold">
            Open squad chat{data.chatPlatform ? ` (${PLATFORM_LABEL[data.chatPlatform]})` : ""}
          </a>
        ) : null}
        {data.isCreator && (
          <Button variant="ghost" onClick={doEnd} disabled={busy}>
            {busy ? "Ending…" : "End the week now (creator)"}
          </Button>
        )}
        <ErrorText>{err}</ErrorText>
      </div>

      {optIn && <OptInSheet weekId={data.week._id} initial={data.myForfeit} onClose={() => setOptIn(false)} />}
    </Screen>
  );
}

type WeekCardT = {
  weekCardId: Id<"weekCards">;
  card: CardData | null;
  doneCount: number;
  unlocked: boolean;
  photos: { userId: Id<"users">; name: string; isMe: boolean; url: string | null; createdAt: number; first: boolean }[];
};

function WeekCard({
  c,
  optedIn,
  optedCount,
  onNeedOptIn,
  onError,
}: {
  c: WeekCardT;
  optedIn: boolean;
  optedCount: number;
  onNeedOptIn: () => void;
  onError: (s: string) => void;
}) {
  const generateUploadUrl = useMutation(api.submissions.generateUploadUrl);
  const submit = useMutation(api.submissions.submit);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    onError("");
    try {
      const url = await generateUploadUrl({ weekCardId: c.weekCardId });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      await submit({ weekCardId: c.weekCardId, storageId });
    } catch (err) {
      onError(errMsg(err));
    } finally {
      setUploading(false);
    }
  }

  const locked = !optedIn;
  const mine = c.photos.find((p) => p.isMe);
  const others = c.photos.filter((p) => !p.isMe);

  return (
    <Card
      card={c.card!}
      dim={locked}
      progress={{ n: c.doneCount, m: optedCount }}
      footer={
        locked ? (
          <button onClick={onNeedOptIn} className="flex items-center gap-2 rounded-xl bg-white/40 px-3 py-2 text-sm font-bold">
            <LockIcon /> Get in to play
          </button>
        ) : (
          <>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition active:scale-[0.97] disabled:opacity-50 ${
                mine ? "bg-white/40 text-card-ink" : "bg-card-ink text-white"
              }`}
            >
              {uploading ? "Uploading…" : mine ? "Retake" : "📷 Post photo"}
            </button>
          </>
        )
      }
    >
      {(mine || others.length > 0) && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {mine && <Photo p={mine} blurred={false} />}
          {others.map((p) => (
            <Photo key={p.userId} p={p} blurred={!c.unlocked} />
          ))}
        </div>
      )}
      {!mine && others.length > 0 && !locked && (
        <p className="mt-2 text-sm font-semibold">
          {others.length} photo{others.length === 1 ? "" : "s"} hidden until you post yours.
        </p>
      )}
    </Card>
  );
}

function Photo({ p, blurred }: { p: WeekCardT["photos"][number]; blurred: boolean }) {
  return (
    <div className={`relative aspect-square overflow-hidden rounded-xl ${blurred || !p.url ? "locked-tile" : "bg-card-ink/20"}`}>
      {!blurred && p.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.url} alt="" className="h-full w-full object-cover" draggable={false} />
      )}
      {blurred && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <LockIcon />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[11px] font-bold text-white">
        {p.isMe ? "You" : p.name}
        {p.first ? " ⚡" : ""}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-current">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function OptInSheet({ weekId, initial, onClose }: { weekId: Id<"weeks">; initial: string; onClose: () => void }) {
  const setForfeit = useMutation(api.weeks.setForfeit);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setErr("");
    setBusy(true);
    try {
      await setForfeit({ weekId, text });
      onClose();
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }
  return (
    <Sheet onClose={onClose}>
      <h2 className="font-display text-2xl font-extrabold tracking-tight">Get in this week</h2>
      <p className="mt-1 text-muted">Add a forfeit to the pool. Whoever finishes last on Saturday draws one. You could draw your own.</p>
      <div className="mt-4">
        <Input placeholder="e.g. Sing in the group voice chat" value={text} onChange={(e) => setText(e.target.value)} maxLength={140} autoFocus />
      </div>
      <div className="mt-4">
        <Button onClick={go} disabled={busy || !text.trim()}>
          {busy ? "Joining…" : "I'm in"}
        </Button>
        <ErrorText>{err}</ErrorText>
      </div>
    </Sheet>
  );
}
