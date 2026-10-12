"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card } from "@/components/Card";
import { NameStep, SignInPanel } from "@/components/Auth";
import { BottomBar, Button, ErrorText, Screen, Sheet, Spinner, Wordmark, errMsg } from "@/components/ui";
import { INTEREST_BY_KEY } from "@/lib/interests";
import { Avatars } from "@/components/Avatars";

/** PUBLIC. An invitee sees the squad and this week's cards before we ask them for anything. */
export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const preview = useQuery(api.squads.preview, { code });
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.me);
  const join = useMutation(api.squads.join);
  const [want, setWant] = useState(false);
  const [err, setErr] = useState("");
  const joining = useRef(false);

  // Once signed in and named, finish the join automatically.
  useEffect(() => {
    if (!want || !isAuthenticated || !me?.onboarded || joining.current) return;
    joining.current = true;
    join({ code })
      .then(({ squadId }) => router.replace(`/s/${squadId}`))
      .catch((e) => {
        setErr(errMsg(e));
        setWant(false);
        joining.current = false;
      });
  }, [want, isAuthenticated, me, join, code, router]);

  if (preview === undefined) return <Spinner />;
  if (preview === null)
    return (
      <Screen>
        <Wordmark className="text-2xl" />
        <h1 className="mt-10 font-display text-3xl font-extrabold">That invite doesn&apos;t exist.</h1>
        <p className="mt-2 text-muted">Ask whoever sent it for a fresh link, or double-check the code.</p>
        <Link href="/" className="mt-6 inline-block font-semibold underline">
          What is Saturday?
        </Link>
      </Screen>
    );

  const status =
    preview.week?.status === "live"
      ? `Week ${preview.week.weekNo} is live`
      : preview.week?.status === "drafting"
        ? `Week ${preview.week.weekNo}: voting on cards now`
        : "First week starts as soon as the squad drafts";

  const sheet = want && !isLoading && (!isAuthenticated || (me && !me.onboarded));

  return (
    <Screen>
      <header className="flex items-center justify-between pt-2">
        <Wordmark className="text-xl" />
        <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">{status}</span>
      </header>

      <section className="pt-8">
        <p className="text-sm font-bold uppercase tracking-widest text-sun">{preview.creatorName} invited you to</p>
        <h1 className="mt-1 font-display text-[2.75rem] font-extrabold leading-[0.95] tracking-tight">{preview.name}</h1>
        <div className="mt-4 flex items-center gap-3">
          <Avatars names={preview.members} />
          <span className="text-sm text-muted">
            {preview.memberCount} {preview.memberCount === 1 ? "friend" : "friends"} playing
          </span>
        </div>
        {preview.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {preview.interests.map((i) => (
              <span key={i} className="rounded-full bg-surface px-3 py-1 text-sm font-medium ring-1 ring-line">
                {INTEREST_BY_KEY[i]?.emoji} {INTEREST_BY_KEY[i]?.label ?? i}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-3xl bg-surface p-4 ring-1 ring-line">
        <p className="font-display text-lg font-extrabold leading-tight">Three real-world cards a week. Photo or it didn&apos;t happen.</p>
        <p className="mt-1 text-sm text-muted">
          Post a camera photo to complete a card. Friends&apos; photos stay hidden until you post yours. Saturday 8pm: most points wins the
          crown, fewest draws a forfeit.
        </p>
      </section>

      {preview.cards.length > 0 && (
        <section className="mt-6 space-y-4">
          <h2 className="font-display text-xl font-extrabold tracking-tight">
            {preview.week?.status === "live" ? "This week's cards" : "In this week's draft"}
          </h2>
          {preview.cards.map((c) => (
            <Card key={c.key} card={c} progress={preview.week?.status === "live" ? { n: c.doneCount, m: preview.memberCount } : undefined}>
              {c.photoNames.length > 0 && (
                <div className="mt-4">
                  <div className="grid grid-cols-3 gap-2">
                    {c.photoNames.slice(0, 3).map((n, i) => (
                      <div key={i} className="locked-tile relative aspect-square overflow-hidden rounded-xl">
                        <div className="absolute inset-0 flex items-center justify-center text-2xl">🔒</div>
                        <div className="absolute inset-x-0 bottom-0 px-1.5 pb-1 text-[11px] font-bold text-white">{n}</div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {listNames(c.photoNames)} posted. Join and post yours to see them.
                  </p>
                </div>
              )}
            </Card>
          ))}
        </section>
      )}

      <ErrorText>{err}</ErrorText>

      <BottomBar>
        {preview.isMember && isAuthenticated ? (
          <Button onClick={() => setWant(true)}>Open {preview.name}</Button>
        ) : preview.full ? (
          <Button disabled>This squad is full (15)</Button>
        ) : (
          <Button onClick={() => setWant(true)} disabled={want && isAuthenticated && !!me?.onboarded}>
            {want && isAuthenticated && me?.onboarded ? "Joining…" : `Join ${preview.name}`}
          </Button>
        )}
      </BottomBar>

      {sheet && (
        <Sheet onClose={() => setWant(false)}>
          {!isAuthenticated ? (
            <>
              <h2 className="font-display text-2xl font-extrabold tracking-tight">Join {preview.name}</h2>
              <p className="mb-4 mt-1 text-muted">Your email keeps your photos and points safe across devices.</p>
              <SignInPanel cta="Email me a code" />
            </>
          ) : (
            <NameStep />
          )}
        </Sheet>
      )}
    </Screen>
  );
}

function listNames(names: string[]) {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}
