# CalxBook SEO Marketing — Technical Plan

**Status:** Draft for review
**Scope:** Course catalog (programmatic SEO) + Blog content engine
**Systems involved:** Agent Server (this repo) · CalxBook backend (Node/Express) · CalxBook frontend
**Owners:** Agentic AI engineer (Agent Server) · CalxBook developer (frontend/backend)

---

## 1. Goals & success criteria

SEO marketing for CalxBook is a loop: **optimize → get indexed → rank → measure → re-optimize**. The business goal is not traffic for its own sake but **organic traffic that converts to enrollments**.

**Primary targets**
- **Course catalog pages** — every course/level page is discoverable, correctly indexed, and eligible for rich results.
- **Blog / articles** — topic-cluster content that ranks for informational queries and funnels readers to relevant courses.

**Success metrics (tracked via GSC + GA4)**
| Metric | Source | Target signal |
|---|---|---|
| Indexed pages | GSC (Pages report) | ~100% of live courses indexed |
| Impressions / clicks | GSC (Performance) | Month-over-month growth |
| Avg. ranking position (target keywords) | GSC | Trending toward page 1 |
| Organic → enrollment conversion | GA4 (conversion events) | Rising, per landing page |
| Rich-result eligibility (Course schema) | GSC (Enhancements) | No errors, valid items |

---

## 2. Concepts primer (shared vocabulary)

- **Crawling → Indexing → Ranking** — Googlebot fetches a page, decides whether to store it in the index, then ranks indexed pages per query. A non-indexed page cannot rank at all.
- **SSR (Server-Side Rendering)** — server returns fully-built HTML (title, meta, content, JSON-LD) on first request. Ideal for SEO.
- **CSR (Client-Side Rendering / SPA)** — server returns an near-empty shell + JS bundle; content appears only after JS runs. Google renders JS slowly/inconsistently → SEO risk. Requires SSR or **prerendering** to be reliable.
- **Structured data (JSON-LD)** — machine-readable page facts (e.g. `Course`, `Article`) that unlock rich results.
- **GSC (Google Search Console)** — Google's own view of your site: indexing status + search performance (impressions, clicks, position). SEO scoreboard + diagnostics.
- **GA4 (Google Analytics 4)** — on-site behavior after the click: sessions, events, conversions.

---

## 3. Architecture & responsibility split

### 3.1 Division of ownership

| Task | Owner | Layer |
|---|---|---|
| SSR / prerendering (metadata reaches Google) | **CalxBook dev** | Frontend |
| `<title>`, meta description injection | **CalxBook dev** | Frontend |
| JSON-LD structured data rendering | **CalxBook dev** | Frontend |
| `sitemap.xml`, `robots.txt`, canonicals, redirects | **CalxBook dev** | Backend |
| Core Web Vitals / performance | **CalxBook dev** | Frontend |
| GSC + GA4 install, verification, conversion events | **CalxBook dev** | Frontend/Backend |
| **Generating** meta title/description copy | **Agentic** | Agent Server |
| **Generating** slug suggestions | **Agentic** | Agent Server |
| Building JSON-LD object from course fields | **Agentic** (data) + **dev** (render) | Both |
| Related-course internal links (embeddings) | **Agentic** | Agent Server |
| Blog article generation | **Agentic** | Agent Server |
| GSC/GA API → Supabase feedback loop | **Agentic** | Agent Server |
| Hybrid-confidence approval workflow | **Agentic** (logic) + **dev** (UI) | Both |

> **Rule of thumb:** SEO is ~70% CalxBook-engineering (rendering/serving) and ~30% agentic (content generation). The 70% is a **prerequisite** for the 30% — generated metadata is invisible until the frontend renders it.

### 3.2 The integration contract

The two systems meet at **one Supabase table** the Agent Server writes and the frontend reads.

- Agent Server → **writes** SEO fields to `seo_optimizations` (service-role key, as with existing agents).
- CalxBook frontend/backend → **reads** the *applied* row for a page and renders it into HTML.
- Auth for Agent Server endpoints: existing **`X-Agent-Key`** header.

