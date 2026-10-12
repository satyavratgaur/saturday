"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Gate } from "@/components/Gate";
import { Button, ErrorText, Screen, Spinner, errMsg } from "@/components/ui";
import { PLATFORM_LABEL } from "@/lib/interests";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  return (
    <Gate redirectTo={`/join/${code}`}>
      <Join code={code} />
    </Gate>
  );
}

function Join({ code }: { code: string }) {
  const router = useRouter();
  const squad = useQuery(api.squads.byInvite, { code });
  const join = useMutation(api.squads.join);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (squad === undefined) return <Spinner />;
  if (squad === null)
    return (
      <Screen title="Invite not found" back="/squads">
        <p className="text-white/60">That code doesn&apos;t match a squad. Ask for a fresh link.</p>
      </Screen>
    );

  async function go() {
    setErr("");
    setBusy(true);
    try {
      const { squadId } = await join({ code });
      router.replace(`/s/${squadId}`);
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <div className="pt-10">
        <p className="text-sm font-medium uppercase tracking-widest text-white/50">You&apos;re invited to</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{squad.name}</h1>
        <p className="mt-2 text-white/60">
          {squad.memberCount} member{squad.memberCount === 1 ? "" : "s"} · {PLATFORM_LABEL[squad.chatPlatform]}
        </p>
      </div>
      <div className="mt-10">
        <Button onClick={go} disabled={busy}>
          {busy ? "Joining…" : "Join squad"}
        </Button>
        <ErrorText>{err}</ErrorText>
      </div>
    </Screen>
  );
}
