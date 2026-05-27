# polar-sys → Cloudflare Pages migration guide

> Hand this file to another assistant working in the **polar-sys** repo (the Vite SPA at https://polar-sys.vercel.app), not the waypoint shell repo.

## Context — why we’re moving

- polar-sys is currently deployed on **Vercel Hobby**.
- It’s embedded in an iframe by the waypoint shell at https://polar-sys-waypoint.vercel.app.
- Vercel’s free-tier **System Mitigations** (platform DDoS / JA4 fingerprinting) is returning `403 Forbidden` with `x-vercel-mitigated: deny` on a percentage of iframe loads. There is no Hobby toggle that fixes this; Pro is required for JA4 allow rules.
- Deployment Protection is **already off** on polar-sys (Vercel Authentication, Password Protection, Trusted IPs all disabled). So the bypass-token / cookie route is not applicable.
- Cloudflare Pages’ free tier doesn’t apply automatic mitigation to Pages projects, has clean iframe behavior by default, and supports a `_headers` file for CSP. polar-sys is a static Vite SPA so it’s a drop-in target.

## Goal

Deploy polar-sys to **`https://polar-sys.pages.dev`** (or a custom domain), keep the same hash routes (`#/anomaly`, `#/monitor`, `#/incident`), and make iframing from the waypoint shell return `200` reliably.

## Prerequisites

- polar-sys repo on GitHub.
- A Cloudflare account (free).
- Vercel deployment can stay live during migration so you can compare side by side. Remove later.

## Step 1 — Repo changes (in polar-sys)

All of these are one-line drops into the existing repo. Don’t change build tooling.

### a. SPA fallback for hash deep links

Create `public/_redirects` (Cloudflare Pages reads it from the build output):

```
/*    /index.html   200
```

Without this, hard refreshes on `#/incident` etc. work because hash routing is purely client-side, but if anyone ever requests a non-root path it 404s. The redirect serves `index.html` so the SPA can boot and the hash router takes over.

### b. CSP allowing the waypoint shell to embed (optional, recommended)

Create `public/_headers`:

```
/*
  Content-Security-Policy: frame-ancestors 'self' https://polar-sys-waypoint.vercel.app https://*.vercel.app http://localhost:5173 http://localhost:5174;
```

- `'self'` — polar-sys can iframe itself.
- `https://polar-sys-waypoint.vercel.app` — production waypoint shell.
- `https://*.vercel.app` — covers preview URLs of the waypoint shell. Drop this if you don’t want to allow previews.
- The two `localhost` entries cover dev runs of the waypoint shell. Drop if not needed.

If you don’t add this file, iframing just works (Cloudflare Pages doesn’t set `X-Frame-Options` by default). The `_headers` file only matters if you want to **lock down** who can embed.

### c. Don’t set `X-Frame-Options` anywhere

Make sure no framework default, no middleware, no `vercel.json` is sending `X-Frame-Options: DENY` or `SAMEORIGIN`. Older browsers honor that over `frame-ancestors` and the iframe stays blank. Cloudflare Pages doesn’t add it on its own — the only way it appears is if the polar-sys app sets it.

### d. (Optional) Keep or remove `vercel.json`

- **Keep it** during the migration so the Vercel deployment still serves; you can compare. The Vercel-specific CSP block in `vercel.json` keeps working there.
- **Remove it** once Cloudflare Pages is validated and the Vercel project is decommissioned.

## Step 2 — Create the Cloudflare Pages project

1. Go to **Cloudflare Dashboard → Workers & Pages → Pages → Create application → Connect to Git**.
2. Authorize Cloudflare on GitHub if prompted, pick the **polar-sys** repo.
3. Set production branch (usually `main`).
4. **Framework preset:** Vite (or “None” if you want to set commands manually).
5. **Build command:** `npm run build` (or whatever polar-sys uses today — check its `package.json`).
6. **Build output directory:** `dist`.
7. **Environment variables:** none required for the bundle. Add `NODE_VERSION` if the build needs a specific Node (e.g. `20.17.0` to match `.nvmrc`).
8. **Save and Deploy.** First build takes ~1–2 minutes.

The deployment lands at `https://polar-sys.pages.dev`. You can rename the project (Pages → project → Settings) for a different subdomain, e.g. `https://polar-sys-app.pages.dev`.

## Step 3 — Verify

Run these checks before telling the waypoint side to switch.

1. **Direct load.** Open `https://polar-sys.pages.dev/#/anomaly` in a normal tab. The full polar UI should render. Same for `#/monitor` and `#/incident`.
2. **Hard refresh.** Refresh on `#/monitor`. Should still render (proves `_redirects` is in place).
3. **Headers from CLI.**
   ```bash
   curl -I https://polar-sys.pages.dev/
   ```
   Expect: `HTTP/2 200`, **no** `x-vercel-*` headers, and (if you added `_headers`) `content-security-policy: frame-ancestors …`. Make sure there is **no** `x-frame-options` line.
4. **Iframe smoke test.** In a temporary HTML file:
   ```html
   <iframe src="https://polar-sys.pages.dev/#/incident" width="1280" height="720"></iframe>
   ```
   Open it from `http://localhost:<port>` (or any small static server). Frame should render. If it doesn’t, open DevTools → Console; any `frame-ancestors` violation message tells you exactly which origin is missing from the CSP list.

## Step 4 — Tell the waypoint side

Once verified, the waypoint shell only needs the new URL:

> Set `VITE_POLAR_SYS_ORIGIN=https://polar-sys.pages.dev` (no trailing slash) on the **polar-sys-waypoint** Vercel project, environments **Production** (and **Preview** if you want previews to embed). Redeploy. No code change required.

Or, if you want it baked in permanently in waypoint code, change `POLAR_SYS_DEFAULT_BASE` in `src/polarSysUrl.ts` to the new URL.

## Step 5 — (Optional) Custom domain

Cloudflare Pages → project → **Custom domains → Set up a custom domain**. If the domain is on Cloudflare DNS, it’s one-click; otherwise add the CNAME they show. After it’s active, update `VITE_POLAR_SYS_ORIGIN` on the waypoint project to the custom domain.

## Step 6 — Decommission Vercel polar-sys

Once Cloudflare Pages has been stable for a few days:

1. Update or delete `vercel.json` in polar-sys.
2. In the Vercel dashboard, **Settings → Advanced → Delete Project** for the polar-sys project, or just **Pause Deployments** if you want to keep the option to roll back.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `404` on hash deep link refresh | `_redirects` not in `public/` | Move file to `public/_redirects` so Vite copies it to `dist/`. |
| Build fails on Cloudflare | Wrong Node version | Add `NODE_VERSION` env var matching polar-sys’s `.nvmrc` (e.g. `20.17.0`). |
| Iframe blank, console says `frame-ancestors` | Waypoint origin not in CSP list | Add it to `public/_headers`. Re-deploy (any push to `main`). |
| Iframe blank, console says `X-Frame-Options` | Some app code is setting it | Find and remove (`grep -r "X-Frame-Options" src/`); Pages itself doesn’t set it. |
| `403` from Cloudflare | Project-level Bot Fight Mode is on | Cloudflare → Pages project → Settings → Functions / Security → disable Bot Fight Mode for this project. |

## Differences from Vercel that matter for polar-sys

- **No `vercel.json`** — Cloudflare uses `public/_headers` and `public/_redirects` instead. Same idea, simpler syntax, lives in the build output.
- **No managed firewall on Pages free tier** — that’s the whole point of moving.
- **Deploys are per-branch by default** — every PR gets a preview URL like `<commit>.polar-sys.pages.dev`. If you want CSP to allow these in waypoint previews, use `https://*.pages.dev` in `frame-ancestors`.
- **No serverless functions needed** — polar-sys is fully static, so we’re not migrating any Vercel functions or middleware. If polar-sys ever grows server-side logic, Cloudflare Pages Functions or Workers is the next step.

---

When done, the only artifact the waypoint side cares about is: **the URL**. Drop it in the chat and the waypoint maintainer flips one env var.
