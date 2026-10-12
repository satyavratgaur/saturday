"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Gate } from "@/components/Gate";
import { Card, CardData } from "@/components/Card";
import { Button, ErrorText, Input, Screen, Spinner, errMsg } from "@/components/ui";
import { PLATFORM_LABEL } from "@/lib/interests";

export default function WeekPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Gate redirectTo={`/s/${id}`}>
      <Week squadId={id as Id<"squads">} />
    </Gate>
  );
}

function Week({ squadId }: { squadId: Id<"squads"> }) {
  const router = useRouter();
  const data = useQuery(api.submissions.weekView, { squadId });
  const endWeek = useMutation(api.weeks.endWeek);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (data && (data.week === null || data.week.status === "drafting")) router.replace(`/s/${squadId}/draft`);
    if (data?.week?.status === "done") router.replace(`/s/${squadId}/recap`);
  }, [data, router, squadId]);

  if (!data || !data.week || data.week.status !== "live") return <Spinner />;

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${data.inviteCode}` : "";

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

  async function copyInvite() {
    try {
      if (navigator.share) await navigator.share({ title: data!.squadName, text: `Join our squad on Squad Cards`, url: inviteUrl });
      else {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* cancelled */
    }
  }

  const myDone = data.cards.filter((c) => c.unlocked).length;

  return (
    <Screen back="/squads" title={data.squadName}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">
          Week {data.week.weekNo} · {data.optedCount} in
          {data.optedIn && ` · you ${myDone}/${data.cards.length}`}
        </p>
        <button className="text-sm text-white/60 underline" onClick={copyInvite}>
          {copied ? "Copied" : "Invite"}
        </button>
      </div>

      {!data.optedIn && (
        <div className="mt-4 rounded-3xl bg-amber-400/10 p-4 ring-1 ring-amber-400/30">
          <p className="font-semibold text-amber-200">You&apos;re spectating this week</p>
          <p className="mt-1 text-sm text-amber-100/70">Add a forfeit to the pool to opt in and post photos.</p>
          <div className="mt-3">
            <Button variant="secondary" onClick={() => setOptIn(true)}>
              Opt in
            </Button>
          </div>
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
          <a href={data.chatUrl} target="_blank" rel="noreferrer" className="block w-full rounded-2xl bg-white/10 px-4 py-3.5 text-center text-base font-semibold">
            Open squad chat ({PLATFORM_LABEL[data.chatPlatform]})
          </a>
        ) : null}
        {data.isCreator && (
          <Button variant="danger" onClick={doEnd} disabled={busy}>
            {busy ? "Ending…" : "End week"}
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
          <button onClick={onNeedOptIn} className="flex items-center gap-2 text-sm font-medium text-white/70">
            <LockIcon /> Opt in to play
          </button>
        ) : (
          <>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-50 ${
                mine ? "bg-white/10 text-white" : "bg-white text-black"
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
        <p className="mt-2 text-xs text-white/50">
          {others.length} photo{others.length === 1 ? "" : "s"} hidden until you post yours.
        </p>
      )}
    </Card>
  );
}

function Photo({ p, blurred }: { p: WeekCardT["photos"][number]; blurred: boolean }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-white/10">
      {p.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.url} alt="" className={`h-full w-full object-cover ${blurred ? "scale-110 blur-xl" : ""}`} draggable={false} />
      )}
      {blurred && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <LockIcon />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[11px] font-medium">
        {p.isMe ? "You" : p.name}
        {p.first ? " ⚡" : ""}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
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
    <div className="fixed inset-0 z-20 flex items-end bg-black/60" onClick={onClose}>
      <div className="mx-auto w-full max-w-md rounded-t-3xl bg-[#15151b] p-5 pb-8 ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">Opt in for this week</h2>
        <p className="mt-1 text-sm text-white/60">Add a forfeit to the pool. Whoever finishes last draws one. You could draw your own.</p>
        <div className="mt-4">
          <Input placeholder="e.g. Sing in the group voice chat" value={text} onChange={(e) => setText(e.target.value)} maxLength={140} autoFocus />
        </div>
        <div className="mt-4">
          <Button onClick={go} disabled={busy || !text.trim()}>
            {busy ? "Joining…" : "I'm in"}
          </Button>
          <ErrorText>{err}</ErrorText>
        </div>
      </div>
    </div>
  );
}

