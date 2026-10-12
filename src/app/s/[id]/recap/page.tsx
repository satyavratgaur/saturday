"use client";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Gate } from "@/components/Gate";
import { Button, ErrorText, Screen, Spinner, Wordmark, errMsg } from "@/components/ui";
import { ForceTheme } from "@/components/Theme";

export default function RecapPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Gate>
      <ForceTheme theme="night" />
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
        <p className="text-muted">Results drop Saturday 8pm.</p>
      </Screen>
    );

  const total = r.cardCount * r.optedIn;

  async function saveImage() {
    if (!ref.current) return;
    setBusy(true);
    setErr("");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#120b2e", cacheBust: true });
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
      <div ref={ref} className="rounded-[2rem] bg-bg p-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-widest text-sun">
            {r.squadName} · Week {r.weekNo}
          </p>
          <Wordmark className="text-base" />
        </div>
        <h1 className="mt-2 font-display text-[2.6rem] font-extrabold leading-[0.95] tracking-tight">
          {r.totalDone} of {total}
          <span className="block text-muted">cards done</span>
        </h1>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-2">
          <div className="card-everyday h-full rounded-full" style={{ width: `${total ? Math.min(100, (100 * r.totalDone) / total) : 0}%` }} />
        </div>

        {r.crown ? (
          <div className="mt-6 overflow-hidden rounded-[1.75rem] bg-coin text-card-ink shadow-[0_0_40px_-8px_var(--coin)]">
            {r.crown.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.crown.photoUrl} alt="" className="aspect-[4/3] w-full object-cover" crossOrigin="anonymous" />
            )}
            <div className="p-5">
              <p className="text-sm font-bold uppercase tracking-widest">👑 The crown</p>
              <p className="font-display text-4xl font-extrabold tracking-tight">{r.crown.name}</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl bg-surface p-5 ring-1 ring-line">
            <p className="font-display text-xl font-extrabold">Nobody posted. No crown this week.</p>
          </div>
        )}

        <div className="mt-4 rounded-3xl bg-surface p-5 ring-1 ring-line">
          <p className="text-sm font-bold uppercase tracking-widest text-muted">Standings</p>
          <ol className="mt-2 divide-y divide-line">
            {r.standings.map((s, i) => (
              <li key={s.userId} className="flex items-center justify-between py-2.5">
                <span className="flex items-center gap-3">
                  <span className="w-5 text-right font-display font-extrabold tabular-nums text-faint">{i + 1}</span>
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-xs text-muted">
                    {s.done}/{r.cardCount}
                  </span>
                </span>
                <span className="font-display font-extrabold tabular-nums">{s.points} pts</span>
              </li>
            ))}
            {r.standings.length === 0 && <li className="py-2 text-muted">No one opted in.</li>}
          </ol>
        </div>

        {r.cleanSweep ? (
          <div className="card-everyday mt-4 rounded-3xl p-5 text-card-ink">
            <p className="font-display text-xl font-extrabold">Clean sweep. Everyone did all three. No forfeit.</p>
          </div>
        ) : r.loser ? (
          <div className="card-stretch mt-4 rounded-3xl p-5 text-card-ink">
            <p className="text-sm font-bold uppercase tracking-widest">Forfeit{r.coinFlip ? " · decided by coin flip 🪙" : ""}</p>
            <p className="font-display text-3xl font-extrabold">{r.loser.name}</p>
            {r.forfeit ? (
              <p className="mt-2 text-lg font-semibold">
                “{r.forfeit.text}”<span className="block text-sm font-medium opacity-70">— {r.forfeit.authorName}</span>
              </p>
            ) : (
              <p className="mt-2">The pool was empty. The squad decides.</p>
            )}
          </div>
        ) : null}
        <p className="mt-4 text-center text-xs text-faint">saturday.place</p>
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
