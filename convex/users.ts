import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
      onboarded: !!u.onboarded,
      isAnonymous: !!u.isAnonymous,
    };
  },
});

// Onboarding is just a name now. Interests live on the squad.
export const onboard = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 24) throw new Error("Name must be 1–24 characters");
    await ctx.db.patch(userId, { name: clean, onboarded: true });
  },
});