```
[CalxBook backend] --(fire-and-forget: course created/updated)--> [Agent Server /seo/generate]
        |                                                                   |
        |                                                         writes optimized fields
        v                                                                   v
   reads applied SEO row  <----------------- Supabase (seo_optimizations) <-+
        |
        v
[CalxBook frontend] renders <title>, meta, JSON-LD, canonical
```

---

## 4. Workstream A — Course catalog (programmatic SEO)

For each course/level, the Agent Server produces:

| Field | Rule | Confidence |
|---|---|---|
| `seo_title` | ≤ 60 chars, keyword-aware, unique | High → auto |
| `meta_description` | ≤ 155 chars, benefit-driven, unique | High → auto |
| `slug` | kebab-case, keyword-rich, stable | New course: auto · **change on existing: queue** |
| `json_ld` | `Course` schema object (see §7.4) | High → auto |
| `h1` / intro suggestion | optional visible-content hints | Queue (content change) |
| `internal_links` | related course IDs via embeddings | High → auto |

**Triggers**
1. **On course create/update** — CalxBook backend calls `POST /seo/generate` fire-and-forget after `course_builder` finishes.
2. **Backfill** — one-off bulk run over the existing catalog.

**Internal linking reuses existing embeddings** — the `course_embeddings` table already powers recommendations; reuse cosine similarity to pick N related courses. No new model needed.

---

## 5. Workstream B — Blog content engine (agentic)

A generative loop, structured like the existing `social_media` agent.

**Pipeline**
1. **Topic queue** — keyword/topic clusters around course themes (seeded manually first; later informed by GSC query data).
2. **Draft** — long-form article + `seo_title`, `meta_description`, `Article` JSON-LD.
3. **Internal links** — link to relevant courses via embeddings (blog traffic → course pages = the conversion path).
4. **Review** — new articles enter the approval queue (medium confidence) before publish.
5. **Refresh** — re-optimize decaying posts flagged by the GSC feedback loop.

Blog posts use the **same `seo_optimizations` contract** plus a `blog_posts` table for article bodies (see §7.3).

---

## 6. CalxBook frontend/backend work

> Section 6 is the **prerequisite** for everything the Agent Server produces. It is written for **both rendering models**. Determine the CalxBook frontend stack first, then follow 6.A **or** 6.B.

### 6.0 Common to both (backend, stack-independent)

- **`sitemap.xml`** — dynamic route listing all live course + blog URLs with `lastmod`. Regenerate on content change (or hourly). Submit in GSC.
- **`robots.txt`** — allow crawling of public pages; disallow admin/API; reference the sitemap URL.
- **Canonical URLs** — one canonical per page; avoid duplicate URLs (trailing slash, query params, level variants).
- **Redirects** — 301 map for any slug change (the Agent Server proposes slug changes; the backend must serve the redirect). Maintain a `redirects` table or config.
- **HTTP status hygiene** — real 404s for missing courses (not soft-200s), 200 for live pages.
- **GSC verification** — DNS record (domain property) preferred.
- **GA4 + conversion events** — install GA4; define events: `sign_up`, `course_enrolled`, `lead_submitted`. These make "organic → enrollment" measurable.

### 6.A If the frontend is **SSR** (e.g. Next.js) — preferred path

This is the low-friction case.

- **Metadata injection** — in the course/blog route's server data-fetch, read the applied `seo_optimizations` row and render:
  - `<title>` = `seo_title`
  - `<meta name="description">` = `meta_description`
  - `<link rel="canonical">` = canonical URL
  - Open Graph / Twitter tags from the same fields
- **JSON-LD** — inject the `json_ld` object as a `<script type="application/ld+json">` in the server-rendered `<head>`.
- **Fallback** — if no SEO row exists yet, render sensible defaults (course name as title, generated description) so pages are never metadata-less.
- **Caching** — SEO fields change rarely; cache with revalidation on course/SEO update.

**Acceptance:** `view-source` on a course page shows the correct title, meta, canonical, and JSON-LD **without running JS**. Confirm via GSC URL Inspection → "View crawled page."

### 6.B If the frontend is **CSR** (pure SPA) — prerequisite path

A pure SPA serves an empty shell; SEO will **not** work reliably until rendering is fixed. Choose one:

