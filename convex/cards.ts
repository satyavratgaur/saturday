import { internalMutation, MutationCtx, query } from "./_generated/server";
import { CARD_POOL } from "./cardPool";

/** Loads the pool if this deployment has no cards yet. Called before every deal. */
export async function ensureCardPool(ctx: MutationCtx) {
  const any = await ctx.db.query("cards").first();
  if (any) return;
  for (const c of CARD_POOL) await ctx.db.insert("cards", c);
}

/**
 * Upsert the pool after editing cardPool.ts:
 *   npx convex run cards:seed          (dev)
 *   npx convex run cards:seed --prod   (production)
 * Internal: not callable from the browser.
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    for (const c of CARD_POOL) {
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
    return { total: CARD_POOL.length, inserted };
  },
});

export const all = query({
  args: {},
  handler: async (ctx) => ctx.db.query("cards").collect(),
});
