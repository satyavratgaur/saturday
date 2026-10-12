import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // ours
    interests: v.optional(v.array(v.string())),
    onboarded: v.optional(v.boolean()),
    avatarStorageId: v.optional(v.id("_storage")),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  squads: defineTable({
    name: v.string(),
    creatorId: v.id("users"),
    inviteCode: v.string(),
    chatPlatform: v.optional(
      v.union(v.literal("whatsapp"), v.literal("telegram"), v.literal("discord"), v.literal("imessage")),
    ),
    chatUrl: v.optional(v.string()),
    // The squad's 3 interests drive the weekly deal. Older squads fall back to member interests.
    interests: v.optional(v.array(v.string())),
  })
    .index("by_inviteCode", ["inviteCode"])
    .index("by_chatUrl", ["chatUrl"]),

  memberships: defineTable({
    squadId: v.id("squads"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_squad", ["squadId"])
    .index("by_user", ["userId"])
    .index("by_squad_user", ["squadId", "userId"]),

  cards: defineTable({
    key: v.string(),
    interest: v.string(),
    type: v.union(v.literal("everyday"), v.literal("stretch"), v.literal("wildcard")),
    name: v.string(),
    blurb: v.string(),
    proof: v.string(),
    points: v.number(),
  }).index("by_key", ["key"]),

  weeks: defineTable({
    squadId: v.id("squads"),
    weekNo: v.number(),
    status: v.union(v.literal("drafting"), v.literal("live"), v.literal("done")),
    startsAt: v.number(),
    endsAt: v.number(),
  }).index("by_squad", ["squadId"]),

  candidates: defineTable({
    weekId: v.id("weeks"),
    cardKey: v.string(),
    dealOrder: v.number(),
  }).index("by_week", ["weekId"]),

  votes: defineTable({
    weekId: v.id("weeks"),
    candidateId: v.id("candidates"),
    userId: v.id("users"),
    yes: v.boolean(),
  })
    .index("by_candidate", ["candidateId"])
    .index("by_week_user", ["weekId", "userId"]),

  weekCards: defineTable({
    weekId: v.id("weeks"),
    cardKey: v.string(),
    rank: v.number(),
  }).index("by_week", ["weekId"]),

  forfeits: defineTable({
    weekId: v.id("weeks"),
    authorId: v.id("users"),
    text: v.string(),
  })
    .index("by_week", ["weekId"])
    .index("by_week_author", ["weekId", "authorId"]),

  submissions: defineTable({
    weekId: v.id("weeks"),
    weekCardId: v.id("weekCards"),
    userId: v.id("users"),
    storageId: v.id("_storage"),
    createdAt: v.number(),
  })
    .index("by_weekCard", ["weekCardId"])
    .index("by_week_user", ["weekId", "userId"]),

  results: defineTable({
    weekId: v.id("weeks"),
    crownUserId: v.optional(v.id("users")),
    loserUserId: v.optional(v.id("users")),
    forfeitId: v.optional(v.id("forfeits")),
    cleanSweep: v.boolean(),
    coinFlip: v.optional(v.boolean()),
    standings: v.array(
      v.object({ userId: v.id("users"), points: v.number(), done: v.number(), lastAt: v.number() }),
    ),
  }).index("by_week", ["weekId"]),
});
