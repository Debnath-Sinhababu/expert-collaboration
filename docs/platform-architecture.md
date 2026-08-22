# CalxBook Agent Platform — Architecture & Decision Record

**Status:** Draft for review — supersedes the *disconnected per-service* framing; individual service plans remain valid where noted
**Last updated:** 2026-07-10
**Related docs:**
- [lead-manager.md](lead-manager.md) — folded in; its `leads`/`lead_events` schema is **superseded** by `contacts` + `activities` (§5)
- [seo-marketing-plan.md](seo-marketing-plan.md) — survives; its review flow migrates to shared `approvals` (§5.6)
- [conversational-ai-plan.md](conversational-ai-plan.md) — survives; its `contacts` table is **promoted** to the platform spine defined here
- [marketing-platform-roadmap.md](marketing-platform-roadmap.md) — the CalxMap/multi-tenant strategy this must stay compatible with

---

## Table of Contents

1. [Purpose & scope](#1-purpose--scope)
2. [Architecture overview — two lanes, one codebase](#2-architecture-overview--two-lanes-one-codebase)
3. [The connective tissue: four shared data layers](#3-the-connective-tissue-four-shared-data-layers)
4. [Event catalog](#4-event-catalog)
5. [Data model (DDL)](#5-data-model-ddl)
6. [Task queue](#6-task-queue)
7. [Workflow patterns (mandatory conventions)](#7-workflow-patterns-mandatory-conventions)
8. [Dashboard & API surface](#8-dashboard--api-surface)
9. [How existing services fold in](#9-how-existing-services-fold-in)
10. [Build order](#10-build-order)
11. [Decision log](#11-decision-log)
12. [Open questions & risk register](#12-open-questions--risk-register)
13. [Testing strategy](#13-testing-strategy)

---

## 1. Purpose & scope

The agent server is evolving from a set of disconnected request/response services into a **platform with two coordinated halves**:

1. **Marketing engine** — event-driven automation that starts when a course is published (or a lead arrives, or a schedule fires): social posts, email campaigns, SEO content, ad campaigns (later), lead intake + CRM updates.
2. **Conversation orchestrator** — real-time conversations with people across channels: email replies, website chatbot, IG/FB DMs, and later an AI telecaller (Vapi).

**Explicitly out of scope / untouched:** `course_builder` and the recommendation embeddings pipeline stay as they are. The conversation core *uses* them as tools; nothing here replaces them.

The two halves are connected **through shared data, not through code** — a unified contact record, a unified activity timeline, a domain event log, and a single approval queue. That shared spine is the core of this document.

---

## 2. Architecture overview — two lanes, one codebase

The split between the two halves is driven by **runtime shape**, not topic:

| | Marketing engine | Conversation orchestrator |
|---|---|---|
| Trigger | Events, schedules, webhooks | A human sends a message |
| Latency budget | Minutes is fine | Seconds; human is waiting |
| Execution | Queued jobs, retryable | Session-based, streaming |
| Scales on | Queue depth | Connection count |
| Failure mode | Retry later | Degrade gracefully now |

Therefore: **one repo, one Docker image, multiple entrypoints** that scale independently.

```
                        ┌────────────────────────────────────────────────┐
                        │              AGENT SERVER (one repo)           │
   CalxBook backend ───▶│  ┌──────────────┐        ┌──────────────────┐  │
   (events, webhooks)   │  │  api process │        │  worker process  │  │
                        │  │  (FastAPI)   │        │  (queue consumer │  │
   Platform webhooks ──▶│  │              │        │   + scheduler)   │  │
   (Meta, Brevo, ...)   │  │ · realtime   │        │                  │  │
                        │  │   conversation│  jobs  │ · marketing      │  │
   Chat widget ────────▶│  │   lane       │───────▶│   workflows      │  │
                        │  │ · action     │        │ · scheduled jobs │  │
                        │  │   endpoints  │        │   (drips, syncs) │  │
                        │  └──────┬───────┘        └────────┬─────────┘  │
                        └─────────┼──────────────────────────┼───────────┘
                                  │      reads + writes      │
                                  ▼                          ▼
                        ┌────────────────────────────────────────────────┐
                        │            SUPABASE (Postgres)                 │
                        │  contacts · activities · events · approvals ·  │
                        │  workflow_runs · campaigns · content_items ·   │
                        │  credentials · conversations · (queue tables)  │
                        └───────────────────┬────────────────────────────┘
                                            │ reads (JWT)      ▲ action calls
                                            ▼                  │ (X-Agent-Key proxy)
                        ┌────────────────────────────────────────────────┐
                        │   CalxBook backend (Node) + frontend dashboard │
                        │   insights, timelines, approval UI             │
                        └────────────────────────────────────────────────┘
```

Key rules:

- **Workflows never call each other.** They emit events; other workflows consume events. Adding a new consumer of `course.published` touches zero existing code.
- **The agent server is the only writer** to agent-owned tables. The CalxBook backend reads Supabase directly for dashboard data and proxies *actions* to the agent server.
- **All workflow state lives in Postgres**, never only in the queue. The queue is a delivery mechanism, swappable later (see D4).
- **Every new table carries `product_id`** (default `'calxbook'`). This is the cheap-now/expensive-later concession to the CalxMap multi-tenant direction — see [marketing-platform-roadmap.md](marketing-platform-roadmap.md).

---

## 3. The connective tissue: four shared data layers

The reason the current design feels disconnected is that each service owns its own tables and nothing shares a spine. Four layers fix that:

### 3.1 `contacts` — the CRM spine
One row per human, resolved across channels. **A "lead" is not a separate table — it is a facet of a contact** (`lifecycle_stage = 'lead'` + a `lead_details` extension row). The conversation core, campaign engine, lead intake, and telecaller all reference the same contact.

### 3.2 `activities` — the unified timeline
One interactions table for everything that happens to a contact: form submitted, follow-up sent, DM replied, email opened, call completed. Powers three things at once: the CRM timeline UI, the conversation core's memory of a person ("we already emailed them twice"), and marketing insights.

### 3.3 `events` + queue — the nervous system
Domain events (`course.published`, `lead.created`, `approval.granted`, …) are written to an `events` table (audit + replay) and fanned out as queued jobs to subscribed workflows. This is what coordinates the halves without coupling them.

### 3.4 `approvals` — one human-in-the-loop mechanism
A single generic approval queue replacing the three bespoke ones that were brewing (`seo_optimizations.status`, conversation `pending_review` messages, and social posts which had **none**). One table → one dashboard UI component → one pair of endpoints, for every kind of reviewable output: social posts, SEO changes, blog drafts, queued replies, ad campaigns.

Supporting layers: `workflow_runs` (observability + cost attribution), `credentials` (token lifecycle), `content_items` (generated assets), campaign tables (§5.8).

---

## 4. Event catalog

Events are the platform's public vocabulary. Names are `noun.verb_past`, payloads are versioned JSON. Every event row gets a `dedupe_key` (unique) so webhook retries and double-emits collapse to one processing.

| Event | Emitted by | Consumed by (v1) |
|---|---|---|
| `course.published` | CalxBook backend → `POST /events` | social-post workflow · SEO generate · campaign matcher ("notify interested leads") · *(later: ad-draft)* |
| `course.updated` | CalxBook backend | SEO regenerate (hash-gated) · approval staleness checker |
| `lead.created` | lead-intake workflow | qualification workflow |
| `lead.qualified` | qualification workflow | follow-up email workflow |
| `contact.unsubscribed` | Brevo webhook / conversation core | (updates consent; no fan-out needed — suppression is checked at send time) |
| `approval.granted` / `approval.rejected` | approval action endpoint | the workflow named in `approvals.on_approve_task` (resumes the gated pipeline) |
| `content.published` | publisher tasks | activity logger · metrics |
| `email.reply_received` | Brevo inbound webhook | conversation core (email adapter) · **campaign auto-pause** (§7.9) |
| `course.enrolled` | CalxBook backend | campaign exit checker (§5.8) · lifecycle-stage update (lead → customer) · conversation context refresh |
| `campaign.step_due` | scheduler (periodic job) | campaign send workflow |
| `conversation.handoff_requested` | conversation core | notification job |
| `credential.expiring` | credential monitor (daily job) | notification job |
| `metrics.sync_due` | scheduler (nightly) | GSC/GA4 sync · Brevo stats sync |

Adding a workflow = subscribing a new task to an existing event, or emitting a new event. No existing workflow changes.

---

## 5. Data model (DDL)

All tables: agent-owned, written only via service-role key, RLS enabled with read-only policies for authenticated dashboard users (same pattern as the lead-manager appendix). `product_id text not null default 'calxbook'` on every table (omitted below only where shown explicitly once).

**Placement (D21):** all of these tables live in the **same CalxBook Supabase project** as the existing application tables (`users`, `courses`, `user_embeddings`, …), in the `public` schema — same pattern as the embedding tables already established. Separation is **logical** (agent server is sole writer; RLS read-only for the dashboard; migrations owned by this repo per Q9), not physical. Same-DB is required for: FKs/joins against `courses`/`users`, the transactional `emit_event()` enqueue (D4), direct dashboard reads (D5), and read-only tools like `get_enrollment_status`. CalxMap, when onboarded, gets its **own separate Supabase project** resolved via ProductContext — `product_id` is for shared-code tenancy, not shared-database tenancy across products.

### 5.1 `contacts`

```sql
create table contacts (
  id               uuid primary key default gen_random_uuid(),
  product_id       text not null default 'calxbook',
  lifecycle_stage  text not null default 'subscriber'
                     check (lifecycle_stage in
                       ('subscriber','lead','mql','opportunity','customer','other')),
  first_name       text,
  last_name        text,
  display_name     text,
  email            text,          -- primary email (identities table holds all)
  phone            text,          -- E.164 normalized
  user_id          uuid,          -- ref to users(id) — read-only domain, no FK on purpose
  -- consent / suppression (per-channel; checked by EVERY outbound task, §7.4)
  email_opt_out    boolean not null default false,
  dm_opt_out       boolean not null default false,
  call_opt_out     boolean not null default false,
  consent_source   text,          -- where consent came from (form id, checkbox, ...)
  attributes       jsonb not null default '{}',  -- course_interest, locale, tags...
  merged_into      uuid references contacts(id), -- non-null ⇒ this row is a merge tombstone
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on contacts (product_id, lifecycle_stage);
create index on contacts (email) where email is not null;
```

### 5.2 `contact_identities` — cross-channel resolution

One contact, many identifiers. Inbound messages/leads resolve identity here first.

```sql
create table contact_identities (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references contacts(id) on delete cascade,
  kind        text not null check (kind in
                ('email','phone','ig_id','fb_psid','linkedin_urn',
                 'anon_session','user_id')),
  value       text not null,
  verified    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (kind, value)
);
```

**Merge rules (D7):**
- **Auto-merge** only on exact verified-identifier match (same email, same phone, same platform id).
- **Never auto-merge** on name similarity alone — flag as `possible_duplicate` in `attributes` for human review instead.
- Merging: repoint `contact_identities` and `activities` to the survivor, set loser's `merged_into`, keep the loser row as a tombstone (external refs stay resolvable). Field conflicts: most-recently-updated wins; original values preserved in the tombstone.
- Anonymous chat visitor (`anon_session`) who later provides an email that matches an existing contact → auto-merge (email is the stronger identifier).

### 5.3 `lead_details` — the "lead facet" of a contact

Replaces the standalone `leads` table from [lead-manager.md](lead-manager.md) §4 (that table was never created — no migration needed). All lead-manager qualification logic (§9 of that doc) is unchanged; only the storage target moves.

```sql
create table lead_details (
  contact_id           uuid primary key references contacts(id) on delete cascade,
  source               text not null,      -- 'facebook' | 'instagram' | 'linkedin' | 'chat' | 'email' | ...
  source_lead_id       text unique,        -- platform's lead id (null for non-ad sources)
  source_form_id       text,
  source_ad_id         text,
  source_page_id       text,
  raw_payload          jsonb,
  status               text not null default 'new',   -- lifecycle within lead processing
  missing_fields       text[] not null default '{}',
  qualification_score  integer check (qualification_score between 0 and 100),
  qualification_label  text check (qualification_label in ('hot','warm','cold')),
  rule_score           integer,
  ai_intent_score      integer,
  ai_genuine_score     integer,
  ai_reasoning         text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
```

### 5.4 `activities` — unified timeline (replaces `lead_events`, absorbs everything)

```sql
create table activities (
  id               uuid primary key default gen_random_uuid(),
  product_id       text not null default 'calxbook',
  contact_id       uuid references contacts(id) on delete cascade,  -- nullable: system activities
  type             text not null,   -- 'lead_received' | 'followup_sent' | 'email_opened' |
                                    -- 'dm_received' | 'post_published' | 'call_completed' |
                                    -- 'campaign_email_sent' | 'qualification_complete' | ...
  channel          text,            -- 'email' | 'chat' | 'instagram' | 'messenger' | 'voice' | 'web' | null
  direction        text check (direction in ('inbound','outbound')), -- null for internal
  payload          jsonb not null default '{}',
  workflow_run_id  uuid,            -- which run produced this (joins to workflow_runs)
  occurred_at      timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index on activities (contact_id, occurred_at desc);
create index on activities (product_id, type, occurred_at desc);
```

### 5.5 `events` — domain event log

```sql
create table events (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null default 'calxbook',
  type        text not null,               -- see §4 catalog
  payload     jsonb not null default '{}',
  source      text not null,               -- 'calxbook_backend' | 'webhook:brevo' | 'workflow:<name>' | 'scheduler'
  dedupe_key  text unique,                 -- idempotency: retries collapse here
  created_at  timestamptz not null default now()
);
```

Emission helper: `emit_event(type, payload, dedupe_key)` inserts the row **and enqueues consumer jobs in the same transaction** (a key benefit of the Postgres-backed queue, D4).

### 5.6 `approvals` — the single review queue

```sql
create table approvals (
  id               uuid primary key default gen_random_uuid(),
  product_id       text not null default 'calxbook',
  kind             text not null,   -- 'social_post' | 'seo_change' | 'blog_draft' |
                                    -- 'conversation_reply' | 'campaign_launch' | 'ad_draft'
  entity_type      text,            -- what it's about, e.g. 'course', 'contact', 'blog_post'
  entity_id        uuid,
  payload          jsonb not null,  -- full preview: the draft post/email/reply + context
  source_hash      text,            -- hash of source data at generation time (§7.3 staleness)
  confidence       text check (confidence in ('high','medium','low')),
  status           text not null default 'pending'
                     check (status in ('pending','approved','rejected','expired','stale')),
  expires_at       timestamptz,     -- optional; scheduler flips to 'expired'
  on_approve_task  text not null,   -- task name to enqueue when approved (§7.2)
  on_approve_args  jsonb not null default '{}',
  decided_by       text,
  decided_at       timestamptz,
  decision_note    text,            -- reviewer's edit/comment (edited payload goes here too)
  workflow_run_id  uuid,
  created_at       timestamptz not null default now()
);
create index on approvals (product_id, status, created_at desc);
```

**Migration note for the SEO plan:** `seo_optimizations` keeps its columns as the *storage* of generated fields, but its `pending_review` flow is driven by an `approvals` row (`kind='seo_change'`); on approval, the task flips `seo_optimizations.status` to `applied`. Same net behavior, one review UI.

### 5.7 `workflow_runs` — observability + cost attribution

Every queued workflow execution records itself here. This is what makes the dashboard's "what did the AI do / what failed / what did it cost" view possible, and it fixes the known gap that token counts currently die with the request.

```sql
create table workflow_runs (
  id                uuid primary key default gen_random_uuid(),
  product_id        text not null default 'calxbook',
  workflow          text not null,      -- 'social_post' | 'lead_intake' | 'seo_generate' | ...
  trigger_event_id  uuid references events(id),
  status            text not null default 'running'
                      check (status in ('running','waiting_approval','succeeded',
                                        'failed','cancelled')),
  steps             jsonb not null default '[]',  -- [{step, status, started_at, finished_at, error}]
  error             text,
  dry_run           boolean not null default false,  -- §7.5
  prompt_tokens     integer not null default 0,
  completion_tokens integer not null default 0,
  cost_usd          numeric(10,4) not null default 0,
  started_at        timestamptz not null default now(),
  finished_at       timestamptz
);
create index on workflow_runs (product_id, workflow, started_at desc);
create index on workflow_runs (status) where status in ('running','failed');
```

### 5.8 Campaign tables (email campaign engine)

```sql
create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  product_id    text not null default 'calxbook',
  name          text not null,
  type          text not null default 'email' check (type in ('email','social','ads')),
  status        text not null default 'draft'
                  check (status in ('draft','active','paused','archived')),
  audience      jsonb not null default '{}',   -- data-defined filter over contacts
  exit_criteria jsonb not null default '{}',   -- goal conditions that auto-complete an enrollment,
                                               -- e.g. {"on_event": "course.enrolled", "course_id": "..."}
                                               -- or {"lifecycle_stage_reached": "customer"}
  daily_send_limit integer not null default 200,  -- hard cap (deliverability + safety)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table campaign_steps (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  step_order    integer not null,
  delay_hours   integer not null default 0,     -- after previous step (or enrollment)
  template      jsonb not null,                 -- subject/body template or AI-generation spec
  unique (campaign_id, step_order)
);

create table campaign_enrollments (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references campaigns(id) on delete cascade,
  contact_id     uuid not null references contacts(id) on delete cascade,
  current_step   integer not null default 0,
  status         text not null default 'active'
                   check (status in ('active','completed','exited','unsubscribed',
                                     'paused_conversation','paused','bounced')),
  exit_reason    text,                          -- 'goal_reached' | 'audience_mismatch' | 'replied' | ...
  next_send_at   timestamptz,                   -- the scheduler's needle
  enrolled_at    timestamptz not null default now(),
  unique (campaign_id, contact_id)
);
create index on campaign_enrollments (status, next_send_at)
  where status = 'active';
```

Campaigns are **data-defined** (steps + templates in rows, not code) so non-technical admins can eventually manage them from the dashboard. The conversation core's `enroll_in_email_campaign` tool inserts into `campaign_enrollments`.

**Exit & re-check rules:**
- **Enrollment-time filtering is not enough** — audiences drift between enrollment and step N. Before *every* send, the send task re-checks: contact still matches `audience`, `exit_criteria` not met, suppression (`can_contact`), frequency cap, and conversation-quiet rule (§7.9). Any failure ⇒ skip or exit with `exit_reason`.
- **Event-driven exit:** `course.enrolled` (and lifecycle-stage changes) trigger the campaign exit checker — enrollments whose `exit_criteria` match are set to `exited`/`completed` immediately, not at next send. A prospect who enrolls at 2pm never gets the 4pm "still thinking about it?" email.
- Being an enrolled student does **not** globally block campaigns — upsell/next-level campaigns target customers by design. Exclusion is expressed per-campaign via `audience` + `exit_criteria`, not a hard rule.

### 5.9 `content_items` — generated assets

```sql
create table content_items (
  id               uuid primary key default gen_random_uuid(),
  product_id       text not null default 'calxbook',
  kind             text not null,   -- 'social_post' | 'email' | 'blog_post' | 'ad_creative'
  platform         text,            -- 'linkedin' | 'facebook' | 'instagram' | 'brevo' | null
  entity_type      text,            -- source entity, e.g. 'course'
  entity_id        uuid,
  body             jsonb not null,  -- text, image urls, subject, etc.
  status           text not null default 'draft'
                     check (status in ('draft','approved','publishing','published','failed','rejected')),
  publish_intent_at   timestamptz,  -- §7.6 publish guard: set BEFORE the external call
  published_at        timestamptz,
  provider_post_id    text,         -- platform post id / brevo message id
  provider_post_url   text,
  publish_error       text,
  workflow_run_id  uuid,
  created_at       timestamptz not null default now()
);
create index on content_items (entity_type, entity_id);
```

### 5.10 `credentials` — token lifecycle

Moves platform tokens out of "only in `.env`, someone re-runs a script" into tracked rows so expiry becomes a monitored, scheduled concern.

```sql
create table credentials (
  id            uuid primary key default gen_random_uuid(),
  product_id    text not null default 'calxbook',
  provider      text not null,     -- 'linkedin' | 'meta_page' | 'instagram' | 'brevo' | 'google'
  kind          text not null,     -- 'access_token' | 'refresh_token' | 'api_key'
  -- v1: secret VALUE stays in env/secret store; this row tracks metadata + expiry (see Q6)
  secret_ref    text not null,     -- env var name or vault key holding the actual secret
  expires_at    timestamptz,
  last_verified_at timestamptz,
  status        text not null default 'active'
                  check (status in ('active','expiring','expired','revoked')),
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

A daily `credential_monitor` job flips `status` and emits `credential.expiring` (→ notification) 14 and 3 days before `expires_at`.

### 5.11 Conversation tables

`conversations`, `messages`, `tool_invocations`, `handoffs` — **as designed in [conversational-ai-plan.md](conversational-ai-plan.md) §6**, with two amendments:

1. Its `contacts` DDL is replaced by §5.1/§5.2 here (identities move to `contact_identities`).
2. Queued replies (`messages.status = 'pending_review'`) additionally create an `approvals` row (`kind='conversation_reply'`) so they appear in the unified review queue; approval flips the message status and triggers send.

### 5.12 `seo_optimizations`, `blog_posts`, `seo_metrics`

As designed in [seo-marketing-plan.md](seo-marketing-plan.md) §7–8, with the approval-flow amendment in §5.6 above.

### 5.13 Conversation memory & knowledge base

The conversation core's context is assembled from **three memory layers + two knowledge sources**, all already in this data model except one new table.

**Memory layers (who is this person, what have we said):**

| Layer | Backing | Lifetime | Loaded as |
|---|---|---|---|
| **Thread memory** | `messages` of the current conversation | one conversation | recent messages verbatim; older turns collapsed into `conversations.summary` (new column, text) once the thread exceeds a token window |
| **Contact memory** | `contacts.attributes` (durable facts: interests, goals, objections, preferred name/language) + `contacts.summary` (new column: 2–3 sentence profile) | permanent, cross-channel | injected into the system prompt |
| **Activity context** | last ~15 `activities` rows for the contact | rolling | compact digest: "lead from FB ad (Jul 2) · got campaign email 'Python drip #2' (Jul 8) · enrolled in Course X (Jul 9)" |

After a conversation closes, a low-priority queued job (**memory distillation**) extracts new durable facts into `contacts.attributes`/`summary`. So memory learned in a DM is available in a later email thread — cross-channel memory falls out of the contact spine for free.

```sql
alter table contacts add column summary text;          -- distilled profile
-- conversations.summary added in the conversation migration
```

**Knowledge sources (what is true about CalxBook):**

| Source | Backing | Tool | Status |
|---|---|---|---|
| Course catalog | `course_embeddings` (existing) | `find_courses` | exists |
| Live per-user facts | read-only enrollment/progress tables | `get_enrollment_status`, `get_course_progress` | planned (conversational plan) |
| FAQ / policies / pricing rules | **new `knowledge_documents`** table | `knowledge_search` | new below |

```sql
create table knowledge_documents (
  id           uuid primary key default gen_random_uuid(),
  product_id   text not null default 'calxbook',
  title        text not null,
  body_md      text not null,
  category     text,               -- 'faq' | 'policy' | 'pricing' | 'about'
  status       text not null default 'published' check (status in ('draft','published','archived')),
  updated_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table knowledge_chunks (   -- same embedding pattern as course_embeddings
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references knowledge_documents(id) on delete cascade,
  chunk_text   text not null,
  embedding    vector(1536) not null,
  content_hash text not null,
  created_at   timestamptz not null default now()
);
create index on knowledge_chunks using hnsw (embedding vector_cosine_ops);
```

- Admins edit `knowledge_documents` from the dashboard (plain markdown); a queued job re-chunks + re-embeds on change (hash-gated, same pattern as course embeddings). Non-technical staff own the knowledge base without deployments.
- **Grounding rule (unchanged from the conversational plan):** pricing, policies, and dates come **only** from tools (`find_courses`, `knowledge_search`, enrollment reads) — never from model memory. If no source answers, the model says so or escalates; it does not improvise.
- v1 bootstrap: start with ~10–20 documents (refund policy, how live courses work, payment methods, certificates…). Until the corpus exists, the core is course-only + escalate (per Q14).

---

## 6. Task queue

### 6.1 Why a durable queue is required (not optional)

Not for throughput — volume is tiny (a few publishes/week, dozens of leads/day, hundreds of campaign emails/day). It's required for:

1. **Approval-resume** — "generate draft → human approves tomorrow → publish" needs a job that can be enqueued later. Impossible with FastAPI `BackgroundTasks`.
2. **Scheduled work** — drip steps ("send step 2 after 72h"), scheduled posts, nightly metric syncs.
3. **Restart-surviving retries** — today a server restart mid-social-post silently loses the work.
4. **Observability** — persistent job records power the dashboard.

### 6.2 Decision: Postgres-backed queue (Procrastinate), not Celery/Redis — see D4

| | Procrastinate (chosen) | Celery + Redis |
|---|---|---|
| Extra infrastructure | **None** (uses existing Supabase Postgres) | Redis in dev, compose, prod |
| Jobs visible to dashboard | Yes — jobs are rows, queryable | Opaque unless mirrored to PG anyway |
| Transactional enqueue | Yes — contact insert + job enqueue in one tx | No — DB write and enqueue can drift on crash |
| Windows dev | Fine | Second-class (solo pool / WSL / Docker) |
| Scheduling / periodic | Built-in (`periodic` + scheduled jobs) | Celery Beat |
| Throughput ceiling | ~hundreds of jobs/sec — orders of magnitude above our need | Very high |
| Ecosystem / hiring signal | Smaller | Industry default |

**Reversibility guard:** all workflow state lives in our own tables (`workflow_runs`, `approvals`, `campaign_enrollments`); tasks are thin functions over that state. Swapping Procrastinate→Celery later is plumbing, not a redesign.

**Supabase specifics:** Procrastinate uses LISTEN/NOTIFY → workers need a **direct connection** (port 5432 / session mode), not the transaction pooler (6543). Budget connections: 1 API process + 1–2 workers is well within plan limits, but wire the two connection strings explicitly from day one.

### 6.3 Scheduler responsibilities (replaces "CalxBook backend cron heartbeat")

Periodic jobs inside the worker process:
- campaign tick (every ~5 min): find `campaign_enrollments` where `next_send_at <= now()` → emit `campaign.step_due`
- nightly: GSC/GA4 sync, Brevo stats sync → `seo_metrics` / `activities`
- daily: credential monitor, approval expiry sweep
- hourly: retry sweep over `failed` runs marked retryable

---

## 7. Workflow patterns (mandatory conventions)

Every marketing workflow follows these; they exist to prevent specific failure modes.

### 7.1 Workflows are chains of short idempotent tasks
State in Postgres between steps; each task re-runnable. No task holds in-memory state a restart would lose. **Do not build a generic declarative workflow engine in v1** (D6) — explicit task chains per workflow; extract abstractions only after ≥3 workflows exist.

### 7.2 Approval gates never block a worker
The generating task writes the draft (`content_items`/`seo_optimizations`), creates the `approvals` row (with `on_approve_task` + args), sets its run to `waiting_approval`, and **ends**. The approval decision endpoint emits `approval.granted` → enqueues `on_approve_task`. No sleeping, no polling.

### 7.3 Staleness protection
Generation snapshots a `source_hash` of the input data into the approval. `course.updated` (and the expiry sweep) re-check pending approvals for that entity; mismatch ⇒ status `stale` (dashboard shows "source changed — regenerate"). Prevents approving Tuesday's draft about Monday's course.

### 7.4 Suppression is checked at send time, centrally
One shared function — `can_contact(contact_id, channel)` — consulted by **every** outbound task (campaign send, lead follow-up, conversation outbound, telecaller). Checks the per-channel opt-out flags on `contacts`. No outbound path may bypass it. Legal requirement (GDPR / DPDP / CAN-SPAM), not a courtesy.

### 7.5 Dry-run mode from day one
`workflow_runs.dry_run` propagates into a workflow context. Publishers/senders in dry-run mode log the would-be action as an activity (`payload.dry_run = true`) instead of calling the external API. Plus an email **test-recipient allowlist** env (`SAFE_EMAIL_RECIPIENTS`) honored in non-prod. This is how the course-published fan-out gets tested without posting to the real LinkedIn page or emailing real leads.

### 7.6 Publish guard — external side effects are not blindly retryable
"Call OpenAI" is safe to retry; "post to Instagram" is not (double-post). Pattern for every external side effect:
1. Set `content_items.publish_intent_at = now()`, status `publishing` — **before** the API call.
2. Make the call; record `provider_post_id` / error after.
3. On retry of a task that finds `publish_intent_at` set but no result: **verify first** (query the platform API / Brevo message id) before re-attempting; if unverifiable, mark `failed` for human review rather than re-posting.

### 7.7 Cost guardrails
Every LLM call records tokens/cost onto its `workflow_run`. Two limits: per-run token budget (workflow aborts over budget) and a monthly platform threshold that pauses non-conversation workflows and notifies (kill-switch). Conversation core keeps its own tool-loop cap (≤5 tool calls) per its plan.

### 7.8 Event idempotency
All event emission goes through `emit_event()` with a `dedupe_key` (e.g. `course.published:<course_id>:<published_at>`). Webhook handlers construct deterministic keys so platform retries (Meta retries aggressively) collapse.

### 7.9 Campaign ↔ conversation coordination (automation yields to conversation)

The campaign engine and the conversation core share contacts and the email channel; without rules they will talk over each other. The governing principle: **a live conversation always outranks automation.**

1. **Conversation-quiet rule.** `can_contact()` is extended beyond opt-outs: campaign sends are skipped for any contact with an open conversation (`conversations.status in ('open','handoff')`) active within the last **72h** (configurable). The skipped step reschedules (`next_send_at` pushed) rather than being lost.
2. **Reply ⇒ auto-pause.** Campaign emails carry a reply-to pointing at the conversational mailbox, so replies flow into the conversation core like any inbound email. On `email.reply_received` from a contact with active enrollments, those enrollments flip to `paused_conversation` — a human/AI dialogue has started; drip emails mid-dialogue are tone-deaf at best, contradictory at worst. Resume: manually from the dashboard, or automatically N days after the conversation closes (configurable per campaign; default = manual).
3. **Frequency cap.** `can_contact()` also enforces a global marketing-email ceiling per contact (default: max 3/week across *all* campaigns + follow-ups). Conversation replies don't count — answering someone is never spam.
4. **Shared timeline prevents contradictions.** Campaign sends are `activities`, and the conversation core loads recent activities into its context (§5.13) — so the AI knows "we sent them the Python-course drip yesterday" and neither repeats nor contradicts it. Automation is visible to conversation; conversation is visible to automation. This is the payoff of the single `activities` table.
5. **One sender identity strategy.** Campaigns send from the marketing subdomain (Q7) but reply-to routes to the conversational mailbox — deliverability isolation without breaking the reply path.

---

## 8. Dashboard & API surface

### 8.1 The split (D5)

- **Reads / insights → CalxBook backend (Node)**, querying Supabase directly with the user's JWT (RLS read policies). No proxy hop through the agent server for lists and charts.
- **Actions → agent server**, proxied by the Node backend with `X-Agent-Key`. The browser never talks to the agent server.
- Exception: computed insights only the agent server can produce (e.g. "explain this lead score") get an agent-server endpoint.

### 8.2 Read surface (Node backend — suggested endpoints over the shared tables)

| Endpoint (Node) | Backing tables | Dashboard view |
|---|---|---|
| `GET /dashboard/overview` | `workflow_runs`, `approvals`, `activities` | Runs today, failures, pending approvals, cost this month |
| `GET /contacts` (+filters) | `contacts`, `lead_details` | CRM list, funnel by lifecycle stage |
| `GET /contacts/:id/timeline` | `activities`, `conversations` | Per-person timeline |
| `GET /approvals?status=pending` | `approvals` | Unified review queue (all kinds) |
| `GET /workflow-runs` (+filters) | `workflow_runs` | "What did the AI do", failures, per-run cost |
| `GET /campaigns/:id/stats` | `campaign_enrollments`, `activities` | Sends, opens, clicks, unsubscribes |
| `GET /content` (+filters) | `content_items` | Published posts w/ URLs, per-platform results |
| `GET /seo/status`, `GET /seo/metrics` | `seo_optimizations`, `seo_metrics` | Catalog SEO health, positions, candidates |
| `GET /conversations` (+queue) | `conversations`, `messages`, `handoffs` | Open threads, review queue, handoffs |

Because everything funnels into `activities`/`workflow_runs`/`approvals`, this is **one dashboard with filters, not six dashboards**. Interim option if frontend bandwidth is tight: Metabase/Retool over the same tables for insights v1 (Q4).

### 8.3 Action surface (agent server, `X-Agent-Key`)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/events` | CalxBook backend emits domain events (`course.published`, …) — replaces per-service webhook endpoints over time |
| `POST` | `/approvals/{id}/decide` | `{decision: approve\|reject, edited_payload?, note?}` → emits `approval.granted/rejected`, enqueues `on_approve_task` |
| `POST` | `/workflow-runs/{id}/retry` | Re-enqueue a failed run (respects publish guard §7.6) |
| `POST` | `/campaigns` / `PATCH /campaigns/{id}` | Create / edit data-defined campaigns |
| `POST` | `/campaigns/{id}/pause` · `/resume` | Campaign control |
| `POST` | `/contacts/{id}/merge` | Manual merge of flagged duplicates |
| `POST` | `/seo/backfill` | Bulk catalog run (from SEO plan) |
| — | conversation endpoints | As defined in [conversational-ai-plan.md](conversational-ai-plan.md) §8 |
| — | existing webhooks (Meta leads, Brevo inbound, Vapi) | Unchanged ingest paths; internally they `emit_event()` |

Existing `course_builder` and embedding endpoints are unchanged.

---

## 9. How existing services fold in

| Existing | Disposition |
|---|---|
| **Lead manager** ([doc](lead-manager.md)) | Becomes the *lead-intake workflow*: webhook → `emit_event('lead.created')` → resolve/create contact + `lead_details` → qualification workflow → follow-up (suppression-checked, via queue). Its `leads`/`lead_events` tables (never created) are superseded by `contacts`+`lead_details`+`activities`. Qualification logic (rules + AI scoring) unchanged. **Also de-hardcode** `calxbook.com` URLs / "CalxBook Team" strings into product config while touching it. |
| **Social media** | Moves from synchronous endpoint to consumer of `course.published`: generate → `content_items` draft → approval gate (**new — it currently publishes with zero review**) → publish task with guard §7.6. LinkedIn publisher still needs the versioned-Posts-API migration once the second app is approved. |
| **SEO** ([doc](seo-marketing-plan.md)) | Plan survives. Review flow via shared `approvals` (§5.6); GSC/GA sync via scheduler (§6.3); still hard-blocked by the SSR/CSR answer (Q1). |
| **Email campaigns** | Built natively on §5.8 + scheduler. Brevo webhooks (delivered/opened/clicked/unsubscribed) land as `activities` + consent updates. |
| **Conversational AI** ([doc](conversational-ai-plan.md)) | Survives nearly untouched; runs in the realtime lane; shares `contacts`/`activities`; queued replies join the unified approval queue. Voice/Vapi later, per that doc. |
| **Course builder + recommendations** | **Untouched.** Used as tools/inputs by the above. |
| **Ad campaigns** | Deferred (real money + Meta/Google review) per [roadmap](marketing-platform-roadmap.md) — but `approvals.kind='ad_draft'`, `content_items.kind='ad_creative'`, and the event catalog already have its seats reserved. |
| **Telecaller** | Deferred; Vapi Option A per the conversational plan — it will read/write the same `contacts`/`activities`/`conversations`. |

---

## 10. Build order

| # | Phase | Contents | Exit criteria |
|---|---|---|---|
| 1 | **Foundation** | Migrations for §5 core tables (`contacts`, `contact_identities`, `lead_details`, `activities`, `events`, `approvals`, `workflow_runs`, `credentials`); Procrastinate wiring (worker entrypoint, `emit_event`, direct-connection config); docker-compose for local dev; `can_contact()`; dry-run plumbing | A demo event fans out to a demo task; run visible in `workflow_runs` |
| 2 | **Lead intake on the foundation** | Lead-manager logic re-based onto contacts/activities/queue; Brevo suppression webhook → consent flags | Real (or test) lead flows end-to-end; timeline visible via SQL |
| 3 | **Course-published fan-out** | `POST /events`; social workflow moved to queue + approval gate + publish guard; SEO-generate consumer (behind Q1 where rendering-dependent) | Publish a course → drafts appear in approvals → approve → posted (dry-run first) |
| 4 | **Email campaign engine** | §5.8 tables, scheduler tick, send task, Brevo event ingestion | A 2-step drip runs against test recipients |
| 5 | **Dashboard v1** | Node read endpoints (§8.2) + approval/action proxy; UI or Metabase interim (Q4) | Admin can review/approve everything from one screen |
| 6 | **Conversation core v1** | Per [conversational-ai-plan.md](conversational-ai-plan.md) phasing (core+tools → email adapter → chat → DMs), on shared contacts | First auto-replied email thread |
| 7 | **Later** | Ads, telecaller, CalxMap onboarding | Per roadmap doc |

Parallel to all phases: platform approvals (Q2/Q3) — pure calendar time, start immediately.

---

## 11. Decision log

Agreed in planning sessions 2026-07-03 → 2026-07-10. Revisit deliberately, not accidentally.

| # | Decision | Rationale | Status |
|---|---|---|---|
| **D1** | Two lanes by **runtime shape** (batch/queued marketing vs realtime conversation), one repo/image, separate `api` and `worker` entrypoints | Different latency/scaling/failure profiles; avoids both microservice sprawl and one blob | ✅ Agreed |
| **D2** | Workflows connect through **shared data + events**, never direct calls | Decoupling; adding consumers touches nothing existing | ✅ Agreed |
| **D3** | **`contacts` is the platform spine**; a lead is a contact facet (`lead_details`), not its own table; unified `activities` timeline replaces `lead_events` | One person = one record across marketing + conversation; timeline powers CRM UI, conversation memory, and insights at once. Possible because lead tables were never created | ✅ Agreed |
| **D4** | **Postgres-backed queue (Procrastinate)** instead of Celery/Redis | No new infra; jobs are queryable rows; transactional enqueue; no Windows pain. Reversible because workflow state lives in our tables (queue = plumbing) | ✅ Agreed |
| **D5** | Dashboard **reads via Node backend directly from Supabase (JWT/RLS); actions proxied to agent server (`X-Agent-Key`)**; agent server is sole writer | Existing `/leads` pattern generalized; no needless proxy hop; single writer keeps integrity | ✅ Agreed |
| **D6** | **One generic `approvals` table + one review UI**; no per-service approval mechanisms. **No generic workflow engine in v1** — explicit task chains | Three bespoke approval flows were brewing; unify. Abstractions extracted after ≥3 real workflows, not before | ✅ Agreed |
| **D7** | Contact **merge rules**: auto-merge only on exact verified identifiers; never on name similarity; tombstone with `merged_into`; newest-wins field conflicts | Prevents both duplicate people and wrong merges; rules written before DDL exists | ✅ Agreed |
| **D8** | **Suppression/consent lives on `contacts`, checked centrally at send time** by every outbound path | Legal (GDPR/DPDP/CAN-SPAM); retrofitting across N senders is miserable | ✅ Agreed |
| **D9** | **Publish guard** (§7.6): intent-row before external side effects; verify-before-retry | External publishes aren't idempotent; prevents double-posting/emailing | ✅ Agreed |
| **D10** | **Dry-run mode + test-recipient allowlist from day one** | Makes fan-out testable without real posts/emails; painful to thread in later | ✅ Agreed |
| **D11** | **Approval staleness** via `source_hash` + expiry sweep | Prevents approving drafts of since-edited sources | ✅ Agreed |
| **D12** | `product_id` on every new table now | Cheap now; expensive migration later when CalxMap onboards | ✅ Agreed |
| **D13** | Cost attribution per `workflow_run` (+ per-run budget + monthly kill-switch) | Token counts currently die with the request; SaaS ambition requires per-tenant cost | ✅ Agreed |
| **D14** | Scheduler (drips, syncs, sweeps) lives **in the worker**, replacing the earlier "CalxBook backend cron heartbeat" idea | Scheduling belongs with the jobs; one less cross-system dependency | ✅ Agreed |
| **D15** | `course_builder` + recommendation embeddings stay **separate and unchanged** | Working fine; conversation core consumes them as tools | ✅ Agreed (user directive) |
| **D16** | Integrate-don't-rebuild for channels (Brevo email, Meta/LinkedIn APIs, Vapi voice); ads + telecaller **deferred** | Per [roadmap](marketing-platform-roadmap.md); risk ordering | ✅ Agreed |
| **D17** | **Conversation outranks automation** (§7.9): quiet rule, reply ⇒ campaign auto-pause, global frequency cap, campaign reply-to routes into the conversation core | Prevents drip emails talking over live dialogues; shared `activities` makes each side visible to the other | ✅ Agreed |
| **D18** | **Campaign exit is event-driven + re-checked per send** (§5.8): `exit_criteria` on campaigns, `course.enrolled` event exits matching enrollments immediately; enrollment status alone never trusted | A prospect who enrolls must never get the next "still thinking?" email; enrolled users remain targetable by upsell campaigns via audience design | ✅ Agreed |
| **D19** | **Three-layer conversation memory** (thread / contact / activity digest, §5.13) with post-conversation distillation into `contacts`; **knowledge base = `knowledge_documents` + pgvector chunks**, admin-editable, strict tool-grounding for pricing/policy | Cross-channel memory falls out of the contact spine; KB reuses the proven embedding pattern; non-technical staff maintain content | ✅ Agreed |
| **D20** | **Testability is a code-design requirement** (§13): publishers/senders behind interfaces with fakes; injectable clock; scheduler tick callable as a plain function; gate logic as pure functions; `SAFE_EMAIL_RECIPIENTS` fail-closed outside prod | These seams are cheap at write time and impossible to retrofit cleanly; the whole platform's job is external side effects, so "real API, fake audience" must be structurally supported | ✅ Agreed |
| **D21** | **New tables live in the same CalxBook Supabase project** (`public` schema, agent-owned, RLS'd) — logical separation, not a second database. CalxMap later gets its **own** Supabase project via ProductContext | Same-DB required for FKs to `courses`/`users`, transactional enqueue (D4), direct dashboard reads (D5), read-only support tools. Matches the existing `user_embeddings` pattern | ✅ Agreed |

---

## 12. Open questions & risk register

Ordered roughly by urgency. Check off / annotate as resolved; move settled ones into §11.

### Start now (long lead times, outside our control)

- [ ] **Q1 — Frontend SSR vs CSR** *(owner: CalxBook frontend dev)* — **hard-blocks the entire SEO workstream** (Phase 0 of the SEO plan). Open since the SEO plan was written. Chase the answer.
- [ ] **Q2 — Meta app reviews** *(owner: us; lead time: 1–5 days per review + business verification)* — two **separate** permission sets: `leads_retrieval` (lead ads) and `pages_messaging` + `instagram_manage_messages` (DMs). **Reviews require a screencast of the integration working in Development mode first** — dev mode gives full API access restricted to app admins/testers, so the sequence per review is: build minimal integration → test in dev mode → record screencast → submit.
  - *Start now (no code):* business verification on business.facebook.com (often the slowest part) + privacy policy URL.
  - *`leads_retrieval`:* testable without real ads via the [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing) — fires the real `leadgen` webhook for app-role users. Minimal build = the Phase 2 webhook + Graph fetch slice. Webhook needs a public HTTPS URL → tunnel (ngrok/cloudflared) or deployed backend (ties to Q5).
  - *DM permissions:* don't wait for Phase 6 — build a **thin slice** early (webhook receives DM → one canned reply via Send API, tested by DMing own page from an admin account) purely to record the screencast and unlock review; it becomes the skeleton of the real DM adapter.
- [ ] **Q3 — LinkedIn approvals** *(owner: us; lead time: 1–4 weeks)* — (a) Community Management API second-app approval was pending as of early July — **check status**; (b) Marketing Developer Platform + `r_leads_automation` for lead sync. Publisher code still needs the versioned-Posts-API migration once (a) lands.
- [ ] **Q4 — Dashboard UI ownership & bandwidth** — who builds the CalxBook frontend screens (approvals, CRM, insights)? If bandwidth is tight, decide whether Metabase/Retool over Supabase is the interim insights layer.
- [ ] **Q5 — Deployment target** — production URL still TBD; the architecture needs **two long-running processes** (api + worker) + scheduler ⇒ rules out simple serverless. Candidates: Railway / Render / VPS + Docker Compose. Affects worker wiring — decide before Phase 1 ends.
- [ ] **Q6 — DNS access** — who controls calxbook.com DNS? Needed for GSC domain verification **and** email auth (Q7).

### Settle before/during Phase 1 (design gaps)

- [ ] **Q7 — Email deliverability setup** — SPF/DKIM/DMARC; decide on a **marketing subdomain** (e.g. `mail.calxbook.com`) so campaigns can't torch transactional-email reputation; volume warm-up plan; confirm Brevo plan limits vs expected volume.
- [ ] **Q8 — Secret storage for `credentials`** — v1 keeps secret *values* in env with `secret_ref` pointing at them (§5.10). Decide the target: Supabase Vault, encrypted column, or host secret store — must be settled before per-customer OAuth (CalxMap) ever starts.
- [ ] **Q9 — Migrations discipline** — adopt a migrations folder in this repo as the single source of truth for agent-owned tables (this plan adds ~10). Confirm the Node backend team agrees the agent server owns these tables' schema.
- [ ] **Q10 — Notification channel for humans** — where do "credential expiring", "run failed", "approval pending > 48h" alerts go? (Email to admin, Slack, dashboard-only?)

### Inherited open questions (from prior plans, still open)

- [ ] **Q11 — Email inbound mechanism** (conversational plan O1): Brevo Inbound Parse vs IMAP poller.
- [ ] **Q12 — Calendar provider for `book_demo`** (O4): Cal.com / Calendly / Google Calendar.
- [ ] **Q13 — Web search provider + budget** (O5).
- [ ] **Q14 — FAQ/policy knowledge corpus** — *mechanism now decided* (`knowledge_documents` + embedded chunks, §5.13 / D19); still open: who writes the initial ~10–20 documents (refund policy, live-course logistics, payments, certificates) and signs off on their accuracy. Until then the core runs course-only + escalate.
- [ ] **Q15 — PII/consent & transcript retention policy** (O8) — retention window for conversation transcripts; consent language for automated replies; DPDP applicability.
- [ ] **Q16 — Chat widget ownership + streaming choice** (O2): SSE vs request/response for v1.

### Known risks to keep in view (no action yet, just awareness)

- **Meta 24-hour messaging window** constrains DM outbound (conversation plan §5.3) — adapter must enforce it.
- **Supabase direct-connection budget** — fine at 1 api + 2 workers; re-check before scaling workers.
- **Ad campaigns = real money** — when un-deferred, they need spend caps + mandatory approval (`kind='ad_draft'` is never auto-approved) + their own review cycle with Meta/Google.
- **Scope pressure** (roadmap doc §5): the realistic pace is one thin phase at a time; resist parallelizing phases 2–6.

---

## 13. Testing strategy

The design's existing seams make the platform testable: tasks are thin functions over Postgres state, dry-run (D10) skips only the external call, and the `events` table doubles as a **replay log** (captured real payloads become fixtures re-emittable through any workflow).

### 13.1 Test pyramid

| Layer | What | How |
|---|---|---|
| **Unit (most tests)** | Gate logic: qualification scoring, `can_contact()` (opt-outs + frequency + quiet rule), audience matching, exit criteria, merge rules, staleness hash, publish-guard decisions | pytest, pure functions, no I/O. Requires gates to be written as functions over data, not functions doing their own DB reads |
| **LLM steps** | Output *handling*, not model quality | Pydantic schema validation at every call site; CI feeds **recorded** LLM responses (fixture JSON). Never gate CI on live OpenAI calls. Prompt quality = small golden-set eval, run manually/nightly only |
| **Workflow integration** | Full chains: event → jobs → state transitions → approval → publish | Real local Postgres (`supabase start` or dockerized PG + migrations) — **never mock Postgres**; the SQL and transactional enqueue are the logic. Externals faked at the adapter boundary; Procrastinate in-memory connector where enqueue behavior itself is asserted |
| **Staging E2E** | Real APIs, fake audience | See 13.3 |

Canonical integration test shape: *emit `course.published` → assert 3 jobs enqueued → run social task → assert `content_items` draft + `approvals` row + run `waiting_approval` → decide → assert publish task enqueued → run with fake publisher → assert `published` + activity row.*

### 13.2 Time travel (drip campaigns)

Never wait real hours: (a) injectable clock (`freezegun` / `now()` on the workflow context); (b) `next_send_at` is just a column — set it to the past and call the scheduler tick **directly as a function**. Both are design requirements (D20), not test-file tricks.

### 13.3 External providers — sandbox reality

Pattern everywhere: **real API, fake audience.**

| Provider | Test path | Caveat |
|---|---|---|
| Meta lead ads | [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing) — real test leads, real webhook, no spend | Public HTTPS (tunnel) + app-role account |
| Meta DMs | Dev mode: DM own page/IG from admin/tester account | Same |
| LinkedIn | **No sandbox exists** — dummy/test company page, or post-and-delete | Create the test page early; staging never points at the real CalxBook page |
| Brevo | `SAFE_EMAIL_RECIPIENTS` allowlist → own inboxes; trigger open/click/unsub ourselves to test event ingestion | Allowlist enforced fail-closed outside prod |
| Webhooks (all) | Capture real payloads once → commit as fixtures → replay via `events` | Signature verification tested with known-key fixtures |

**Test-account inventory (Phase 1 setup task):** private FB page, test IG account, dummy LinkedIn page, a few test mailboxes.

### 13.4 Conversation testing

- **Harness = the debug endpoint** from the conversational plan: scripted multi-turn transcripts + fixture LLM responses; assert on **decisions** (tools called, confidence-gate outcome, queued vs auto-send), not exact wording.
- **Adversarial grounding checks:** "how much does X cost?" with an empty KB must escalate/refuse — never an invented price.
- Manual **chat playground** (curl against the debug endpoint) — conversation-quality bugs are found by talking, not asserts.

### 13.5 Per-phase acceptance ritual

Staging = second Supabase project + test-account inventory + tunnel (or deployed staging once Q5 lands). Every build-order phase exits through the same three gates:

1. Integration tests green.
2. Full scenario in **staging with `dry_run=true`** — inspect `workflow_runs`/`activities`/`content_items` for what *would* have happened.
3. Same scenario **real, against test accounts**. Only then may the workflow point at real pages/recipients.

Post-go-live, `workflow_runs` is the continuous test report; any weird production event is replayed in staging from the events log.

### 13.6 What NOT to build

No generic test framework before workflows exist (same spirit as D6); no Postgres mocking; no coverage targets; no CI-gated LLM evals. The 20% that catches 80%: unit tests on the gates, one end-to-end integration test per workflow, the dry-run ritual before anything touches a real audience.

---

## Appendix — glossary

- **Spine (`contacts`)** — the single cross-channel person record everything references.
- **Facet** — an extension row on a contact for a specific role (e.g. `lead_details`).
- **Event fan-out** — one emitted event enqueuing N independent consumer jobs.
- **Approval gate** — a workflow pause where a draft awaits human decision; resumed by enqueueing `on_approve_task`.
- **Publish guard** — intent-before-call + verify-before-retry pattern for non-idempotent external effects.
- **Dry run** — workflow execution where external side effects are logged, not performed.
- **Tombstone** — a merged contact row kept (with `merged_into`) so old references still resolve.
