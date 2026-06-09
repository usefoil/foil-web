# Foil Web

Static landing page and SEO content for Foil.

This repo was split out of the macOS app repository so web hosting,
analytics, SEO, and marketing iteration can move independently from app
release work.

## Local Preview

Open `index.html` directly in a browser, or serve the directory with any static
file server:

```sh
python3 -m http.server 4173
```

## Deployment Notes

- Intended host: Vercel
- Analytics target: PostHog
- Production domain and canonical URLs are still pending; update `robots.txt`,
  `sitemap.xml`, and page canonical/OG URLs before public SEO launch.

