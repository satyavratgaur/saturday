"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";

// Fetch the group name from a WhatsApp/Telegram invite page's OG metadata.
// Fails silently: returns null on any error.
export const groupName = action({
  args: { url: v.string() },
  handler: async (_ctx, { url }) => {
    try {
      let u = url.trim();
      if (!/^https?:\/\//i.test(u)) u = "https://" + u;
      const res = await fetch(u, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; SquadCards/1.0)" },
        redirect: "follow",
      });
      if (!res.ok) return null;
      const html = (await res.text()).slice(0, 200_000);
      const og =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
      let title = og?.[1] ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null;
      if (!title) return null;
      title = title.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
      // Telegram titles look like "Telegram: Contact @name" or "Name – Telegram"
      title = title.replace(/^Telegram:\s*(Contact\s*)?/i, "").replace(/\s*[–-]\s*Telegram$/i, "");
      if (/^whatsapp$/i.test(title) || /^whatsapp group invite$/i.test(title)) return null;
      return title.slice(0, 40);
    } catch {
      return null;
    }
  },
});
