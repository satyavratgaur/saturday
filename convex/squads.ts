import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, requireMember, inviteCode, normalizeChatUrl, currentWeek } from "./lib";

const platformV = v.union(
  v.literal("whatsapp"),
  v.literal("telegram"),
  v.literal("discord"),
  v.literal("imessage"),
);

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
        chatPlatform: s.chatPlatform,
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
  args: { name: v.string(), chatPlatform: platformV, chatUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user.onboarded) throw new Error("Finish onboarding first");
    const name = args.name.trim();
    if (!name) throw new Error("Squad needs a name");
    let chatUrl: string | undefined;
    if (args.chatPlatform !== "imessage") {
      chatUrl = normalizeChatUrl(args.chatUrl);
      if (!chatUrl) throw new Error("Paste the group chat link");
      const dupe = await ctx.db
        .query("squads")
        .withIndex("by_chatUrl", (q) => q.eq("chatUrl", chatUrl))
        .unique();
      if (dupe) throw new Error("That chat already has a squad. Ask for its invite link.");
    }
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
    });
    await ctx.db.insert("memberships", { squadId, userId: user._id, joinedAt: Date.now() });
    return { squadId, inviteCode: code };
  },
});

export const byInvite = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const s = await ctx.db
      .query("squads")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code.toUpperCase()))
      .unique();
    if (!s) return null;
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_squad", (q) => q.eq("squadId", s._id))
      .collect();
    return { _id: s._id, name: s.name, memberCount: members.length, chatPlatform: s.chatPlatform };
  },
});

export const join = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const user = await requireUser(ctx);
    if (!user.onboarded) throw new Error("Finish onboarding first");
    const s = await ctx.db
      .query("squads")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code.toUpperCase()))
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
      if (u) members.push({ _id: u._id, name: u.name ?? "?", interests: u.interests ?? [] });
    }
    const week = await currentWeek(ctx, squadId);
    return {
      _id: squad._id,
      name: squad.name,
      inviteCode: squad.inviteCode,
      chatPlatform: squad.chatPlatform,
      chatUrl: squad.chatUrl ? "https://" + squad.chatUrl : null,
      isCreator,
      me: user._id,
      members,
      week: week ? { _id: week._id, weekNo: week.weekNo, status: week.status, endsAt: week.endsAt } : null,
    };
  },
});
