# Foil Web SEO Operations

Foil web uses `https://foil.neonwatty.com` as the production canonical URL.
The legacy `sayfoil.com` and `www.sayfoil.com` hosts permanently redirect each
request to the matching path on the canonical subdomain.

## September 2026 Domain Migration

- Preserve every existing path while moving the canonical origin from
  `https://sayfoil.com` to `https://foil.neonwatty.com`.
- Keep the existing `sayfoil.com` Search Console property and DNS verification
  record so redirect and historical indexing data remain inspectable.
- The `sc-domain:neonwatty.com` property covers the new Foil subdomain. Submit
  `https://foil.neonwatty.com/sitemap.xml` after the first production deploy.
- Keep the permanent redirects indefinitely and verify that both apex and `www`
  return a single redirect hop to the matching canonical path.

The receipts below describe the original June 2026 `sayfoil.com` launch and are
retained as migration history.

## Google Search Console

Search Console setup receipt from June 10, 2026:

- Property type: Domain property
- Property: `sayfoil.com`
- Google account: `jermwatt@gmail.com`
- Verification method: DNS TXT record at the Cloudflare-managed apex
- Verification result: ownership verified

The verification TXT record should stay in Cloudflare DNS so Search Console
ownership remains valid. Do not commit the verification token value; it is
available in Cloudflare DNS if needed for future ownership checks.

## Sitemap

Submitted sitemap:

```text
https://sayfoil.com/sitemap.xml
```

Live checks on June 10, 2026 proved:

- `https://sayfoil.com/sitemap.xml` returns HTTP 200.
- `https://sayfoil.com/robots.txt` returns HTTP 200.
- `robots.txt` points at `https://sayfoil.com/sitemap.xml`.

Search Console accepted the sitemap submission and showed a success dialog. The
initial table status immediately after submission said `Couldn't fetch`, even
though the sitemap was live and fetchable; re-check after Google's first
processing pass.

## URL Inspection

Homepage inspection receipt from June 10, 2026:

- Inspected URL: `https://sayfoil.com/`
- Initial status: `URL is not on Google`
- Discovery source: `https://sayfoil.com/sitemap.xml`
- Page indexing state: `Discovered - currently not indexed`
- Action taken: requested indexing
- Result: Google added the URL to a priority crawl queue

Do not repeatedly request indexing for the same URL; it does not change queue
priority.

Follow-up receipt from June 11, 2026:

- Public Google search for `site:sayfoil.com Foil Mac dictation` returned
  `https://sayfoil.com/`, so the homepage is publicly indexed.
- `npm run check:launch` passed.
- `SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com npm run check:deployed`
  passed.
- Live fetch checks returned HTTP 200 for `https://sayfoil.com/robots.txt`,
  `https://sayfoil.com/sitemap.xml`, and `https://sayfoil.com/`.
- Live `robots.txt` still points at `https://sayfoil.com/sitemap.xml`.
- Live `sitemap.xml` contains 8 URL entries.
- Live homepage still declares canonical `https://sayfoil.com/`.

Search Console UI/API status was not rechecked in this workspace because no
authenticated Search Console tool or browser session was available. Next
operator revisit: open the `sayfoil.com` domain property in Search Console,
confirm the sitemap table no longer shows `Couldn't fetch`, inspect
`https://sayfoil.com/`, and record whether any remaining not-indexed state was
resolved, re-requested, or scheduled for a later crawl-status check.
