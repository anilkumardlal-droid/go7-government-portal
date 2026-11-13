# Jobs GO7 Government Portal

Responsive independent information portal for government jobs, results, admit cards, answer keys and education notices.

## Structure
- `public/` — Cloudflare Pages website.
- `worker/` — Cloudflare Worker API and D1 migrations.
- Homepage loads up to 10 latest posts in each category directly from the API.
- Category routes use clean paths such as `/latest-jobs/` and `/results/`.
- Post permalinks use title slugs such as `/rrb-ntpc-inter-level-07-2026/`.
- Old `/category/<slug>/` paths redirect to the corresponding root category route.
- D1 is additive: migration `0005_post_slugs.sql` adds a slug column and unique index. Existing post rows are retained; slugs are assigned lazily as posts are listed.

## Local website preview (PowerShell)
From the project root:
```powershell
npx.cmd http-server .\public -p 8080
```
Open `http://127.0.0.1:8080/index.html`. Keep the PowerShell window open while testing. The Worker CORS code explicitly permits local preview origins on port 8080.

For local Worker development, use a separate terminal:
```powershell
cd worker
npm ci
npx.cmd wrangler dev
```
Do not run local Worker against production D1 unless you intentionally configure remote bindings.

## Safe deployment order
Do not deploy until the local Pages preview and API checks pass.
1. Back up the current Cloudflare Pages deployment and confirm Worker/D1 bindings.
2. From `worker/`, apply pending additive migrations:
   `npx.cmd wrangler d1 migrations apply go7-gov-db --remote`
3. Deploy the Worker:
   `npx.cmd wrangler deploy`
4. Deploy only the `public/` directory to the existing Pages project `go7-government-portal` as listed in Cloudflare.
5. Verify homepage category cards, category paths, slug details, old category redirects, admin login and scheduled feed sync.

The migration adds a nullable slug field and index; it does not delete, reset or replace existing posts. Keep `ADMIN_TOKEN` in Cloudflare Worker secrets; never add it to this repository or ZIP.
