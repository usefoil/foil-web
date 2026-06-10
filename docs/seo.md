# Foil Web SEO Operations

Foil web uses `https://sayfoil.com` as the production canonical URL.

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
