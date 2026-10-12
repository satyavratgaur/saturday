import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser, requireMember, inviteCode, normalizeChatUrl, currentWeek, INTERESTS } from "./lib";

const platformV = v.union(
  v.literal("whatsapp"),
  v.literal("telegram"),
  v.literal("discord"),
  v.literal("imessage"),
);

function cleanInterests(raw: string[]) {
  const uniq = Array.from(new Set(raw));
  if (uniq.length !== 3) throw new Error("Pick 3 things your squad is into");
  for (const i of uniq) if (!(INTERESTS as readonly string[]).includes(i)) throw new Error("Unknown interest " + i);
  return uniq;
}

async function checkChatUrl(ctx: QueryCtx, raw: string | undefined, selfId?: Id<"squads">) {
  const chatUrl = normalizeChatUrl(raw);
  if (!chatUrl) return undefined;
  const dupe = await ctx.db
    .query("squads")
    .withIndex("by_chatUrl", (q) => q.eq("chatUrl", chatUrl))
    .unique();
  if (dupe && dupe._id !== selfId) throw new Error("That chat already has a squad. Ask for its invite link.");
  return chatUrl;
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const ms = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const out = [];
    for (const m of ms) {
      const s = await ctx.db.get(m.squadId);
      if (!s) continue;
      const members = await ctx.db
        .query("memberships")
        .withIndex("by_squad", (q) => q.eq("squadId", s._id))
        .collect();
      const week = await currentWeek(ctx, s._id);
      out.push({
        _id: s._id,
        name: s.name,
        chatPlatform: s.chatPlatform ?? null,
        interests: s.interests ?? [],
        memberCount: members.length,
        isCreator: s.creatorId === user._id,
        weekStatus: week?.status ?? "none",
        weekNo: week?.weekNo ?? 0,
      });
    }
    return out;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    interests: v.array(v.string()),
    chatPlatform: v.optional(platformV),
    chatUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user.onboarded) throw new Error("Finish onboarding first");
    const name = args.name.trim().slice(0, 40);
    if (!name) throw new Error("Squad needs a name");
    const interests = cleanInterests(args.interests);
    const chatUrl = args.chatPlatform && args.chatPlatform !== "imessage" ? await checkChatUrl(ctx, args.chatUrl) : undefined;
    let code = inviteCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query("squads")
        .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
        .unique();
      if (!clash) break;
      code = inviteCode();
    }
    const squadId = await ctx.db.insert("squads", {
      name,
      creatorId: user._id,
      inviteCode: code,
      chatPlatform: args.chatPlatform,
      chatUrl,
      interests,
    });
    await ctx.db.insert("memberships", { squadId, userId: user._id, joinedAt: Date.now() });
    return { squadId, inviteCode: code };
  },
});

// Creator can link (or change) the group chat later.
export const setChat = mutation({
  args: { squadId: v.id("squads"), chatPlatform: v.optional(platformV), chatUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { squad, isCreator } = await requireMember(ctx, args.squadId);
    if (!isCreator) throw new Error("Only the creator can change the chat link");
    const chatUrl =
      args.chatPlatform && args.chatPlatform !== "imessage" ? await checkChatUrl(ctx, args.chatUrl, squad._id) : undefined;
    await ctx.db.patch(squad._id, { chatPlatform: args.chatPlatform, chatUrl });
  },
});

/**
 * PUBLIC (no auth): what an invitee sees before signing in.
 * Squad name, first names, this week's cards and progress. Never photo URLs.
 */
