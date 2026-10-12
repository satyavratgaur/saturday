import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const cardV = v.object({
  key: v.string(),
  interest: v.string(),
  type: v.union(v.literal("everyday"), v.literal("stretch"), v.literal("wildcard")),
  name: v.string(),
  blurb: v.string(),
  proof: v.string(),
  points: v.number(),
});

// Run once: npx convex run cards:seed '{"cards": <contents of cards.json>}'
// or use `npm run seed` (scripts/seed.ts).
export const seed = mutation({
  args: { cards: v.array(cardV) },
  handler: async (ctx, { cards }) => {
    let inserted = 0;
    for (const c of cards) {
      const existing = await ctx.db
        .query("cards")
        .withIndex("by_key", (q) => q.eq("key", c.key))
        .unique();
      if (existing) await ctx.db.replace(existing._id, c);
      else {
        await ctx.db.insert("cards", c);
        inserted++;
      }
    }
    return { total: cards.length, inserted };
  },
});

export const all = query({
  args: {},
  handler: async (ctx) => ctx.db.query("cards").collect(),
});
