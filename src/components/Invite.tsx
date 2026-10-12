"use client";
import { useState } from "react";

export function inviteUrl(code: string) {
  return typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : `/join/${code}`;
}

/** Native share sheet on phones (straight into WhatsApp), copy-to-clipboard elsewhere. */
export function useInvite(code: string, squadName: string) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = inviteUrl(code);
    const text = `Join ${squadName} on Saturday: 3 real-world cards a week, photo or it didn't happen.`;
    try {
      if (navigator.share) await navigator.share({ title: squadName, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* cancelled */
    }
  }
  return { share, copied };
}
