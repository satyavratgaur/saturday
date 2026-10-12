"use client";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Gate } from "@/components/Gate";
import { Button, ErrorText, Screen, Spinner, errMsg } from "@/components/ui";

export default function RecapPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Gate redirectTo={`/s/${id}/recap`}>
      <Recap squadId={id as Id<"squads">} />
    </Gate>
  );
}

function Recap({ squadId }: { squadId: Id<"squads"> }) {
  const router = useRouter();
  const r = useQuery(api.weeks.recap, { squadId });
  const ensureDraft = useMutation(api.weeks.ensureDraft);
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (r === undefined) return <Spinner />;
  if (r === null)
    return (
      <Screen title="No recap yet" back={`/s/${squadId}`}>
        <p className="text-white/60">The week hasn&apos;t ended.</p>
      </Screen>
    );

  const total = r.cardCount * r.optedIn;

  async function saveImage() {
    if (!ref.current) return;
    setBusy(true);
    setErr("");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, backgroundColor: "#0b0b0f", cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${r!.squadName}-week-${r!.weekNo}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${r!.squadName} · Week ${r!.weekNo}` });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = file.name;
        a.click();
      }
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function nextWeek() {
    setBusy(true);
    try {
      await ensureDraft({ squadId });
      router.push(`/s/${squadId}/draft`);
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <Screen back="/squads">
      <div ref={ref} className="rounded-3xl bg-[#0b0b0f] p-1">
        <p className="text-sm font-medium uppercase tracking-widest text-white/50">
          {r.squadName} · Week {r.weekNo}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Squad: {r.totalDone} of {total} done
        </h1>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-emerald-400" style={{ width: `${total ? Math.min(100, (100 * r.totalDone) / total) : 0}%` }} />
        </div>

        {r.crown ? (
          <div className="mt-6 overflow-hidden rounded-3xl bg-amber-400/10 ring-1 ring-amber-400/30">
            {r.crown.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.crown.photoUrl} alt="" className="aspect-[4/3] w-full object-cover" crossOrigin="anonymous" />
            )}
            <div className="p-4">
              <p className="text-sm font-medium uppercase tracking-widest text-amber-300">👑 Crown</p>
              <p className="text-2xl font-bold">{r.crown.name}</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <p className="text-lg font-semibold">Nobody posted. No crown this week.</p>
          </div>
        )}

        <div className="mt-4 rounded-3xl bg-white/[0.06] p-4 ring-1 ring-white/10">
          <p className="text-sm font-medium uppercase tracking-widest text-white/50">Standings</p>
          <ol className="mt-2 divide-y divide-white/10">
            {r.standings.map((s, i) => (
              <li key={s.userId} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-3">
                  <span className="w-5 text-right tabular-nums text-white/40">{i + 1}</span>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-white/40">
                    {s.done}/{r.cardCount}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{s.points} pts</span>
              </li>
            ))}
            {r.standings.length === 0 && <li className="py-2 text-white/50">No one opted in.</li>}
          </ol>
        </div>

        {r.cleanSweep ? (
          <div className="mt-4 rounded-3xl bg-emerald-400/10 p-4 ring-1 ring-emerald-400/30">
            <p className="text-lg font-semibold text-emerald-200">Clean sweep. Everyone did all three. No forfeit.</p>
          </div>
        ) : r.loser ? (
          <div className="mt-4 rounded-3xl bg-red-500/10 p-4 ring-1 ring-red-500/30">
            <p className="text-sm font-medium uppercase tracking-widest text-red-300">
              Forfeit{r.coinFlip ? " · decided by coin flip 🪙" : ""}
            </p>
            <p className="text-2xl font-bold">{r.loser.name}</p>
            {r.forfeit ? (
              <p className="mt-2 text-lg text-white/90">
                “{r.forfeit.text}”<span className="block text-sm text-white/40">— {r.forfeit.authorName}</span>
              </p>
            ) : (
              <p className="mt-2 text-white/60">The pool was empty. The squad decides.</p>
            )}
          </div>
        ) : null}
        <p className="mt-4 text-center text-xs text-white/30">squad cards</p>
      </div>

      <div className="mt-6 space-y-3">
        <Button onClick={saveImage} disabled={busy}>
          {busy ? "Rendering…" : "Save as image"}
        </Button>
        <Button variant="secondary" onClick={nextWeek} disabled={busy}>
          Start next week
        </Button>
        <ErrorText>{err}</ErrorText>
      </div>
    </Screen>
  );
}
