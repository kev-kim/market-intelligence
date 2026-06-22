# Serving this demo from your portfolio (Next.js monorepo, same-domain subpath)

This app (`web/`) is **fully self-contained**: it imports nothing from `api/`,
`pipeline/`, `config/`, `migrations/`, or `scripts/`, makes **zero backend
calls**, and uses **no browser storage**. All data is generated in-memory by
`lib/fixtures/` and served through `lib/mock-api.ts` (the single boundary you'd
swap for a real FastAPI client later). So you only need to copy this one folder
into your portfolio — nothing else from this repo.

The chosen setup is **isolated app + same-domain subpath** (e.g.
`yoursite.com/kci`), which is exactly Next.js's **Multi-Zones** pattern: keep
this as its own deployable app under `basePath`, and have your portfolio's main
app `rewrite` the path prefix to it. No Tailwind/theme/provider/alias collisions.

## 1. Add it to the workspace

Move the folder in and register it as a workspace package:

```
your-portfolio/
  apps/
    portfolio/        # your existing main app
    kci-demo/         # <- this web/ folder, copied in
  package.json        # root
```

Root `package.json` (npm/yarn workspaces):

```jsonc
{
  "workspaces": ["apps/*"]   // or add "apps/kci-demo" explicitly
}
```

Then `npm install` (or `yarn`) at the root. This app pins its own deps
(`next`, `react`, `recharts`, radix, etc.) in `apps/kci-demo/package.json`, so
it won't disturb your portfolio's versions.

## 2. basePath is already wired (env-driven)

`next.config.js` here reads `NEXT_PUBLIC_BASE_PATH`:

- **Local dev** (`npm run dev`, no env) → serves at `/` as before.
- **Production** → set `NEXT_PUBLIC_BASE_PATH=/kci` so every route, `<Link>`,
  router navigation, and `/_next` asset is namespaced under `/kci`. Verified:
  all routes serve under `/kci/*`, the `/` → `/dashboard` redirect is
  basePath-aware (config `redirects()`, not the SSR `redirect()` which is not),
  and assets resolve at `/kci/_next/...`.

Deploy `apps/kci-demo` as **its own target** (e.g. a separate Vercel project, or
a second build in your pipeline) with that env var set. Note its public URL,
e.g. `https://kci-demo.vercel.app`.

## 3. Rewrite the prefix from your portfolio (the main app)

In your **portfolio app's** `next.config.js`:

```js
async rewrites() {
  return [
    { source: "/kci", destination: "https://kci-demo.vercel.app/kci" },
    { source: "/kci/:path*", destination: "https://kci-demo.vercel.app/kci/:path*" },
  ]
}
```

Now `yoursite.com/kci` transparently serves this app under your domain. (On
Vercel you can also wire this with native Multi-Zones instead of manual
rewrites — same effect.)

## Notes / optional hardening

- **Single deployment instead?** Two Next apps can't be one build, so the
  subpath requires either the rewrite-to-a-second-deployment above, or merging
  routes into one app (not chosen — it would mean reconciling this app's
  Tailwind CSS-var tokens, `.dark` theme strategy, providers, and `@/*` alias,
  plus nav-within-nav since this demo has its own sidebar/topbar shell).
- **Fonts:** `app/globals.css` imports Pretendard from a CDN (one external
  request). For zero external calls, download Pretendard into the app and
  `@font-face` it locally.
- **Theme:** uses a tiny no-persistence provider (`components/theme-provider.tsx`),
  dark by default — intentionally no `localStorage`.
- **Dead config:** `NEXT_PUBLIC_API_URL` in `next.config.js` is unused today; it
  marks where the real API base would go when `lib/mock-api.ts` is swapped out.
```
