import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { INTERESTS } from "./lib";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const u = await ctx.db.get(userId);
    if (!u) return null;
    return {
      _id: u._id,
      name: u.name ?? null,
      email: u.email ?? null,
      interests: u.interests ?? [],
      onboarded: !!u.onboarded,
      isAnonymous: !!u.isAnonymous,
    };
  },
});

export const onboard = mutation({
  args: { name: v.string(), interests: v.array(v.string()) },
  handler: async (ctx, { name, interests }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 24) throw new Error("Name must be 1–24 chars");
    const uniq = Array.from(new Set(interests));
    if (uniq.length !== 3) throw new Error("Pick exactly 3 interests");
    for (const i of uniq) if (!(INTERESTS as readonly string[]).includes(i)) throw new Error("Bad interest " + i);
    await ctx.db.patch(userId, { name: clean, interests: uniq, onboarded: true });
  },
});
