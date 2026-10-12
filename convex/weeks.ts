import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireMember, currentWeek, INTERESTS } from "./lib";

const WEEK_MS = 7 * 24 * 3600 * 1000;

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 6 candidates: 2 from each of the squad's 3 interests (each pair has 2 different types).
// Older squads without interests fall back to the top 3 member interests.
async function dealCards(ctx: MutationCtx, squadId: Id<"squads">) {
  const squad = await ctx.db.get(squadId);
  let top: string[] = (squad?.interests ?? []).filter((i) => (INTERESTS as readonly string[]).includes(i)).slice(0, 3);
  if (top.length === 0) {
    const ms = await ctx.db.query("memberships").withIndex("by_squad", (q) => q.eq("squadId", squadId)).collect();
    const counts = new Map<string, number>();
    for (const m of ms) {
      const u = await ctx.db.get(m.userId);
      for (const i of u?.interests ?? []) counts.set(i, (counts.get(i) ?? 0) + 1);
    }
    top = [...INTERESTS]
      .map((i, idx) => ({ i, n: counts.get(i) ?? 0, idx }))
      .sort((a, b) => b.n - a.n || a.idx - b.idx)
      .filter((r) => r.n > 0)
      .slice(0, 3)
      .map((r) => r.i);
  }
  const rest = shuffle(INTERESTS.filter((i) => !top.includes(i)));
  while (top.length < 3 && rest.length) top.push(rest.shift()!);

  const allCards = await ctx.db.query("cards").collect();
  const picked: Doc<"cards">[] = [];
  const pool = [...top, ...rest];
  for (const interest of pool) {
    if (picked.length >= 6) break;
    const cs = shuffle(allCards.filter((c) => c.interest === interest && !picked.includes(c)));
    if (cs.length === 0) continue;
    const first = cs[0];
    const second = cs.find((c) => c.type !== first.type) ?? cs[1];
    picked.push(first);
    if (second && picked.length < 6) picked.push(second);
  }
  return shuffle(picked).slice(0, 6);
}

// Creates a drafting week (with 6 candidates) if the squad has no week or its last week is done.
export const ensureDraft = mutation({
  args: { squadId: v.id("squads") },
  handler: async (ctx, { squadId }) => {
    const { squad } = await requireMember(ctx, squadId);
    const cur = await currentWeek(ctx, squadId);
    if (cur && cur.status !== "done") return cur._id;
    const now = Date.now();
    const weekId = await ctx.db.insert("weeks", {
      squadId: squad._id,
      weekNo: (cur?.weekNo ?? 0) + 1,
      status: "drafting",
      startsAt: now,
      endsAt: now + WEEK_MS,
    });
    const dealt = await dealCards(ctx, squadId);
    if (dealt.length < 3) throw new Error("Card pool is empty. Run the seed.");
    for (let i = 0; i < dealt.length; i++) {
      await ctx.db.insert("candidates", { weekId, cardKey: dealt[i].key, dealOrder: i });
    }
    return weekId;
  },
});

// Creator can redeal while drafting and nobody has voted yet.
export const redeal = mutation({
  args: { weekId: v.id("weeks") },
  handler: async (ctx, { weekId }) => {
    const week = await ctx.db.get(weekId);
    if (!week) throw new Error("Week missing");
    const { isCreator } = await requireMember(ctx, week.squadId);
    if (!isCreator) throw new Error("Only the creator can redeal");
    if (week.status !== "drafting") throw new Error("Not drafting");
    const anyVote = await ctx.db.query("votes").withIndex("by_week_user", (q) => q.eq("weekId", weekId)).first();
    if (anyVote) throw new Error("Votes are in; can't redeal");
    const old = await ctx.db.query("candidates").withIndex("by_week", (q) => q.eq("weekId", weekId)).collect();
    for (const c of old) await ctx.db.delete(c._id);
    const dealt = await dealCards(ctx, week.squadId);
    for (let i = 0; i < dealt.length; i++) {
      await ctx.db.insert("candidates", { weekId, cardKey: dealt[i].key, dealOrder: i });
    }
  },
});

export async function optedInUserIds(ctx: QueryCtx | MutationCtx, weekId: Id<"weeks">) {
  const ids = new Set<Id<"users">>();
  const votes = await ctx.db.query("votes").withIndex("by_week_user", (q) => q.eq("weekId", weekId)).collect();
  for (const vv of votes) ids.add(vv.userId);
  const forfeits = await ctx.db.query("forfeits").withIndex("by_week", (q) => q.eq("weekId", weekId)).collect();
  for (const f of forfeits) ids.add(f.authorId);
  return ids;
}