export const preview = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const s = await ctx.db
      .query("squads")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code.trim().toUpperCase()))
      .unique();
    if (!s) return null;
    const ms = await ctx.db
      .query("memberships")
      .withIndex("by_squad", (q) => q.eq("squadId", s._id))
      .collect();
    const viewerId = await getAuthUserId(ctx);
    const members: string[] = [];
    for (const m of ms.slice(0, 15)) {
      const u = await ctx.db.get(m.userId);
      members.push((u?.name ?? "?").split(" ")[0]);
    }
    const creator = await ctx.db.get(s.creatorId);
    const week = await currentWeek(ctx, s._id);
    const cards: { key: string; type: "everyday" | "stretch" | "wildcard"; name: string; blurb: string; proof: string; points: number; interest: string; doneCount: number; photoNames: string[] }[] = [];
    if (week && week.status !== "done") {
      if (week.status === "live") {
        const wcs = await ctx.db.query("weekCards").withIndex("by_week", (q) => q.eq("weekId", week._id)).collect();
        wcs.sort((a, b) => a.rank - b.rank);
        for (const wc of wcs) {
          const card = await ctx.db.query("cards").withIndex("by_key", (q) => q.eq("key", wc.cardKey)).unique();
          if (!card) continue;
          const subs = await ctx.db.query("submissions").withIndex("by_weekCard", (q) => q.eq("weekCardId", wc._id)).collect();
          const photoNames = [];
          for (const sub of subs.slice(0, 6)) photoNames.push(((await ctx.db.get(sub.userId))?.name ?? "?").split(" ")[0]);
          cards.push({ ...pickCard(card), doneCount: subs.length, photoNames });
        }
      } else {
        const cands = await ctx.db.query("candidates").withIndex("by_week", (q) => q.eq("weekId", week._id)).collect();
        cands.sort((a, b) => a.dealOrder - b.dealOrder);
        for (const c of cands.slice(0, 3)) {
          const card = await ctx.db.query("cards").withIndex("by_key", (q) => q.eq("key", c.cardKey)).unique();
          if (card) cards.push({ ...pickCard(card), doneCount: 0, photoNames: [] });
        }
      }
    }
    return {
      name: s.name,
      creatorName: (creator?.name ?? "Someone").split(" ")[0],
      memberCount: ms.length,
      members,
      interests: s.interests ?? [],
      chatPlatform: s.chatPlatform ?? null,
      isMember: !!viewerId && ms.some((m) => m.userId === viewerId),
      full: ms.length >= 15,
      week: week ? { weekNo: week.weekNo, status: week.status } : null,
      cards,
    };
  },
});

function pickCard(c: { key: string; type: "everyday" | "stretch" | "wildcard"; name: string; blurb: string; proof: string; points: number; interest: string }) {
  return { key: c.key, type: c.type, name: c.name, blurb: c.blurb, proof: c.proof, points: c.points, interest: c.interest };
}

export const join = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const user = await requireUser(ctx);
    if (!user.onboarded) throw new Error("Finish onboarding first");
    const s = await ctx.db
      .query("squads")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code.trim().toUpperCase()))
      .unique();
    if (!s) throw new Error("Invite code not found");
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_squad_user", (q) => q.eq("squadId", s._id).eq("userId", user._id))
      .unique();
    if (existing) return { squadId: s._id, already: true };
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_squad", (q) => q.eq("squadId", s._id))
      .collect();
    if (members.length >= 15) throw new Error("Squad is full (15)");
    await ctx.db.insert("memberships", { squadId: s._id, userId: user._id, joinedAt: Date.now() });
    return { squadId: s._id, already: false };
  },
});

export const get = query({
  args: { squadId: v.id("squads") },
  handler: async (ctx, { squadId }) => {
    const { user, squad, isCreator } = await requireMember(ctx, squadId);
    const ms = await ctx.db
      .query("memberships")
      .withIndex("by_squad", (q) => q.eq("squadId", squadId))
      .collect();
    const members = [];
    for (const m of ms) {
      const u = await ctx.db.get(m.userId);
      if (u) members.push({ _id: u._id, name: u.name ?? "?" });
    }
    const week = await currentWeek(ctx, squadId);
    return {
      _id: squad._id,
      name: squad.name,
      inviteCode: squad.inviteCode,
      interests: squad.interests ?? [],
      chatPlatform: squad.chatPlatform ?? null,
      chatUrl: squad.chatUrl ? "https://" + squad.chatUrl : null,
      isCreator,
      me: user._id,
      members,
      week: week ? { _id: week._id, weekNo: week.weekNo, status: week.status, endsAt: week.endsAt } : null,
    };
  },
});
