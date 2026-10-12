import Resend from "@auth/core/providers/resend";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";

// 02:00 FALLBACK: if magic link isn't delivering, set AUTH_MODE=anonymous in
// the Convex dashboard env (or just swap the array below to [Anonymous]).
const useAnonymous = process.env.AUTH_MODE === "anonymous";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: useAnonymous
    ? [Anonymous]
    : [
        Resend({
          from: process.env.AUTH_EMAIL_FROM ?? "Squad Cards <onboarding@resend.dev>",
        }),
        Anonymous,
      ],
});
