"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Gate } from "@/components/Gate";
import { Card, CardData } from "@/components/Card";
import { Button, ErrorText, Input, Screen, Spinner, errMsg } from "@/components/ui";

export default function DraftPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Gate redirectTo={`/s/${id}/draft`}>
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

  // No week yet (or last one done) → deal.
  useEffect(() => {
    if (data && data.week === null) void ensureDraft({ squadId }).catch((e) => setErr(errMsg(e)));
  }, [data, ensureDraft, squadId]);

  // Already live/done → go to the week screen.
  useEffect(() => {
    if (data?.week && data.week.status !== "drafting") router.replace(`/s/${squadId}`);
  }, [data, router, squadId]);

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
    <Screen title={`Week ${data.week.weekNo} draft`} back="/squads">
      <p className="text-white/60">
        Six candidates. Yes or no on each. The top three become this week&apos;s cards. Voting opts you in.
      </p>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="tabular-nums text-white/50">
          {data.votedCount} of {data.memberCount} voted
        </span>
        {data.canRedeal && (
          <button className="text-white/50 underline" onClick={() => redeal({ weekId: data.week!._id }).catch((e) => setErr(errMsg(e)))}>
            Redeal
          </button>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {data.candidates.map((c) =>
          c.card ? (
            <Card
              key={c._id}
              card={c.card as CardData}
              footer={
                <div className="flex gap-2">
                  <VoteBtn on={c.myVote === false} label="No" onClick={() => vote({ candidateId: c._id, yes: false }).catch((e) => setErr(errMsg(e)))} />
                  <VoteBtn on={c.myVote === true} label="Yes" yes onClick={() => vote({ candidateId: c._id, yes: true }).catch((e) => setErr(errMsg(e)))} />
                </div>
              }
              progress={{ n: c.yesCount, m: data.memberCount }}
            />
          ) : null,
        )}
      </div>

      <div className="mt-8 rounded-3xl bg-white/[0.06] p-4 ring-1 ring-white/10">
        <h2 className="text-lg font-semibold">Your forfeit</h2>
        <p className="mt-1 text-sm text-white/50">Whoever finishes last draws one from the pool. Make it good.</p>
        <div className="mt-3">
          <Input
            placeholder="e.g. Cold plunge, filmed"
            value={forfeit}
            maxLength={140}
            onChange={(e) => setForfeit_(e.target.value)}
            onBlur={saveForfeit}
          />
        </div>
        {forfeitDirty && (
          <button className="mt-2 text-sm text-white/60 underline" onClick={saveForfeit}>
            Save forfeit
          </button>
        )}
      </div>

      <ErrorText>{err}</ErrorText>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-8">
        {data.isCreator ? (
          <Button onClick={doLock} disabled={busy || data.votedCount === 0}>
            {busy ? "Locking…" : `Lock the week (${data.votedCount} voted)`}
          </Button>
        ) : (
          <p className="text-center text-sm text-white/50">
            {myVotesIn === 6 ? "You're in. Waiting for the creator to lock." : `${myVotesIn}/6 voted`}
          </p>
        )}
      </div>
    </Screen>
  );
}

function VoteBtn({ on, label, yes, onClick }: { on: boolean; label: string; yes?: boolean; onClick: () => void }) {
  const onCls = yes ? "bg-emerald-400 text-black ring-emerald-400" : "bg-white/80 text-black ring-white/80";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 transition active:scale-[0.97] ${
        on ? onCls : "bg-white/[0.06] text-white ring-white/10"
      }`}
    >
      {label}
    </button>
  );
}
