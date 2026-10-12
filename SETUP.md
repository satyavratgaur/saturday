# Squad Cards — run this in YOUR terminal (Mac)

cd ~/Documents/Projects/Saturday/app
npm install

# 1. Convex (creates project, writes .env.local, pushes schema + functions, watches files)
npx convex dev
#    ↳ leave this running in its own tab. First run: log in, "create new project", name it squad-cards.

# 2. Convex Auth keys + SITE_URL  (second tab, same folder)
npx @convex-dev/auth
#    ↳ it will ask for the site URL: enter http://localhost:3000 for now.
#    ↳ It sets JWT_PRIVATE_KEY, JWKS, SITE_URL on the dev deployment.

# 3. Magic link: Resend key  → https://resend.com → API Keys → create.
npx convex env set AUTH_RESEND_KEY re_xxxxxxxx
#    Without a verified domain, Resend only delivers to the email on your Resend account.
#    That is fine for tonight: judges use "Continue without email" (Anonymous provider is
#    already wired alongside magic link).
#    02:00 FALLBACK if email is dead:   npx convex env set AUTH_MODE anonymous

# 4. Cards load automatically on the first deal. After editing convex/cardPool.ts:
npm run seed            # dev;  add -- --prod for production

# 5. Run the app
npm run dev
#    open http://localhost:3000 — on a phone on the same wifi: http://<your-mac-ip>:3000
#    (camera capture needs HTTPS on iOS; Safari allows it on localhost only. Use Vercel URL for phones.)

# 6. Deploy (once, early)
npx vercel
#    In Vercel project settings → Environment Variables:
#      NEXT_PUBLIC_CONVEX_URL = value from .env.local
#    Build command override: npx convex deploy --cmd 'npm run build'
#    and set CONVEX_DEPLOY_KEY (Convex dashboard → Settings → Deploy key) in Vercel env.
#    Then on the PROD deployment: npx convex env set SITE_URL https://<your>.vercel.app --prod
#    and re-run `npx @convex-dev/auth --prod` (or copy JWT_PRIVATE_KEY/JWKS/AUTH_RESEND_KEY to prod).
