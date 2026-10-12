"use client";
import Link from "next/link";
import { ReactNode } from "react";

export function Screen({ children, title, back }: { children: ReactNode; title?: string; back?: string }) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-4">
      {(title || back) && (
        <header className="mb-4 flex items-center gap-3">
          {back && (
            <Link href={back} className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80" aria-label="Back">
              ←
            </Link>
          )}
          {title && <h1 className="text-xl font-semibold tracking-tight">{title}</h1>}
        </header>
      )}
      {children}
    </main>
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
  const base = "w-full rounded-2xl px-4 py-3.5 text-base font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100";
  const v = {
    primary: "bg-white text-black",
    secondary: "bg-white/10 text-white",
    ghost: "bg-transparent text-white/70",
    danger: "bg-red-500/90 text-white",
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
        "w-full rounded-2xl bg-white/10 px-4 py-3.5 text-base text-white placeholder:text-white/40 outline-none ring-1 ring-white/10 focus:ring-white/40 " +
        (props.className ?? "")
      }
    />
  );
}

export function Spinner() {
  return (
    <div className="flex h-40 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="mt-2 text-sm text-red-400">{children}</p>;
}

export function errMsg(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  // Convex wraps: "[Request ID: ...] Server Error Uncaught Error: msg ..."
  const m2 = m.match(/Uncaught Error: ([^\n]+?)(?:\s+at\s|$)/)?.[1];
  return (m2 ?? m).trim();
}