| Option | What it is | Effort | Recommendation |
|---|---|---|---|
| **Migrate to SSR/Next.js** | Server-render the public pages | High | Best long-term if roadmap allows |
| **Prerendering** (e.g. Prerender.io / static snapshot) | Serve pre-built HTML snapshots to crawlers | Medium | Fastest unblock without a rewrite |
| **Static generation (SSG)** for catalog | Build HTML per course at deploy/rebuild | Medium | Good if catalog changes infrequently |
| **Dynamic rendering** (crawler-only prerender) | Detect bots, serve rendered HTML | Medium | Google-supported stopgap |

- Whichever is chosen, the **rendered HTML must contain** the same title/meta/canonical/JSON-LD as 6.A, sourced from `seo_optimizations`.
- **Client-side meta libraries alone (e.g. react-helmet) are not sufficient** — they set tags after JS runs; treat them as a supplement, not the solution.
- **Acceptance:** the crawler-facing HTML (test with GSC URL Inspection and "Fetch as Google") contains full metadata and content without relying on client JS execution.

> **Decision gate:** until 6.A or 6.B passes its acceptance test, do **not** invest in blog content — it will not rank.

---

## 7. Agent Server work

New module: `app/agents/seo/` (agent.py, generator.py, prompts.py) + `app/api/seo.py` + `app/workflows/seo.py`, mirroring existing agents.

### 7.1 Supabase — `seo_optimizations`

```sql
create table seo_optimizations (
  id                uuid primary key default gen_random_uuid(),
  entity_type       text not null,        -- 'course' | 'blog_post'
  entity_id         uuid not null,        -- course_id or blog_post id
  seo_title         text,
  meta_description  text,
  slug              text,
  json_ld           jsonb,
  internal_links    jsonb,                -- [{entity_id, title, url}]
  h1_suggestion     text,
  status            text not null default 'pending_review',  -- 'applied' | 'pending_review' | 'rejected'
  confidence        text,                 -- 'high' | 'medium' | 'low'
  model             text,                 -- generation model id
  source_hash       text,                 -- hash of input fields; skip re-gen if unchanged
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  reviewed_by       text,
  reviewed_at       timestamptz,
  unique (entity_type, entity_id)
);
create index on seo_optimizations (status);
```

Frontend reads the row where `status = 'applied'` for a given `entity_type`+`entity_id`.

### 7.2 Hybrid-confidence approval logic

| Change | Confidence | Default status |
|---|---|---|
| New-course meta title/description | high | `applied` |
| JSON-LD | high | `applied` |
| Internal links | high | `applied` |
| New-course slug | high | `applied` |
| **Slug change on existing course** | low | `pending_review` |
| Visible-content rewrite (h1/intro) | low | `pending_review` |
| New blog article | medium | `pending_review` |

`applied` rows are live immediately (frontend reads them). `pending_review` rows wait for admin approval before their `status` flips to `applied`.

### 7.3 Supabase — `blog_posts`

```sql
create table blog_posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text unique,
  body_md       text,                 -- article body (markdown or html)
  status        text default 'draft', -- 'draft' | 'published'
  target_keyword text,
  related_course_ids uuid[],
  created_at    timestamptz default now(),
  published_at  timestamptz
);
```

### 7.4 JSON-LD examples

**Course** (catalog page):
```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Python for Beginners",
  "description": "Learn Python from scratch...",
  "provider": { "@type": "Organization", "name": "CalxBook", "url": "https://calxbook.com" },
  "url": "https://calxbook.com/courses/python-for-beginners",
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "online",
    "courseWorkload": "P6W"
  }
}
```

**Article** (blog):
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Start Learning Python in 2026",
  "author": { "@type": "Organization", "name": "CalxBook" },
  "publisher": { "@type": "Organization", "name": "CalxBook" },
  "datePublished": "2026-07-06",
  "mainEntityOfPage": "https://calxbook.com/blog/start-learning-python"
}
```

### 7.5 API endpoints (Agent Server, `X-Agent-Key` auth)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/seo/generate` | Generate SEO fields for one entity (course/blog). Fire-and-forget from backend. |
| `POST` | `/seo/backfill` | Bulk-generate for the existing catalog. |
| `GET` | `/seo/optimizations` | List (filter by status) — for admin UI. |
| `POST` | `/seo/optimizations/{id}/approve` | Flip `pending_review` → `applied`. |
| `POST` | `/seo/optimizations/{id}/reject` | Mark rejected. |
| `POST` | `/seo/blog/generate` | Generate a blog draft for a topic. |
| `POST` | `/seo/feedback/sync` | Pull GSC/GA data → prioritize weak pages (see §8). |

