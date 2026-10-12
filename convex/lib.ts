import { getAuthUserId } from "@convex-dev/auth/server";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User missing");
  return user;
}

export async function requireMember(ctx: QueryCtx | MutationCtx, squadId: Id<"squads">) {
  const user = await requireUser(ctx);
  const m = await ctx.db
    .query("memberships")
    .withIndex("by_squad_user", (q) => q.eq("squadId", squadId).eq("userId", user._id))
    .unique();
  if (!m) throw new Error("Not a member of this squad");
  const squad = await ctx.db.get(squadId);
  if (!squad) throw new Error("Squad missing");
  return { user, squad, isCreator: squad.creatorId === user._id };
}

export async function currentWeek(ctx: QueryCtx | MutationCtx, squadId: Id<"squads">) {
  const weeks = await ctx.db
    .query("weeks")
    .withIndex("by_squad", (q) => q.eq("squadId", squadId))
    .order("desc")
    .take(1);
  return weeks[0] ?? null;
}

export function normalizeChatUrl(raw: string | undefined) {
  if (!raw) return undefined;
  let s = raw.trim();
  if (!s) return undefined;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    u.hash = "";
    u.search = "";
    let out = (u.host + u.pathname).toLowerCase();
    out = out.replace(/\/+$/, "");
    return out;
  } catch {
    return s.toLowerCase();
  }
}

export const INTERESTS = [
  "running",
  "hiking",
  "gym",
  "food",
  "photography",
  "water",
  "city",
  "social",
] as const;

export function inviteCode(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}
