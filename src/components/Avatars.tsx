"use client";

const AVATAR_BG = ["card-everyday", "card-stretch", "card-wildcard"];

export function Avatars({ names, max = 5 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  return (
    <div className="flex -space-x-2">
      {shown.map((n, i) => (
        <span
          key={i}
          className={`${AVATAR_BG[i % 3]} flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-extrabold text-card-ink ring-2 ring-bg`}
        >
          {n.slice(0, 1).toUpperCase()}
        </span>
      ))}
      {names.length > max && (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-xs font-bold ring-2 ring-bg">
          +{names.length - max}
        </span>
      )}
    </div>
  );
}