export const draft = query({
  args: { squadId: v.id("squads") },
  handler: async (ctx, { squadId }) => {
    const { user, squad, isCreator } = await requireMember(ctx, squadId);
    const week = await currentWeek(ctx, squadId);
    if (!week) return { week: null };
    const cands = await ctx.db.query("candidates").withIndex("by_week", (q) => q.eq("weekId", week._id)).collect();
    cands.sort((a, b) => a.dealOrder - b.dealOrder);
    const myVotes = await ctx.db
      .query("votes")
      .withIndex("by_week_user", (q) => q.eq("weekId", week._id).eq("userId", user._id))
      .collect();
    const myVoteByCand = new Map(myVotes.map((vv) => [vv.candidateId, vv.yes]));
    const candidates = [];
    for (const c of cands) {
      const card = await ctx.db.query("cards").withIndex("by_key", (q) => q.eq("key", c.cardKey)).unique();
      const allVotes = await ctx.db.query("votes").withIndex("by_candidate", (q) => q.eq("candidateId", c._id)).collect();
      candidates.push({
        _id: c._id,
        dealOrder: c.dealOrder,
        card,
        myVote: myVoteByCand.has(c._id) ? myVoteByCand.get(c._id)! : null,
        yesCount: allVotes.filter((vv) => vv.yes).length,
      });
    }
    const ms = await ctx.db.query("memberships").withIndex("by_squad", (q) => q.eq("squadId", squadId)).collect();
    const opted = await optedInUserIds(ctx, week._id);
    const myForfeit = await ctx.db
      .query("forfeits")
      .withIndex("by_week_author", (q) => q.eq("weekId", week._id).eq("authorId", user._id))
      .unique();
    return {
      week: { _id: week._id, weekNo: week.weekNo, status: week.status },
      candidates,
      votedCount: opted.size,
      memberCount: ms.length,
      myForfeit: myForfeit?.text ?? "",
      isCreator,
      canRedeal: isCreator && opted.size === 0,
      squadName: squad.name,
      inviteCode: squad.inviteCode,
    };
  },
});

export const vote = mutation({
  args: { candidateId: v.id("candidates"), yes: v.boolean() },
  handler: async (ctx, { candidateId, yes }) => {
    const cand = await ctx.db.get(candidateId);
    if (!cand) throw new Error("Candidate missing");
    const week = await ctx.db.get(cand.weekId);
    if (!week || week.status !== "drafting") throw new Error("Voting is closed");
    const { user } = await requireMember(ctx, week.squadId);
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_week_user", (q) => q.eq("weekId", week._id).eq("userId", user._id))
      .filter((q) => q.eq(q.field("candidateId"), candidateId))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { yes });
    else await ctx.db.insert("votes", { weekId: week._id, candidateId, userId: user._id, yes });
  },
});

// Also the late opt-in path during a live week.
export const setForfeit = mutation({
  args: { weekId: v.id("weeks"), text: v.string() },
  handler: async (ctx, { weekId, text }) => {
    const week = await ctx.db.get(weekId);
    if (!week) throw new Error("Week missing");
    if (week.status === "done") throw new Error("Week is over");
    const { user } = await requireMember(ctx, week.squadId);
    const clean = text.trim().slice(0, 140);
    if (!clean) throw new Error("Write a forfeit");
    const existing = await ctx.db
      .query("forfeits")
      .withIndex("by_week_author", (q) => q.eq("weekId", weekId).eq("authorId", user._id))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { text: clean });
    else await ctx.db.insert("forfeits", { weekId, authorId: user._id, text: clean });
  },
});

export const lock = mutation({
  args: { weekId: v.id("weeks") },
  handler: async (ctx, { weekId }) => {
    const week = await ctx.db.get(weekId);
    if (!week) throw new Error("Week missing");
    const { isCreator } = await requireMember(ctx, week.squadId);
    if (!isCreator) throw new Error("Only the creator can lock");
    if (week.status !== "drafting") throw new Error("Not drafting");
    const cands = await ctx.db.query("candidates").withIndex("by_week", (q) => q.eq("weekId", weekId)).collect();
    const scored = [];
    for (const c of cands) {
      const vs = await ctx.db.query("votes").withIndex("by_candidate", (q) => q.eq("candidateId", c._id)).collect();
      scored.push({ c, yes: vs.filter((vv) => vv.yes).length });
    }
    scored.sort((a, b) => b.yes - a.yes || a.c.dealOrder - b.c.dealOrder);
    const top3 = scored.slice(0, 3);
    if (top3.length < 3) throw new Error("Need 3 candidates");
    for (let i = 0; i < 3; i++) {
      await ctx.db.insert("weekCards", { weekId, cardKey: top3[i].c.cardKey, rank: i });
    }
    await ctx.db.patch(weekId, { status: "live" });
  },
});