`/seo/generate` uses `source_hash` to skip regeneration when input fields are unchanged (same pattern as embeddings).

---

## 8. Measurement loop (GSC + GA4 → Supabase)

**Setup (CalxBook dev):** verify GSC (domain property), submit sitemap, install GA4, define conversion events.
- **GSC Search Analytics API** — scheduled pull of per-page/per-query impressions, clicks, CTR, position → store in a `seo_metrics` table.
- **GA4 Data API** — per-landing-page organic sessions + conversion events.

```sql
create table seo_metrics (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text,
  entity_id    uuid,
  url          text,
  query        text,
  impressions  int,
  clicks       int,
  ctr          numeric,
  position     numeric,
  captured_for date,          -- the day/window the metrics cover
  created_at   timestamptz default now()
);
```

**Prioritization logic** — flag pages that are **close to page 1 but underperforming** (e.g. position 8–20, high impressions, low CTR) as re-optimization candidates. Feed these back into `/seo/generate` (refresh) or the blog refresh queue.

---

## 9. Admin / approval surface

The admin needs to **review the queue** and **see performance**.

- **Data source:** Agent Server endpoints in §7.5 + `seo_metrics`.
- **UI host:** existing CalxBook admin panel if present; otherwise a lightweight dashboard (or Retool/Metabase over Supabase to start).
- **Minimum views:**
  1. **Approval queue** — `pending_review` optimizations with before/after diff + preview; approve/reject.
  2. **Catalog SEO status** — per course: has SEO row? indexed (GSC)? position?
  3. **Performance** — impressions/clicks/position trends; re-optimization candidates.

---

## 10. Phasing & sequencing

| Phase | Work | Owner | Gate |
|---|---|---|---|
| **0. Rendering prerequisite** | Confirm stack; SSR metadata path (6.A) or CSR fix (6.B); GSC/GA4 setup; sitemap/robots/canonicals | **CalxBook dev** | Acceptance test passes (crawled HTML has metadata) |
| **1. Catalog metadata + Course schema** | `seo_optimizations` table; `/seo/generate` + backfill; frontend renders fields; auto-publish new courses | Agentic + dev | New courses get valid title/meta/JSON-LD live |
| **2. Internal linking** | Reuse embeddings for related-course links | Agentic | Links rendered on course pages |
| **3. Measurement loop** | GSC/GA4 APIs → `seo_metrics`; prioritization | Agentic | Weak pages auto-flagged |
| **4. Blog content engine** | `blog_posts`; `/seo/blog/generate`; approval queue; refresh | Agentic + dev | First articles published + indexed |

> Phase 0 blocks all others. Phases 1–3 are catalog-focused (fast ROI, low AI). Phase 4 is the generative agent.

---

## 11. Open questions / prerequisites

1. **Frontend stack + rendering model** — SSR or CSR? Determines whether §6.A or §6.B applies. *(Blocking for Phase 0.)*
2. **Where does course/page content live** — all in Supabase, or does the Express backend own some? Determines where the frontend reads the applied SEO row.
3. **Admin panel** — is there an existing CalxBook admin UI to host §9, or build standalone?
4. **Domain/DNS access** — needed for GSC domain-property verification.
5. **Slug ownership** — does the frontend derive URLs from a `slug` column the backend controls? (Required for the redirect flow on slug changes.)

---

## Appendix — glossary
- **SERP** — search engine results page.
- **CTR** — click-through rate (clicks ÷ impressions).
- **Rich result** — enhanced search listing (e.g. course cards) enabled by structured data.
- **Canonical** — the "official" URL for a page when duplicates exist.
- **Prerendering** — serving pre-built HTML snapshots to crawlers for CSR apps.
