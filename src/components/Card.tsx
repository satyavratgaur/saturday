"use client";
import { ReactNode } from "react";
import { TYPE_STYLE } from "@/lib/interests";

export type CardData = {
  key: string;
  interest: string;
  type: "everyday" | "stretch" | "wildcard";
  name: string;
  blurb: string;
  proof: string;
  points: number;
};

export function Card({
  card,
  footer,
  children,
  dim,
  progress,
}: {
  card: CardData;
  footer?: ReactNode;
  children?: ReactNode;
  dim?: boolean;
  progress?: { n: number; m: number };
}) {
  const t = TYPE_STYLE[card.type];
  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-white/[0.06] p-4 ring-1 ring-white/10 ${dim ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${t.cls}`}>{t.label}</span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-black shadow-[0_0_0_3px_rgba(251,191,36,0.25)]">
          {card.points}
        </span>
      </div>
      <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight">{card.name}</h2>
      <p className="mt-1 text-base text-white/80">{card.blurb}</p>
      <p className="mt-3 text-sm text-white/50">
        <span className="font-medium text-white/70">Proof:</span> {card.proof}
      </p>
      {children}
      {(footer || progress) && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex-1">{footer}</div>
          {progress && (
            <span className="shrink-0 text-sm tabular-nums text-white/60">
              {progress.n} of {progress.m} done
            </span>
          )}
        </div>
      )}
    </section>
  );
}
