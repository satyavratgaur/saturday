# Saturday — 12-hour build plan (v2: onboarding fix + vibrant theme + native iOS)

Goal: my real friend group (mostly iPhone, 1–2 Android) playing week 1, with real accounts that survive reinstalls.
Domain: saturday.place. Apple Developer account: active.

## Hour 0 — before any code (non-negotiable)

- `git add -A && git commit -m "Squad Cards hackathon build"` and `git tag hackathon-v1`. Right now only the create-next-app commit exists.
- Start the slow external things first, so they run while you code:
  - Resend: add saturday.place, add the DNS records (propagation takes 15–60 min).
  - Vercel: attach saturday.place.
  - Apple: App ID `place.saturday.app` with the Sign in with Apple capability turned on.
  - App Store Connect: create the app record.

## Auth model

| Where | Primary | Fallback |
|---|---|---|
| iOS | Sign in with Apple (native button) | Email 6-digit code |
| Web / Android | Email 6-digit code | none (guest sign-in removed) |

- Magic link → Convex Auth **email OTP** (Resend, sent from `hi@saturday.place`). A typed code works in WhatsApp's in-app browser and on iOS with no deep links.
- Native Apple → a custom `ConvexCredentials` provider (`apple-native`). The server checks Apple's identity token against Apple's JWKS with `jose` (iss = appleid.apple.com, aud = place.saturday.app), then finds or creates the user, matching on the `sub` claim first and email second.
- **Account-split trap:** Hide My Email gives a relay address, so one person can end up with two accounts. On iOS, the first screen says "Already playing on the web? Use your email code", and the email option sits right under the Apple button. If a newly created Apple user has no squads, show "Joined from a link before? Link your email".
- Swift: a custom `AuthProvider` for ConvexMobile that calls the `auth:signIn` action and stores the token and refresh token in the Keychain. Convex Auth has no official Swift support (convex-swift #8).

## Onboarding v2 (web first, then mirrored in iOS)

1. `/join/<code>` is **public**. It shows the squad name, member avatars, this week's 3 cards, and friends' photos blurred under "Post yours to unlock". A banner explains it in one line: "3 real-world cards a week. Photo or it didn't happen. Results drop Saturday 8pm."
2. CTA "Join {squad}" → email code (web) or Apple (iOS) → **name only** → straight into the week screen.
3. Personal interests are cut from onboarding. The creator picks 3 **squad interests** when creating the squad, and the deal function uses those.
4. `/` with no invite becomes a landing page: a hero, 3 sample cards that flip, how a week works (Draft → Play → Saturday reveal), and "Start a squad".
5. Create squad: name + 3 interest chips. The chat link is optional, and you can add it later from the squad settings.

## Theme: day/night split

- **Day** (Sunday through Saturday 6pm): warm cream `#FFF4E6`, ink `#1F1A17`, card backgrounds Everyday `#2EC27E` / Stretch `#FF6B35` / Wildcard `#E040A0`, sun-yellow coin `#FFD23F`.
- **Night** (Saturday 6pm until Sunday 6am, plus the recap screen always): indigo `#120B2E`, gradient cards Everyday `#00F5A0→#00D9F5` / Stretch `#FF8A00→#FF2E63` / Wildcard `#B44CFF→#FF4CD2`, glowing coin `#FFE600`.
- The tokens live in one file each: `src/lib/theme.ts` for web and `Theme.swift` for iOS, using the same names. Cards are full-bleed colour, not grey boxes.

## Automation (real groups won't remember to tap buttons)

Convex crons:
- Auto-deal the draft Saturday 8pm.
- Auto-lock Sunday 6pm.
- Auto-end the week Saturday 8pm, which produces the recap.

The creator's manual buttons stay as overrides.

## Hour plan

- **00:00–00:30** Commit, tag, DNS, and Apple/App Store Connect setup (see Hour 0).
- **00:30–03:00 Web**
  - Make the join page public.
  - Name-only onboarding.
  - Squad interests.
  - Optional chat link.
  - Email OTP.
  - Day/night theme tokens applied to Card, Button, Screen.
  - Rename everything to Saturday.
  - ⚑ **03:00 checkpoint:** deploy to saturday.place and send the invite to 2 friends for real. They test the web while you build iOS.
- **03:00–04:30 Backend**
  - `apple-native` credentials provider, with users matched by `sub`, then by email.
  - The 3 crons.
  - Change the deal function to use squad interests.
  - ⚑ **04:30 hard cutoff:** if Apple token verification isn't working against a real token, iOS ships with email code only. Do not debug past 04:45.
- **04:30–05:30 iOS skeleton**
  - Xcode project with SwiftUI and ConvexMobile (SPM).
  - The Keychain `AuthProvider`.
  - Sign in with Apple, plus the email-code screen.
  - Name screen.
- **05:30–08:30 iOS core screens**
  - Squads list.
  - **Week screen:** card stack, camera-only capture (`UIImagePickerController`, source `.camera`), upload through `generateUploadUrl`, blur gate, live "n of m" counter via subscribe, haptic on post.
  - Draft vote: yes/no on each card, plus the forfeit field.
- **08:30–09:30 Universal links**
  - Serve `apple-app-site-association` from saturday.place.
  - `/join/<code>` opens the app if it's installed, and falls back to the web page if not.
- **09:30–10:30 TestFlight**
  - Archive and upload.
  - Add friends as internal testers (App Store Connect users), which works the same day.
  - Also submit for external Beta Review, so the public link works within a day or two.
- **10:30–11:00 Recap on iOS:** a read-only night-theme recap, or open the web recap in Safari if time is short.
- **11:00–12:00 Buffer.** You will use it.

## If behind at hour 6, cut in this order

Universal links → iOS recap (link to web) → iOS draft (link to web) → Apple sign-in (email code only).

**Never cut:** the public invite page, email OTP, and the iOS week screen with the camera gate.

## Not this round

- Push notifications. APNs needs HTTP/2 from a Node action; this is the first thing for v3, a "Saturday reveal" push.
- Android native.
- AI verification.
- Chat.
