"use client";
import { useEffect } from "react";

/** Forces a theme while mounted (the recap is always night), then restores the time-based one. */
export function ForceTheme({ theme }: { theme: "day" | "night" }) {
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme;
    return () => {
      el.dataset.theme = el.dataset.baseTheme ?? "day";
    };
  }, [theme]);
  return null;
}
