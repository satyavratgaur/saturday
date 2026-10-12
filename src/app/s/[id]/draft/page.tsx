"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Gate } from "@/components/Gate";
import { Card, CardData } from "@/components/Card";
import { useInvite } from "@/components/Invite";
import { BottomBar, Button, ErrorText, Input, Screen, Spinner, errMsg } from "@/components/ui";

export default function DraftPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Gate>
      <Draft squadId={id as Id<"squads">} />
    </Gate>
  );
}

function Draft({ squadId }: { squadId: Id<"squads"> }) {
  const router = useRouter();
  const data = useQuery(api.weeks.draft, { squadId });
  const ensureDraft = useMutation(api.weeks.ensureDraft);
  const vote = useMutation(api.weeks.vote);
  const setForfeit = useMutation(api.weeks.setForfeit);
  const lock = useMutation(api.weeks.lock);
  const redeal = useMutation(api.weeks.redeal);
  const [forfeitDraft, setForfeit_] = useState<string | null>(null); // null = untouched, show server value
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const invite = useInvite(data && "inviteCode" in data ? (data.inviteCode ?? "") : "", data && "squadName" in data ? (data.squadName ?? "") : "");

  // No week yet (or last one done) → deal.
  useEffect(() => {
    if (data && data.week === null) void ensureDraft({ squadId }).catch((e) => setErr(errMsg(e)));
  }, [data, ensureDraft, squadId]);

  // Already live/done → go to the week screen.
  useEffect(() => {
    if (data?.week && data.week.status !== "drafting") router.replace(`/s/${squadId}`);
  }, [data, router, squadId]);

  if (err && (!data || data.week === null))
    return (
      <Screen title="Something went wrong" back="/squads">
        <p className="text-muted">We couldn&apos;t deal this week&apos;s cards.</p>
        <ErrorText>{err}</ErrorText>
        <div className="mt-6">
          <Button
            onClick={() => {
              setErr("");
              void ensureDraft({ squadId }).catch((e) => setErr(errMsg(e)));
            }}
          >
            Try again
          </Button>
        </div>
      </Screen>
    );
  if (!data || data.week === null || data.week.status !== "drafting") return <Spinner />;

  const myVotesIn = data.candidates.filter((c) => c.myVote !== null).length;
  const forfeit = forfeitDraft ?? data.myForfeit;
  const forfeitDirty = forfeitDraft !== null && forfeitDraft.trim() !== data.myForfeit;

  async function saveForfeit() {
    if (!forfeit.trim() || forfeit.trim() === data?.myForfeit) return;
    try {
      await setForfeit({ weekId: data!.week!._id, text: forfeit });
      setForfeit_(null);
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  async function doLock() {
    setErr("");
    setBusy(true);
    try {
      await lock({ weekId: data!.week!._id });
      router.replace(`/s/${squadId}`);
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <Screen title={data.squadName} back="/squads">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-sun">Week {data.week.weekNo} · Draft</p>
          <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight">Pick the week</h2>
        </div>
        <button className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold" onClick={invite.share}>
          {invite.copied ? "Copied ✓" : "＋ Invite"}
        </button>
      </div>
      <p className="mt-2 text-muted">
        Yes on the cards you&apos;d actually do. The top three become this week&apos;s cards. Voting puts you in for the week.
      </p>

      {data.memberCount < 3 && (
        <div className="mt-4 rounded-3xl bg-hero p-4 text-hero-ink">
          <p className="font-display text-lg font-extrabold">Saturday is better with 3+</p>
          <p className="mt-1 text-sm opacity-80">
            It&apos;s just {data.memberCount === 1 ? "you" : `${data.memberCount} of you`} so far. Drop the invite link in your group chat.
          </p>
          <button className="mt-3 w-full rounded-2xl bg-coin py-3 font-bold text-card-ink" onClick={invite.share}>
            {invite.copied ? "Link copied ✓" : "Share invite link"}
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-semibold tabular-nums text-muted">
          {data.votedCount} of {data.memberCount} voted
        </span>
        {data.canRedeal && (
          <button className="font-semibold text-muted underline" onClick={() => redeal({ weekId: data.week!._id }).catch((e) => setErr(errMsg(e)))}>
            Redeal cards
          </button>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {data.candidates.map((c) =>
          c.card ? (
            <Card
              key={c._id}
              card={c.card as CardData}
              footer={
                <div className="flex gap-2">
                  <VoteBtn on={c.myVote === false} label="Nah" onClick={() => vote({ candidateId: c._id, yes: false }).catch((e) => setErr(errMsg(e)))} />
                  <VoteBtn on={c.myVote === true} label="I'm in" onClick={() => vote({ candidateId: c._id, yes: true }).catch((e) => setErr(errMsg(e)))} />
                </div>
              }
              progress={{ n: c.yesCount, m: data.memberCount }}
            />
          ) : null,
        )}
      </div>

      <div className="mt-8 rounded-3xl bg-surface p-5 ring-1 ring-line">
        <h2 className="font-display text-xl font-extrabold">Your forfeit</h2>
        <p className="mt-1 text-sm text-muted">Whoever finishes last on Saturday draws one from the pool. It might be yours. Make it good.</p>
        <div className="mt-3">
          <Input placeholder="e.g. Cold plunge, filmed" value={forfeit} maxLength={140} onChange={(e) => setForfeit_(e.target.value)} onBlur={saveForfeit} />
        </div>
        {forfeitDirty && (
          <button className="mt-2 text-sm font-semibold text-muted underline" onClick={saveForfeit}>
            Save forfeit
          </button>
        )}
      </div>

      <ErrorText>{err}</ErrorText>

      <BottomBar>
        {data.isCreator ? (
          <Button onClick={doLock} disabled={busy || data.votedCount === 0}>
            {busy ? "Locking…" : `Lock the week · ${data.votedCount} voted`}
          </Button>
        ) : (
          <p className="rounded-2xl bg-surface py-4 text-center text-sm font-semibold text-muted ring-1 ring-line">
            {myVotesIn === data.candidates.length ? "You're in. Waiting for the squad to lock the week." : `${myVotesIn}/${data.candidates.length} voted`}
          </p>
        )}
      </BottomBar>
    </Screen>
  );
}

function VoteBtn({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition active:scale-[0.97] ${
        on ? "bg-card-ink text-white" : "bg-white/40 text-card-ink"
      }`}
    >
      {on ? "✓ " : ""}
      {label}
    </button>
  );
}
