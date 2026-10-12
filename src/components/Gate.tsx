"use client";
import Link from "next/link";
import { ReactNode } from "react";
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Screen, Spinner, Wordmark } from "./ui";
import { NameStep, SignInPanel } from "./Auth";

/** Wraps a signed-in page: sign-in → name → children. */
export function Gate({ children }: { children: ReactNode; redirectTo?: string }) {
  return (
    <>
      <AuthLoading>
        <Spinner />
      </AuthLoading>
      <Unauthenticated>
        <Screen>
          <div className="pt-8">
            <Link href="/">
              <Wordmark className="text-2xl" />
            </Link>
            <h1 className="mt-8 font-display text-4xl font-extrabold leading-[1.05] tracking-tight">Sign in to see your squad.</h1>
            <p className="mt-2 text-muted">Use the email you signed up with, on any device.</p>
          </div>
          <div className="mt-8">
            <SignInPanel />
          </div>
          <p className="mt-8 text-center text-sm text-muted">
            New here?{" "}
            <Link href="/" className="font-semibold text-ink underline">
              See how Saturday works
            </Link>
          </p>
        </Screen>
      </Unauthenticated>
      <Authenticated>
        <Onboarded>{children}</Onboarded>
      </Authenticated>
    </>
  );
}

function Onboarded({ children }: { children: ReactNode }) {
  const me = useQuery(api.users.me);
  if (me === undefined) return <Spinner />;
  if (!me || !me.onboarded)
    return (
      <Screen>
        <div className="pt-10">
          <NameStep />
        </div>
      </Screen>
    );
  return <>{children}</>;
}
