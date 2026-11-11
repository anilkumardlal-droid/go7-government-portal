# GO7 Government Updates Portal

A responsive, original GO7 government-jobs information portal starter. Desktop content width: 1070px; mobile category panels: two columns; desktop category panels: three columns; page background: #fcfcfc; typography: Source Sans 3.

## Included pages
- Homepage with categories, search, update cards and navigation
- Category listing page (`category.html?category=latest-jobs`)
- Individual update detail page (`detail.html?id=POST_ID`)
- About, Privacy, Disclaimer, Contact, Terms, Admin, and 404 pages
- Sitemap and robots.txt

## Architecture
- Cloudflare Pages serves `public/`
- Cloudflare Worker serves API and scheduled feed sync
- Cloudflare D1 stores sources and published feed metadata

## Deploy frontend
Connect this GitHub repository to Cloudflare Pages. Build command: leave blank. Build output directory: `public`.

## Deploy API
1. Create a Cloudflare D1 database named `go7-gov-db`.
2. Put its database ID into `worker/wrangler.toml` replacing `REPLACE_WITH_D1_DATABASE_ID`.
3. In `worker/`, run `npm install`, `npx wrangler login`, `npx wrangler d1 migrations apply go7-gov-db --remote`.
4. Set secret: `npx wrangler secret put ADMIN_TOKEN` (use a long random secret; never put it in frontend files or GitHub).
5. Deploy: `npx wrangler deploy`.
6. Configure Worker custom domain `api.jobs.go7.in`. Set `public/config.js` API_BASE to `https://api.jobs.go7.in` and commit.
7. Add `jobs.go7.in` as Cloudflare Pages custom domain.

## Admin
Open `/admin.html`, enter the ADMIN_TOKEN, add RSS/Atom feeds that you are authorized to use, assign a category, and run Sync Now. Scheduled sync runs every 30 minutes (UTC).

## Publishing and legal scope
The sync service imports feed metadata (title, short summary, date and original publisher URL). It does not copy complete articles, PDFs, images, or another portal's design/content. Use official department feeds, authorized APIs, or sources whose terms permit this use. Some departments do not offer feeds; they will require manual verification or a separately authorized integration. Automatic publication can contain stale or incomplete feed information, so verify important dates and eligibility against official notices.

## Detail page data limitation
Current D1 schema stores feed metadata only. Detail pages display that metadata and direct users to the original official/publisher notice for complete vacancy tables, fees, age limits, qualification, salary and application instructions. To display structured fields for every recruitment, extend the admin form and D1 schema with verified fields; do not fabricate missing details.

## Security
Keep `ADMIN_TOKEN` only as a Worker secret. Do not commit `.dev.vars` or real credentials. Review source feed URLs and comply with their usage terms.
