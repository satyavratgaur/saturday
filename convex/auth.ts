import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Email } from "@convex-dev/auth/providers/Email";
import { convexAuth } from "@convex-dev/auth/server";

// 6-digit email code. Works in WhatsApp's in-app browser and in the native iOS app
// (no deep links). Sender must be on a domain verified in Resend (saturday.place).
const EmailCode = Email({
  id: "resend-otp",
  maxAge: 15 * 60,
  async generateVerificationToken() {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return String(buf[0] % 1_000_000).padStart(6, "0");
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const key = process.env.AUTH_RESEND_KEY;
    if (!key) throw new Error("AUTH_RESEND_KEY is not set");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL_FROM ?? "Saturday <onboarding@resend.dev>",
        to: [email],
        subject: `${token} is your Saturday code`,
        text: `Your Saturday sign-in code is ${token}\n\nIt expires in 15 minutes. If you didn't ask for it, ignore this email.`,
        html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;background:#FFF4E6;padding:32px;border-radius:24px;max-width:420px">
<p style="margin:0;font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:#6B5E55">Saturday</p>
<p style="margin:12px 0 4px;font-size:16px;color:#1F1A17">Your sign-in code</p>
<p style="margin:0;font-size:40px;font-weight:800;letter-spacing:.2em;color:#1F1A17">${token}</p>
<p style="margin:16px 0 0;font-size:13px;color:#6B5E55">Expires in 15 minutes. Didn't ask for it? Ignore this email.</p></div>`,
      }),
    });
    if (!res.ok) throw new Error("Could not send the code: " + (await res.text()).slice(0, 200));
  },
});

// Guest sign-in stays available server-side as an emergency fallback; the web UI
// only shows it when NEXT_PUBLIC_ALLOW_GUEST=1.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [EmailCode, Anonymous],
});
