# GO7 Portal – UI & Related Posts Update (12 Nov 2026)

## Changes
- Header navigation now contains Home and content categories only. About, Privacy, Disclaimer, Terms and Contact are in the footer on all public pages.
- 404 page now uses the shared GO7 header/footer, includes a search field and a homepage link.
- Detail pages load up to five additional posts from the same category, excluding the current post. The related section stays hidden if no related posts are returned.
- Category feed rows no longer have individual bottom borders; they use clean spacing and a subtle hover background.
- View More and Load More buttons use `padding: 10px 20px` and `font-size: 15px`.
- Shared menu toggle behavior is handled by `site.js` to avoid duplicate click handlers.

## Deploy
Extract this ZIP. Copy its `public` folder over the repository's `public` folder, then run from the repository root:

```bat
robocopy "C:\Users\TanviSH\Desktop\GO7-Government-Portal-Update-2026-11-12\public" "C:\Users\TanviSH\Desktop\go7-government-portal\public" /E
git add -A public README_GO7_UI_RELATED_UPDATE_HINDI.md
git commit -m "Improve GO7 navigation 404 and related posts"
git push origin main
```

Do not add `worker/.wrangler/`. No Worker or D1 migration is included. Related posts require the existing `/api/posts?category=...` endpoint and only display records already present in the database.
