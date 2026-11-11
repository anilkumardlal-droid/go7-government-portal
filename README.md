# GO7 Government Portal — starter project

Chosen configuration:
- Public site: `https://jobs.go7.in`
- API: `https://api.jobs.go7.in`
- Language: English
- Publishing: automatic for configured RSS/Atom feeds
- Hosting: Cloudflare Pages (static site)
- API + scheduler: Cloudflare Worker
- Database: Cloudflare D1

## Important publishing boundary

This project does **not** scrape or copy SarkariResult.com. It imports short feed metadata
(title, source URL, published date and a short description) only from RSS/Atom sources that
you are authorized to use. It links readers to the original official notice. A feed is not
automatically a verified government source merely because it is RSS. Check each source and
its terms before adding it. Do not publish full articles, copied images, PDFs, or third-party
site text without permission.

Automatic publishing is enabled for feeds you add and mark active. The first run should be
tested with a feed you control or an official feed that explicitly permits reuse.

## Project layout

- `public/` — static website for Cloudflare Pages
- `worker/src/index.js` — API, RSS/Atom sync and Cron handler
- `worker/migrations/0001_init.sql` — D1 schema
- `worker/wrangler.toml` — Worker deployment configuration

## 1. Create D1 database

```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 create go7-gov-db
```

Copy the returned `database_id` into `worker/wrangler.toml`.

Apply schema:

```bash
npx wrangler d1 migrations apply go7-gov-db --remote
```

## 2. Set Worker secrets and deploy

Create a long random admin token. Keep it private; never put it in the public site or GitHub.

```bash
npx wrangler secret put ADMIN_TOKEN
```

Deploy:

```bash
npx wrangler deploy
```

In Cloudflare DNS, create `api.jobs.go7.in` as a Worker custom domain for this Worker.
The exact UI may vary; use Workers & Pages > your Worker > Settings > Domains & Routes.

## 3. Connect the frontend to the API

Edit `public/config.js` and set:

```js
window.GO7_CONFIG = {
  API_BASE: "https://api.jobs.go7.in"
};
```

## 4. Deploy the frontend to Pages

Push this repository to GitHub. In Cloudflare:
1. Workers & Pages > Create > Pages > Connect to Git.
2. Select the repository.
3. Build command: leave blank.
4. Build output directory: `public`.
5. Add custom domain `jobs.go7.in`.

Alternatively, upload the `public/` folder as a Direct Upload Pages project.

## 5. Add authorized feed sources

Use the Admin page at `https://jobs.go7.in/admin.html`.
Enter your `ADMIN_TOKEN`, a source name, category, and RSS/Atom feed URL.
Choose only feeds whose publisher terms allow this use. The source must be reachable by
the Worker and return RSS or Atom XML. The Worker validates HTTP(S), blocks local/private
network hosts, and stores the source.

Press **Sync now** to test. Cron runs every 30 minutes (UTC schedule `*/30 * * * *`).
Cloudflare Cron schedules use UTC. A cron event can take several minutes to propagate.

## 6. API endpoints

- `GET /api/health`
- `GET /api/categories`
- `GET /api/posts?category=latest-jobs&limit=30`
- `POST /api/admin/sources` (Bearer admin token)
- `GET /api/admin/sources` (Bearer admin token)
- `POST /api/admin/sync` (Bearer admin token)

## 7. Add a source safely

Do not add a site homepage URL as a feed URL. Use a documented RSS/Atom endpoint supplied
by the publisher. Do not use a source that prohibits republication or automated access.
Only concise feed metadata is displayed; users follow the official source link for details.

## 8. GitHub commands

From the project root:

```bash
git init
git add .
git commit -m "Initial GO7 government portal"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/go7-government-portal.git
git push -u origin main
```

## 9. Before launch checklist

- Replace the D1 database ID.
- Set `ADMIN_TOKEN` as a Worker secret.
- Configure the Worker custom domain and Pages custom domain.
- Set `API_BASE` in `public/config.js`.
- Add only vetted, permitted official feeds.
- Test a sync and inspect every published post.
- Add About, Contact, Privacy Policy, Disclaimer and editorial policy pages.
- Add your own useful original explainers; do not rely on thin feed-only pages.
- Apply for AdSense only after the site has substantial original value and complies with
  Google publisher policies.

## Troubleshooting

- CORS error: confirm the Pages URL is exactly in `ALLOWED_ORIGIN` in `wrangler.toml`.
- 401 on admin: enter the Worker secret value, not the Worker name.
- Empty homepage: add a valid RSS/Atom feed and run Sync now.
- Feed fails: confirm it is a public RSS/Atom URL, returns XML, and permits automated use.
- Cron not running yet: trigger propagation can take several minutes (sometimes up to 15).
