"use client";
import { ReactNode } from "react";
import { TYPE_STYLE, INTEREST_BY_KEY } from "@/lib/interests";

export type CardData = {
  key: string;
  interest: string;
  type: "everyday" | "stretch" | "wildcard";
  name: string;
  blurb: string;
  proof: string;
  points: number;
};

/** A full-colour challenge card. Colour = type (green everyday, orange stretch, pink wildcard). */
export function Card({
  card,
  footer,
  children,
  dim,
  progress,
  tilt = 0,
  compact,
}: {
  card: CardData;
  footer?: ReactNode;
  children?: ReactNode;
  dim?: boolean;
  progress?: { n: number; m: number };
  tilt?: number;
  compact?: boolean;
}) {
  const t = TYPE_STYLE[card.type];
  const interest = INTEREST_BY_KEY[card.interest];
  return (
    <section
      style={{ ["--tilt" as string]: `${tilt}deg`, transform: tilt ? `rotate(${tilt}deg)` : undefined }}
      className={`${t.cls} relative overflow-hidden rounded-[1.75rem] text-card-ink shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] ${
        compact ? "p-4" : "p-5"
      } ${dim ? "opacity-60 saturate-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-card-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">{t.label}</span>
          {interest && (
            <span className="rounded-full bg-white/35 px-2.5 py-1 text-[11px] font-semibold">
              {interest.emoji} {interest.label}
            </span>
          )}
        </div>
        <span className="coin flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full font-display text-card-ink">
          <span className="text-base font-extrabold leading-none">{card.points}</span>
          <span className="text-[8px] font-bold uppercase leading-none">pts</span>
        </span>
      </div>
      <h2 className={`mt-3 font-display font-extrabold leading-[1.05] tracking-tight ${compact ? "text-2xl" : "text-[1.9rem]"}`}>
        {card.name}
      </h2>
      <p className="mt-1.5 text-[15px] font-medium leading-snug">{card.blurb}</p>
      {!compact && (
        <p className="mt-3 rounded-2xl bg-white/30 px-3 py-2 text-sm leading-snug">
          <span className="font-bold">📸 Proof:</span> {card.proof}
        </p>
      )}
      {children}
      {(footer || progress) && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex-1">{footer}</div>
          {progress && (
            <span className="shrink-0 rounded-full bg-card-ink/10 px-2.5 py-1 text-sm font-bold tabular-nums">
              {progress.n}/{progress.m} done
            </span>
          )}
        </div>
      )}
    </section>
  );
}
