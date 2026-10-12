"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Gate } from "@/components/Gate";
import { Spinner } from "@/components/ui";

export default function Home() {
  return (
    <Gate redirectTo="/squads">
      <Redirect to="/squads" />
    </Gate>
  );
}

function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return <Spinner />;
}
