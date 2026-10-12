"use client";
import Link from "next/link";
import { ReactNode } from "react";

export function Screen({ children, title, back }: { children: ReactNode; title?: string; back?: string }) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-4">
      {(title || back) && (
        <header className="mb-4 flex items-center gap-3">
          {back && (
            <Link href={back} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-ink" aria-label="Back">
              ←
            </Link>
          )}
          {title && <h1 className="font-display text-xl font-bold tracking-tight">{title}</h1>}
        </header>
      )}
      {children}
    </main>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      saturday<span className="text-sun">.</span>
    </span>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  className?: string;
}) {
  const base =
    "w-full rounded-2xl px-4 py-4 text-base font-bold transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100";
  const v = {
    primary: "bg-accent text-accent-ink shadow-[0_4px_0_0_color-mix(in_srgb,var(--accent)_45%,transparent)]",
    secondary: "bg-surface-2 text-ink",
    ghost: "bg-transparent text-muted",
    danger: "bg-danger text-white",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${v} ${className}`}>
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-2xl bg-surface px-4 py-4 text-base text-ink placeholder:text-faint outline-none ring-2 ring-line focus:ring-ink " +
        (props.className ?? "")
      }
    />
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-surface p-5 ring-1 ring-line ${className}`}>{children}</div>;
}

export function Spinner() {
  return (
    <div className="flex h-40 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink" />
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="mt-2 text-sm font-medium text-danger">{children}</p>;
}

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md bg-gradient-to-t from-bg via-bg/95 to-transparent p-4 pt-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}

export function Sheet({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="rise mx-auto w-full max-w-md rounded-t-[2rem] bg-bg p-5 pb-[max(2rem,env(safe-area-inset-bottom))] ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
        {children}
      </div>
    </div>
  );
}

export function errMsg(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  // Convex wraps: "[Request ID: ...] Server Error Uncaught Error: msg ..."
  const m2 = m.match(/Uncaught Error: ([^\n]+?)(?:\s+at\s|$)/)?.[1];
  return (m2 ?? m).trim();
}
