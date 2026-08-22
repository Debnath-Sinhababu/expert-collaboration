# SEO Setup Handoff — Calxmap (expert-collaboration)

**Purpose:** Document the SEO configuration that is live and indexing correctly on **[https://www.calxmap.in](https://www.calxmap.in)**, so another repo/project can implement the same pattern without missing critical pieces.

**Stack:** Next.js App Router (`frontend/`), Next Metadata API, dynamic `sitemap.ts` / `robots.ts`, JSON-LD via a small component.

**Source of truth in this repo:** the files listed in [File checklist](#12-file-checklist-copy-these-patterns).

---

## 1. Goals of this setup

What this configuration achieves:

1. Consistent **canonical host** (`www`) via 301 redirect
2. Correct `<title>` **/ description / Open Graph / Twitter** tags in HTML head (via Next Metadata API)
3. `/robots.txt` pointing crawlers to `/sitemap.xml`
4. **Sitemap** with static public pages + dynamic public detail pages
5. **JSON-LD** (Organization, WebSite, FAQ, Article site-wide; Person / JobPosting on detail pages)
6. Per-page **canonical URLs** and **noindex** on auth pages

Google indexing for this site relies especially on:

- Correct production env vars (`NEXT_PUBLIC_FRONTEND_URL`, `NEXT_PUBLIC_API_URL`)
- www 301 redirect
- Working `/sitemap.xml` (static + API-backed dynamic URLs)
- `generateMetadata` on public detail pages (so crawlers get unique titles/descriptions)

---



## 2. Architecture (how pieces connect)

```
NEXT_PUBLIC_FRONTEND_URL  (= https://www.YOURDOMAIN.com)
        │
        ├── metadataBase (root layout)
        ├── most canonical / OG URLs
        ├── robots.ts → sitemap URL
        └── sitemap.ts → absolute URLs

NEXT_PUBLIC_SITE_URL      (root openGraph.url only — keep same as FRONTEND_URL)
NEXT_PUBLIC_API_URL       (sitemap dynamic fetches only)
NEXT_PUBLIC_SUPABASE_*    (generateMetadata + page JSON-LD on detail layouts)

next.config
  trailingSlash: false
  301 apex → www
```

There is **no shared** `seo.ts` **helper** in this repo. Patterns are copy-pasted across layouts. When porting, either keep the same pattern or extract a small helper — but do not skip any of the layers below.

---



## 3. Environment variables (required)

Set these in the **frontend** production environment:


| Variable                        | Used for                                                            | Production value (Calxmap)               |
| ------------------------------- | ------------------------------------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_FRONTEND_URL`      | `metadataBase`, canonicals, OG images, robots sitemap, sitemap URLs | `https://www.calxmap.in`                 |
| `NEXT_PUBLIC_SITE_URL`          | Root layout `openGraph.url` only                                    | `https://www.calxmap.in` (same as above) |
| `NEXT_PUBLIC_API_URL`           | Sitemap dynamic API fetches                                         | Live API base, e.g. `https://api....`    |
| `NEXT_PUBLIC_SUPABASE_URL`      | Detail-page `generateMetadata` + JSON-LD                            | Project URL                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same                                                                | Anon key                                 |




### Critical pitfalls

1. If `NEXT_PUBLIC_API_URL` is missing in prod, sitemap falls back to `http://localhost:8000` → **dynamic URLs silently fail**; only static routes remain.
2. Keep `FRONTEND_URL` and `SITE_URL` identical to avoid mixed signals.
3. Always use the **www** (or chosen canonical) form, matching the 301 redirect target.
4. Fallback hardcoded in code when env missing: `https://www.calxmap.in` — replace with your domain when porting.

---



## 4. Next.js config (canonical host + URL style)

**File:** `frontend/next.config.mjs`

### Must port

```js
trailingSlash: false,

async redirects() {
  return [
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'calxmap.in' }], // apex / non-www
      destination: 'https://www.calxmap.in/:path*',
      permanent: true, // 301
    },
  ];
},
```



### Adapt for the other project

- Change `calxmap.in` → your apex domain  
- Change destination → your chosen canonical (usually `https://www.yourdomain.com/:path*`)  
- Keep `permanent: true` (301)  
- Keep `trailingSlash: false` so URLs stay consistent with sitemap/canonicals

Also ensure DNS / hosting serves both apex and www, and SSL covers both.

---



## 5. Root layout metadata (site-wide defaults)

**File:** `frontend/src/app/layout.tsx`

### Pattern to replicate

```ts
export const metadata: Metadata = {
  title: {
    default: "Calxmap",
    template: "%s | Calxmap", // child pages become "Page | Brand"
  },
  description: "...primary marketing description...",
  keywords: ["...", "..."],
  authors: [{ name: "Calxmap Team", url: "https://www.calxmap.in" }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_FRONTEND_URL || "https://www.calxmap.in"
  ),
  alternates: {
    canonical: "https://www.calxmap.in", // absolute URL preferred
  },
  icons: {
    icon: [{ url: "/images/calxmaplogo.png", type: "image/png" }],
    shortcut: "/images/calxmaplogo.png",
    apple: "/images/calxmaplogo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.calxmap.in",
    siteName: "Calxmap",
    title: "Calxmap - Expert Networking Platform",
    description: "...",
    images: [{
      url: `${process.env.NEXT_PUBLIC_FRONTEND_URL || "https://www.calxmap.in"}/images/logo.png`,
      width: 1200,
      height: 630,
      alt: "Calxmap - Expert Networking Platform",
    }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@calxmap",
    creator: "@calxmap",
    title: "...",
    description: "...",
    images: [`${process.env.NEXT_PUBLIC_FRONTEND_URL || "..."}/images/logo.png`],
  },
};
```



### Also in root layout

- `<html lang="en">`
- Site-wide `<JsonLd data={...} />` with Organization / WebSite / FAQPage / Article (see §8)



### Assets to place in `public/`


| Path                            | Role                                |
| ------------------------------- | ----------------------------------- |
| `public/images/calxmaplogo.png` | Favicon / apple icon in metadata    |
| `public/images/logo.png`        | Default OG / Twitter / JSON-LD logo |
| `src/app/icon.png`              | Next.js App Router favicon          |


Use a real share image (~1200×630) for OG. This repo declares 1200×630; ensure the file is crawlable at an absolute URL.

---



## 6. Section / static page layouts

Public marketing sections use a **dedicated** `layout.tsx` that only exports `metadata` (and passes `children` through). This keeps titles/canonicals correct even when the page itself is a client component.

### Examples in this repo


| Route           | File                              |
| --------------- | --------------------------------- |
| `/solutions`    | `src/app/solutions/layout.tsx`    |
| `/requirements` | `src/app/requirements/layout.tsx` |
| `/contact-us`   | `src/app/contact-us/layout.tsx`   |
| `/auth/login`   | `src/app/auth/login/layout.tsx`   |
| `/auth/signup`  | `src/app/auth/signup/layout.tsx`  |




### Template for a public section

```ts
import { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'

export const metadata: Metadata = {
  title: 'Current Requirements | Calxmap',
  description: '...',
  keywords: ['...'],
  openGraph: {
    type: 'website',
    url: `${siteUrl}/requirements`,
    title: '...',
    description: '...',
    siteName: 'Calxmap',
  },
  twitter: {
    card: 'summary_large_image',
    title: '...',
    description: '...',
  },
  alternates: {
    canonical: `${siteUrl}/requirements`,
  },
}

export default function RequirementsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```



### Auth pages — noindex

Login/signup layouts set:

```ts
robots: {
  index: false,
  follow: true,
},
```

**Port this for any auth / private entry pages.**

### Dashboard layouts note

`expert/`, `institution/`, `student/` layouts have titles but **do not** set `robots: { index: false }`. `robots.txt` also allows `/`. If the other project should keep private areas out of Google, add:

- `robots: { index: false, follow: false }` on dashboard layouts, and/or  
- `disallow` rules in `robots.ts` for `/expert`, `/institution`, `/admin`, etc.

---



## 7. Dynamic detail pages — `generateMetadata` + schema

Public detail pages use a **server** `layout.tsx` with `generateMetadata`, even if the page UI is client-rendered.

### Pattern used here

1. Fetch entity server-side (Supabase anon client in this repo)
2. Build unique `title`, `description`, `openGraph`, `twitter`, `alternates.canonical`
3. Render matching JSON-LD (`Person` or `JobPosting`) via `<JsonLd />`



### Expert example

**File:** `src/app/experts/[expertId]/layout.tsx`

- Title: `{name} - {domain} Expert | Calxmap`
- Description: bio truncated to ~160 chars
- OG type: `profile`
- Image: expert photo or fallback logo
- Canonical: `{siteUrl}/experts/{id}`
- JSON-LD: `Person`



### Requirement detail examples


| Route                           | Layout file                      | Schema                      | Index only when                                        |
| ------------------------------- | -------------------------------- | --------------------------- | ------------------------------------------------------ |
| `/requirements/internship/[id]` | `.../internship/[id]/layout.tsx` | `JobPosting` (`INTERN`)     | `visibility_scope === 'public'` && `status === 'open'` |
| `/requirements/contract/[id]`   | `.../contract/[id]/layout.tsx`   | `JobPosting` (`CONTRACTOR`) | `status === 'open'`                                    |
| `/requirements/freelance/[id]`  | `.../freelance/[id]/layout.tsx`  | `JobPosting` (`CONTRACTOR`) | `status === 'open'`                                    |




### Checklist when porting detail SEO

- [ ] Server layout (not only client page) owns metadata  
- [ ] Absolute canonical per entity  
- [ ] Unique title/description per entity  
- [ ] Fallback metadata if not found  
- [ ] Matching JSON-LD type for the content  
- [ ] Only index publicly available / open items (filter closed/private)  
- [ ] Data source must be readable server-side in production (Supabase RLS / public API)

---



## 8. JSON-LD component

**File:** `src/components/JsonLd.tsx`

```tsx
import Script from 'next/script'

export default function JsonLd({ data }: { data: Record<string, any> | Record<string, any>[] }) {
  return (
    <Script
      id="json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data, null, 2) }}
    />
  )
}
```



### Site-wide graph (root layout)

Injected once in root layout `@graph`:


| `@type`        | Purpose                                             |
| -------------- | --------------------------------------------------- |
| `Organization` | Brand, logo, address, social `sameAs`, contactPoint |
| `WebSite`      | Site identity + `SearchAction`                      |
| `FAQPage`      | Common Q&As                                         |
| `Article`      | Marketing article-style entity                      |




### Adapt carefully

- Replace names, URLs, address, social links with the other brand  
- If the other site has **no** `/search` **route**, either add one or remove `SearchAction` (this repo’s SearchAction points at `/search?q=...` even though that route may not exist)  
- Prefer stable absolute URLs (`https://www.domain.com/...`)



### Page-level schemas

- Expert → `Person`  
- Jobs/requirements → `JobPosting` (with salary/budget when available)

---



## 9. `robots.ts`

**File:** `src/app/robots.ts`  
**Live URL:** `https://www.calxmap.in/robots.txt`

```ts
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "https://www.calxmap.in";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
```



### Recommended improvement for the other repo (optional but important)

```ts
rules: {
  userAgent: "*",
  allow: "/",
  disallow: ["/admin/", "/superadmin/", "/expert/", "/institution/", "/student/", "/api/"],
},
```

Adjust paths to match the other app’s private areas.

---



## 10. `sitemap.ts` (static + dynamic)

**File:** `src/app/sitemap.ts`  
**Live URL:** `https://www.calxmap.in/sitemap.xml`

### Static routes (this project)


| URL             | priority | changeFrequency |
| --------------- | -------- | --------------- |
| `/`             | 1.0      | daily           |
| `/requirements` | 0.9      | daily           |
| `/solutions`    | 0.9      | weekly          |
| `/contact-us`   | 0.8      | monthly         |
| `/auth/signup`  | 0.7      | monthly         |
| `/auth/login`   | 0.7      | monthly         |


> Note: auth URLs are in the sitemap but layouts set `noindex`. Prefer **removing auth URLs from sitemap** in the other project for cleaner signals.



### Dynamic routes (API fetch, revalidate hourly)

```ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "https://www.calxmap.in";

// Example pattern:
fetch(`${API_BASE_URL}/api/experts?limit=1000`, { next: { revalidate: 3600 } })
```


| Source endpoint                                  | Filter        | Sitemap URL                     |
| ------------------------------------------------ | ------------- | ------------------------------- |
| `GET /api/experts?limit=1000`                    | has `id`      | `/experts/{id}`                 |
| `GET /api/internships/visible?limit=1000`        | public + open | `/requirements/internship/{id}` |
| `GET /api/freelance/projects/visible?limit=1000` | open          | `/requirements/freelance/{id}`  |
| `GET /api/projects?limit=1000&status=open`       | has `id`      | `/requirements/contract/{id}`   |


Each entry includes `url`, `lastModified`, `changeFrequency: 'weekly'`, `priority: 0.8`.

### Porting checklist

- [ ] Only include **public, indexable** URLs  
- [ ] Use absolute URLs with canonical host  
- [ ] Ensure API endpoints are publicly reachable from the Next server  
- [ ] Set `NEXT_PUBLIC_API_URL` in production  
- [ ] Handle API shape (`array` vs `{ data: [] }`) like this repo  
- [ ] Swallow fetch errors so static routes still return if one API fails  
- [ ] Consider pagination if catalogs exceed `limit=1000`

---



## 11. Post-deploy Google setup (manual, not in code)

This repo does **not** embed Search Console verification or GA4 in the frontend. Do this manually for the other project too:

1. Confirm production env vars (especially `FRONTEND_URL` + `API_URL`)
2. Open `https://www.YOURDOMAIN.com/robots.txt` → sitemap link correct
3. Open `https://www.YOURDOMAIN.com/sitemap.xml` → static + dynamic URLs present
4. View page source on homepage + one detail page → title/description/canonical/OG present
5. Apex → www returns **301**
6. In Google Search Console:
  - Add property for the canonical host  
  - Verify (DNS / HTML tag / file — pick one)  
  - Submit sitemap: `https://www.YOURDOMAIN.com/sitemap.xml`
7. Optional: Rich Results Test / URL Inspection on a detail page with JobPosting/Person JSON-LD
8. Optional: GA4 / Search Console linking for ongoing monitoring

---



## 12. File checklist (copy these patterns)

```
frontend/next.config.mjs                          # trailingSlash + www 301
frontend/src/app/layout.tsx                       # root metadata + site JSON-LD
frontend/src/app/robots.ts
frontend/src/app/sitemap.ts
frontend/src/app/icon.png
frontend/src/components/JsonLd.tsx
frontend/public/images/logo.png                   # OG / schema logo
frontend/public/images/calxmaplogo.png            # favicon/apple

# Section layouts
frontend/src/app/solutions/layout.tsx
frontend/src/app/requirements/layout.tsx
frontend/src/app/contact-us/layout.tsx
frontend/src/app/auth/layout.tsx
frontend/src/app/auth/login/layout.tsx            # robots noindex
frontend/src/app/auth/signup/layout.tsx           # robots noindex

# Dynamic detail SEO
frontend/src/app/experts/[expertId]/layout.tsx
frontend/src/app/requirements/internship/[id]/layout.tsx
frontend/src/app/requirements/contract/[id]/layout.tsx
frontend/src/app/requirements/freelance/[id]/layout.tsx
```

Related (share URLs, not core indexing):  
`frontend/src/components/requirements/ShareRequirementButton.tsx` (uses `NEXT_PUBLIC_FRONTEND_URL`).

Draft / future notes (not the live Calxmap setup):  
`docs/seo-marketing-plan.md` — CalxBook-oriented plan; **do not treat as implemented**.

---



## 13. Implementation order for the other repo

Recommended sequence so nothing important is missed:

1. **Env vars** — set `NEXT_PUBLIC_FRONTEND_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`
2. **next.config** — `trailingSlash: false` + apex→www 301
3. **Public assets** — logo + OG image under `public/images/`
4. **JsonLd component**
5. **Root layout metadata + Organization/WebSite JSON-LD**
6. `robots.ts` + `sitemap.ts` (static first, then dynamic)
7. **Section layouts** for every public marketing route
8. `generateMetadata` **+ schema** for every public detail route
9. **noindex** auth/private areas (+ optional robots `disallow`)
10. **Deploy** → verify robots/sitemap/view-source → **submit sitemap in GSC**

---



## 14. Acceptance checklist (done when all pass)

- [ ] `https://www.domain.com` is the only preferred host (apex 301s to www)  
- [ ] No trailing-slash duplicates  
- [ ] Homepage has title, description, canonical, OG, Twitter tags  
- [ ] Each public section page has its own title + canonical  
- [ ] Detail pages have unique titles/descriptions + canonicals  
- [ ] Auth pages are `noindex`  
- [ ] `/robots.txt` allows crawl and lists sitemap  
- [ ] `/sitemap.xml` lists homepage + public listings + public detail URLs  
- [ ] Dynamic sitemap URLs appear in production (API URL configured)  
- [ ] JSON-LD validates for Organization and at least one detail type  
- [ ] Sitemap submitted in Google Search Console  

---



## 15. Known gaps in this repo (optional improvements)

These did **not** block indexing for Calxmap, but worth deciding for the other project:

1. Dual env vars (`FRONTEND_URL` vs `SITE_URL`) — consolidate to one if possible
2. Root canonical hardcoded while other pages use env
3. Auth pages listed in sitemap while also `noindex`
4. `robots.txt` allows private dashboards
5. `SearchAction` may point to a non-existent `/search` route
6. Many public pages are `'use client'` — head tags are fine; body content is CSR (weaker for some crawlers). Prefer server-rendered public content when possible
7. No in-code GSC verification / GA4
8. No shared SEO helper — duplication across layouts
9. Sitemap `limit=1000` may truncate large catalogs
10. OG image dimensions claimed as 1200×630; ensure asset matches

---



## 16. Minimal mental model for co-developers

> **Head tags** come from Next `metadata` / `generateMetadata` in **layouts**.  
> **Crawl map** comes from `robots.ts` + `sitemap.ts`.  
> **Rich context** comes from JSON-LD.  
> **One host** is enforced by 301 + absolute canonicals + env base URL.  
> **Production env for site URL + API URL** is what makes dynamic indexing work.

If those five layers are ported correctly, the other repo will match this project’s working SEO setup.