export const endWeek = mutation({
  args: { weekId: v.id("weeks") },
  handler: async (ctx, { weekId }) => {
    const week = await ctx.db.get(weekId);
    if (!week) throw new Error("Week missing");
    const { isCreator } = await requireMember(ctx, week.squadId);
    if (!isCreator) throw new Error("Only the creator can end the week");
    if (week.status !== "live") throw new Error("Week is not live");

    const weekCards = await ctx.db.query("weekCards").withIndex("by_week", (q) => q.eq("weekId", weekId)).collect();
    const opted = await optedInUserIds(ctx, weekId);
    const stats = new Map<Id<"users">, { points: number; done: number; lastAt: number }>();
    for (const uid of opted) stats.set(uid, { points: 0, done: 0, lastAt: 0 });

    let totalSubs = 0;
    for (const wc of weekCards) {
      const card = await ctx.db.query("cards").withIndex("by_key", (q) => q.eq("key", wc.cardKey)).unique();
      const subs = await ctx.db.query("submissions").withIndex("by_weekCard", (q) => q.eq("weekCardId", wc._id)).collect();
      subs.sort((a, b) => a.createdAt - b.createdAt);
      subs.forEach((s, idx) => {
        totalSubs++;
        const st = stats.get(s.userId) ?? { points: 0, done: 0, lastAt: 0 };
        st.points += (card?.points ?? 0) + (idx === 0 ? 1 : 0);
        st.done += 1;
        st.lastAt = Math.max(st.lastAt, s.createdAt);
        stats.set(s.userId, st);
      });
    }

    const standings = [...stats.entries()].map(([userId, s]) => ({ userId, ...s }));
    standings.sort((a, b) => b.points - a.points || a.lastAt - b.lastAt);

    let crownUserId: Id<"users"> | undefined;
    let loserUserId: Id<"users"> | undefined;
    let forfeitId: Id<"forfeits"> | undefined;
    let coinFlip: boolean | undefined;
    const optedList = [...opted];
    const cleanSweep =
      optedList.length > 0 && optedList.every((uid) => (stats.get(uid)?.done ?? 0) >= weekCards.length);

    if (totalSubs > 0) {
      crownUserId = standings[0]?.userId;
      if (!cleanSweep && optedList.length > 0) {
        const optedStandings = standings.filter((s) => opted.has(s.userId));
        const minPts = Math.min(...optedStandings.map((s) => s.points));
        const tied = optedStandings.filter((s) => s.points === minPts);
        coinFlip = tied.length > 1;
        loserUserId = tied[Math.floor(Math.random() * tied.length)].userId;
        const forfeits = await ctx.db.query("forfeits").withIndex("by_week", (q) => q.eq("weekId", weekId)).collect();
        if (forfeits.length) forfeitId = forfeits[Math.floor(Math.random() * forfeits.length)]._id;
      }
    }

    await ctx.db.insert("results", { weekId, crownUserId, loserUserId, forfeitId, cleanSweep, coinFlip, standings });
    await ctx.db.patch(weekId, { status: "done", endsAt: Date.now() });
  },
});

export const recap = query({
  args: { squadId: v.id("squads") },
  handler: async (ctx, { squadId }) => {
    const { squad } = await requireMember(ctx, squadId);
    const weeks = await ctx.db.query("weeks").withIndex("by_squad", (q) => q.eq("squadId", squadId)).order("desc").collect();
    const week = weeks.find((w) => w.status === "done");
    if (!week) return null;
    const result = await ctx.db.query("results").withIndex("by_week", (q) => q.eq("weekId", week._id)).unique();
    if (!result) return null;
    const name = async (id?: Id<"users">) => (id ? ((await ctx.db.get(id))?.name ?? "?") : null);
    const standings = [];
    for (const s of result.standings) {
      standings.push({ ...s, name: (await ctx.db.get(s.userId))?.name ?? "?" });
    }
    const opted = await optedInUserIds(ctx, week._id);
    const weekCards = await ctx.db.query("weekCards").withIndex("by_week", (q) => q.eq("weekId", week._id)).collect();
    let crownPhotoUrl: string | null = null;
    if (result.crownUserId) {
      const subs = await ctx.db
        .query("submissions")
        .withIndex("by_week_user", (q) => q.eq("weekId", week._id).eq("userId", result.crownUserId!))
        .collect();
      subs.sort((a, b) => b.createdAt - a.createdAt);
      if (subs[0]) crownPhotoUrl = await ctx.storage.getUrl(subs[0].storageId);
    }
    const forfeit = result.forfeitId ? await ctx.db.get(result.forfeitId) : null;
    const totalDone = standings.reduce((n, s) => n + s.done, 0);
    return {
      squadName: squad.name,
      weekNo: week.weekNo,
      optedIn: opted.size,
      cardCount: weekCards.length,
      totalDone,
      crown: result.crownUserId ? { userId: result.crownUserId, name: await name(result.crownUserId), photoUrl: crownPhotoUrl } : null,
      loser: result.loserUserId ? { userId: result.loserUserId, name: await name(result.loserUserId) } : null,
      coinFlip: !!result.coinFlip,
      cleanSweep: result.cleanSweep,
      forfeit: forfeit ? { text: forfeit.text, authorName: await name(forfeit.authorId) } : null,
      standings,
    };
  },
});
