# Squad Cards — 12-hour build plan

Start: Mon 2026-09-21 ~21:30 PT. Target: working web app on a phone by ~09:30 PT.
Deliverable: a URL judges can open on a phone, join a squad, and post a camera photo into.

## What this is

Weekly real-world challenge cards for a friend group that already shares a group chat.
3 cards per week. Post a camera photo to complete a card. You can't see others' photos on a card until you've posted yours.
Most points wins the crown. Fewest points (among opted-in members) draws a forfeit from the pool the squad wrote.

## Cut for the hackathon (do not build)

- Chat. Use an "Open squad chat" deep link to WhatsApp/Telegram/Discord instead.
- AI photo verification. Camera-only capture is the anti-cheat.
- Peer evaluation phase. A submitted photo is completion.
- LLM-generated cards. Seed pool in `cards.json` (40 cards, 5 per interest).
- Leaderboards outside the squad. World/city do not exist.
- Push notifications, hall of fame, immunity pass, difficulty ratchet.

## Stack

- Next.js App Router, all pages client components tonight. No RSC + Convex.
- Convex: db, file storage, reactive queries.
- Convex Auth, magic link within that. FALLBACK: if email isn't delivering by hour 2, switch to Anonymous provider and move on. No data migration needed.
- Tailwind. Card component reuses the design already agreed: type tag, point coin, name, one-liner, proof rule, CTA, "n of m done".
- Deploy: Vercel.

## Locked rules

- Squad = one group chat. 3–15 members. One squad per chat URL, globally.
- Chat platforms: whatsapp | telegram | discord | imessage. iMessage has no URL: manual name, no deep link, no uniqueness check.
- WhatsApp invite page exposes group name via OG metadata: fetch once in a Convex action to pre-fill squad name. Editable. Fail silently.
- App invite is a separate link `/join/<code>` that the creator posts into the chat.
- Week: Saturday 8pm to Saturday 8pm. Tonight: creator taps Lock and End week. No cron.
- Draft: 6 candidates dealt per week. 2 from each of the squad's top 3 interests by member count. Never two of the same type in the 6. If the squad has fewer than 3 interests, fill from remaining interests.
- Vote: each member marks yes/no on each candidate and submits ONE forfeit (free text). Voting = opting in for the week. No vote = spectator: sees cards dimmed with a lock, tap opens the opt-in step.
- Lock: creator taps Lock. Top 3 by yes-count become the week's cards. Ties broken by deal order.
- Points: everyday 3, stretch 4, wildcard 2. +1 for the first person to complete each card.
- Photo: `<input type="file" accept="image/*" capture="environment">`. No camera-roll uploads.
- Gate: on any card where you have not posted, other members' photos render blurred with a lock.
- Live counter on every card: "n of m done", from a reactive query.
- End week: creator taps End week.
  - Crown = most points. Tie → earliest timestamp of last submission.
  - Loser = fewest points among opted-in members. Tie → coin flip, shown.
  - Forfeit = random draw from that week's forfeits. Author of the drawn forfeit gets +1 next week (skip if no time).
  - Clean sweep (every opted-in member completed all 3) → no loser, no forfeit.
  - Zero submissions squad-wide → no crown, no loser (skip the group forfeit tonight).
- Recap: "Squad: n of (3 × opted-in) done" on top, then crown photo, standings, loser + forfeit text. Share as image via html-to-image.

## Convex schema

```
users:        name, interests: string[3], avatarStorageId?
squads:       name, creatorId, inviteCode (unique), chatPlatform, chatUrl? (unique, normalized)
memberships:  squadId, userId, joinedAt          index by squadId, by userId
cards:        key (unique), interest, type, name, blurb, proof, points
weeks:        squadId, weekNo, status: drafting|live|done, startsAt, endsAt
candidates:   weekId, cardKey, dealOrder
votes:        candidateId, userId, yes           index by candidateId, by (weekId,userId)
weekCards:    weekId, cardKey, rank
forfeits:     weekId, authorId, text
submissions:  weekCardId, userId, storageId, createdAt   index by weekCardId
results:      weekId, crownUserId?, loserUserId?, forfeitId?, cleanSweep: bool
```

Opt-in is derived: a user is opted in for a week iff they have ≥1 vote on that week's candidates.

## Screens (build in this order)

1. `/` sign-in → name + pick 3 of 8 interests (Running, Hiking, Gym, Food, Photography, Water, City explore, Social). Once.
2. `/squads` list → Create (platform, chat URL, name prefilled) | Join via `/join/<code>`.
3. `/s/[id]/draft` 6 candidate cards, yes/no each, forfeit text field, "4 of 7 voted", creator sees Lock.
4. `/s/[id]` week screen. 3 cards, scroll not carousel. Tap → camera → upload → your photo. Others blurred until you post. Counter live. "Open squad chat" button. Creator sees End week.
5. `/s/[id]/recap` squad completion, crown, standings, loser + forfeit, Save image.
6. Lock state for non-opted-in on screen 4.

## Hour plan

- 00:00–01:00 create-next-app, convex init, Convex Auth magic link, schema pushed, deploy once (empty) to Vercel so deploy isn't a surprise at hour 11.
- 01:00–02:30 Onboarding, squads create/join, invite code, chat URL + OG name fetch. Card component.
  ⚠ 02:00 checkpoint: magic link delivering? If not, Anonymous provider. Do not debug email past 02:15.
- 02:30–03:30 Seed `cards.json` via a mutation. Deal function (6 candidates by squad interests).
- 03:30–05:30 Draft screen: votes, forfeit field, Lock → top 3 to weekCards.
- 05:30–07:30 Week screen: camera input, `generateUploadUrl` upload, blur gate, live counters, chat deep link.
- 07:30–08:30 End week → results mutation (crown, loser, forfeit draw, clean sweep).
- 08:30–09:30 Recap screen + share image.
- 09:30–10:30 Seed demo squad with the running group's real week-1 photos. Walk the full flow on a phone.
- 10:30–11:15 Figma: deploy, import the 6 screens with the html.to.design plugin. Do NOT design in Figma first.
- 11:15–12:00 Buffer. You will use it.

## Demo script (3 minutes)

1. Judge opens `/join/<code>` on their phone, types a name, picks interests, lands in the seeded squad.
2. Week screen: 3 cards, real photos from the running group blurred behind a lock.
3. Judge taps a card → camera → posts. Blur drops. Counter ticks on every open phone in the room.
4. Creator taps End week → recap with crown, loser, forfeit. Save image.

## If behind at hour 6

Cut in this order: share image → OG name fetch → forfeit pool (hardcode one forfeit) → recap screen (show results as plain text on week screen). Never cut the camera gate.
