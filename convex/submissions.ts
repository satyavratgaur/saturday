import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMember, currentWeek } from "./lib";
import { optedInUserIds } from "./weeks";

export const generateUploadUrl = mutation({
  args: { weekCardId: v.id("weekCards") },
  handler: async (ctx, { weekCardId }) => {
    const wc = await ctx.db.get(weekCardId);
    if (!wc) throw new Error("Card missing");
    const week = await ctx.db.get(wc.weekId);
    if (!week || week.status !== "live") throw new Error("Week is not live");
    const { user } = await requireMember(ctx, week.squadId);
    const opted = await optedInUserIds(ctx, week._id);
    if (!opted.has(user._id)) throw new Error("Opt in first");
    return await ctx.storage.generateUploadUrl();
  },
});

export const submit = mutation({
  args: { weekCardId: v.id("weekCards"), storageId: v.id("_storage") },
  handler: async (ctx, { weekCardId, storageId }) => {
    const wc = await ctx.db.get(weekCardId);
    if (!wc) throw new Error("Card missing");
    const week = await ctx.db.get(wc.weekId);
    if (!week || week.status !== "live") throw new Error("Week is not live");
    const { user } = await requireMember(ctx, week.squadId);
    const opted = await optedInUserIds(ctx, week._id);
    if (!opted.has(user._id)) throw new Error("Opt in first");
    const existing = await ctx.db
      .query("submissions")
      .withIndex("by_weekCard", (q) => q.eq("weekCardId", weekCardId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { storageId, createdAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("submissions", {
      weekId: week._id,
      weekCardId,
      userId: user._id,
      storageId,
      createdAt: Date.now(),
    });
  },
});

export const weekView = query({
  args: { squadId: v.id("squads") },
  handler: async (ctx, { squadId }) => {
    const { user, squad, isCreator } = await requireMember(ctx, squadId);
    const week = await currentWeek(ctx, squadId);
    if (!week) return { week: null, isCreator, squadName: squad.name };
    const opted = await optedInUserIds(ctx, week._id);
    const optedIn = opted.has(user._id);
    const weekCards = await ctx.db.query("weekCards").withIndex("by_week", (q) => q.eq("weekId", week._id)).collect();
    weekCards.sort((a, b) => a.rank - b.rank);
    const cards = [];
    for (const wc of weekCards) {
      const card = await ctx.db.query("cards").withIndex("by_key", (q) => q.eq("key", wc.cardKey)).unique();
      const subs = await ctx.db.query("submissions").withIndex("by_weekCard", (q) => q.eq("weekCardId", wc._id)).collect();
      subs.sort((a, b) => a.createdAt - b.createdAt);
      const mine = subs.find((s) => s.userId === user._id);
      const unlocked = !!mine;
      const photos = [];
      for (const s of subs) {
        const u = await ctx.db.get(s.userId);
        photos.push({
          userId: s.userId,
          name: u?.name ?? "?",
          isMe: s.userId === user._id,
          // Locked photos never leave the server: no URL until you've posted yours.
          url: unlocked || s.userId === user._id ? await ctx.storage.getUrl(s.storageId) : null,
          createdAt: s.createdAt,
          first: s === subs[0],
        });
      }
      cards.push({
        weekCardId: wc._id,
        rank: wc.rank,
        card,
        doneCount: subs.length,
        unlocked,
        photos,
      });
    }
    const myForfeit = await ctx.db
      .query("forfeits")
      .withIndex("by_week_author", (q) => q.eq("weekId", week._id).eq("authorId", user._id))
      .unique();
    return {
      squadName: squad.name,
      chatUrl: squad.chatUrl ? "https://" + squad.chatUrl : null,
      chatPlatform: squad.chatPlatform ?? null,
      inviteCode: squad.inviteCode,
      isCreator,
      me: user._id,
      week: { _id: week._id, weekNo: week.weekNo, status: week.status, endsAt: week.endsAt },
      optedIn,
      optedCount: opted.size,
      myForfeit: myForfeit?.text ?? "",
      cards,
    };
  },
});
