# Calxmap — Flow Simplification & AI Agent Roadmap

**Status:** Proposal for review
**Owner:** Product + Engineering
**Written:** 30 Aug 2026
**Related docs:** `PRICING_NEGOTIATION_UX_FLOW.md`, `PRICING_AND_COMPENSATION_MODEL.md`, `CALXMAP_1_5_PRODUCT_PRD.md`, `platform-architecture.md`

---

## 1. One-page summary

Today an institution posts a requirement, experts apply, the institution screens them, moves them
through interview, negotiates the rate through messages, locks a booking, and then a super admin
verifies onboarding. Every one of those steps has its own status field, and the statuses multiply
against each other. That multiplication — not the absence of AI — is what creates the endless edge
cases.

The goal of this roadmap is to reduce the institution's journey to **four actions**:

1. Tell the agent what you need.
2. Wait (no work for you).
3. Pick from a short, ready-to-hire list.
4. Confirm.

And the expert's journey to **three actions**: set up profile and rate once, say yes or no to an
opportunity on WhatsApp, attend a short screening call.

**The single most important rule in this document:** we simplify the model *first*, and add the AI
agent *second*. If we attach an AI agent to today's branching flow, edge cases will increase, not
decrease — because the agent adds its own failure paths (no answer, call dropped, wrong commitment,
timeout, needs human takeover) on top of the ones we already have.

---

## 2. The problem, in plain words

### 2.1 We are running two different businesses in one product

There are only two proven models for connecting buyers with expert talent:

| | **Marketplace model** (Upwork, Fiverr) | **Curated model** (Toptal, Mercor) |
|---|---|---|
| Who finds whom | Experts apply themselves | Platform finds and presents |
| Screening | Buyer does it | Platform does it |
| Price | Negotiated per deal | Set by platform / published rate card |
| Buyer sees | Everything: all applicants, all stages | Only a short final list |
| Needs messaging + negotiation + dispute machinery | **Yes, unavoidable** | **No** |
| Buyer effort | High | Very low |

Our **dashboard is built as a marketplace**. Our **expectation is curated**. Negotiation threads,
interview stages, application tabs and rate counters are *correct features* for a marketplace — they
are what we would have to keep building and debugging forever. They are *unnecessary* in a curated
model.

Until we pick one lane, no amount of AI will remove the edge cases.

### 2.2 The complexity is measurable

These are the actual state machines in the codebase today:

| Area | Where | Distinct states | Values |
|---|---|---|---|
| Application (expert path) | `backend/server.js:5232` (inline array), `applicationRate.service.js:403` | 4 | `pending`, `interview`, `accepted`, `rejected` |
| Rate negotiation | `frontend/src/lib/projectCompensation.ts:413`, `20260711110000_applications_posted_rate_offer.sql:8` | **8** (+2 intents, +11 history actions) | `agreed_posted`, `open_to_negotiate`, `expert_proposed`, `institution_countered`, `expert_countered`, `agreed`, `posted_rate_offered`, `posted_rate_declined` |
| Requirement / project | `backend/src/shared/projectStatus.js:9` | 4 canonical **+ 7 legacy aliases + 2 filter pseudo-states** | `open`, `running`, `completed`, `closed` |
| Booking | `bookingCompletion.service.js` | 5 used (+`confirmed` permitted but never written) | `in_progress`, `completion_requested`, `completed`, `cancellation_requested`, `cancelled` |
| Onboarding request | `20260814010000_onboarding_offer_expiry.sql:14` | 5 | `pending_review`, `offer_sent`, `accepted`, `declined`, `expired` |
| **Sibling funnels** | `add-internship-applications.sql:9`, `add-freelance-schema.sql:26` | 9 + 3 | internships have their own 9-state machine; freelance its own 3 |

**26 distinct states in the expert hiring journey — 38 if you count the parallel internship and
freelance funnels**, which solve the same problem with different words and separate code.

The real damage is not the count, it is the multiplication. A single application card in the
institution dashboard has to render correctly for **4 application statuses × 8 rate statuses = 32
combinations**, before we even add booking status and onboarding status on top. Nobody can test 32
combinations per screen, so bugs are guaranteed.

Five more structural problems make it worse:

- **The same logic is written twice.** `projectStatus.js` / `projectStatus.ts`, and
  `compensation.js` / `projectCompensation.ts` — the status list, the labels and the 7-entry legacy
  alias map are copied verbatim on both sides. Every rule change needs two edits in two languages,
  and the two sides silently drift apart. (We just hit exactly this problem with the offer letter
  template being duplicated in a PDF renderer and an HTML renderer.)
- **The database does not enforce the states.** `applications.status` and `bookings.status` have
  **no CHECK constraint**. The real list lives in scattered inline arrays across `server.js`
  (`:5232`, `:4038`, `:4174`, `:3958`). Meanwhile `bookings.status` defaults to `confirmed`, a value
  no code ever writes — bookings are created directly as `in_progress`.
- **Three vocabularies for the same idea.** The expert funnel says `interview`; freelance says
  `shortlisted`; internships say `shortlisted_corporate`. For expert applications there is no
  shortlist state at all — moving to `interview` *is* the shortlist, and it requires an interview
  date to be set.
- **One decline writes three state machines.** An onboarding decline updates
  `onboarding_requests.status`, cancels the booking, and reverts the application to `rejected`
  (`onboarding.service.js:326-345`) — and that rejected application still carries a locked
  `agreed` / `agreed_posted` rate. This single cascade is the source of the re-onboarding bugs we
  have been fixing.
- **There is no communication channel at all.** A `messages` table exists in
  `database-setup.sql:118` *with live RLS policies* — and zero backend routes, zero frontend client.
  It is dead schema. Real communication happens through three unrelated note/history mechanisms
  (`rate_note`, `negotiation_history`, `completion_history`) plus one-way notifications and email.
  Experts in India do not live in dashboards — they live on WhatsApp. The channel we built is the
  channel nobody uses, which is why negotiation stalls and produces "stuck" applications.

### 2.3 What the edge cases actually come from

Ranked by how much pain they cause:

1. **Rate negotiation** — 8 statuses, up to 3 counter-rounds per side, over-budget approval,
   super-admin escalation, and a negotiation history timeline. This is roughly 60–70% of the
   complexity.
2. **Branching funnel visible to users** — pending / interview / shortlisted / rejected tabs, plus
   re-onboarding after a decline, which reopens closed states.
3. **Mandatory manual admin gate** — every engagement waits for a super admin to verify before the
   offer letter goes out.
4. **Duplicated frontend/backend rules** — silent drift.

---

## 3. The core decision (needs sign-off before Phase 1)

> **Calxmap becomes a curated platform, not a marketplace.**
>
> The institution never sees applicants, stages, or negotiations. It sees a short list of
> ready-to-hire experts with a fixed price, and picks one.
>
> **Per-engagement rate negotiation is removed.** Experts publish a rate card once. The platform
> matches only experts whose rate fits the budget. The single pricing question an expert is ever
> asked is *"This engagement pays ₹X. Yes or no?"*

Everything in this roadmap depends on that decision. If we keep negotiation, we stay a marketplace
and we must keep (and properly finish) the messaging, negotiation and dispute machinery instead.

**Why removing negotiation is safe:** Toptal is a billion-dollar business where the client never
negotiates with the talent. The platform sets the rate. Buyers do not actually want to haggle — they
want a fair, fast, defensible price. Sellers want predictable income. Negotiation mostly serves
platform indecision about pricing.

---

## 4. The target journeys

### 4.1 Institution (4 touchpoints)

```
1. TELL          Chat or call with the agent:
                 "Gen AI, 2 sessions, 16 hours, offline, Mumbai campus, next month."
                 Agent turns it into a structured requirement and reads it back to confirm.
                          ↓
2. WAIT          "We'll have your shortlist in 48 hours."   ← institution does nothing
                          ↓
3. PICK          3–5 experts. Each card shows: profile, verified skills, rating,
                 FIXED price, confirmed availability, and the agent's screening
                 summary + call transcript. Institution clicks Select on one.
                          ↓
4. CONFIRM       Booking created → offer letter → delivery begins.
```

No applications tab. No interview scheduling. No negotiation panel. No rejected list.

### 4.2 Expert (3 touchpoints)

```
1. SET UP ONCE   Profile + verified skills + rate card (per session / day / hour,
                 plus a minimum) + availability.
                          ↓
2. SAY YES/NO    WhatsApp: "Gen AI training, 2 sessions, Mumbai, 15 Sep, pays ₹8,750.
                 Interested?"  → Yes / No. One tap.
                          ↓
3. SHORT CALL    10-minute screening (AI or human). Then: selected or not selected.
```

### 4.3 Super admin (exception handling only)

Admin stops being a mandatory gate in every engagement. The system auto-approves and only routes to
a human when something is flagged: price outside the allowed band, expert not KYC-verified, agent
confidence low, expert disputes something, or no shortlist could be produced in time.

---

## 5. The new data model: hide states, don't delete them

We are **not** deleting states. Statuses are needed for audit, finance and disputes. We are
**removing them from the user interface** by splitting into two layers.

### Layer 1 — Engagement (this is what the institution sees)

One requirement = one engagement, moving in a straight line, no branches:

| State | Meaning for the institution |
|---|---|
| `draft` | Being described to the agent |
| `sourcing` | We are finding and screening experts |
| `shortlist_ready` | Your shortlist is ready — pick one |
| `selected` | You picked; we're getting paperwork done |
| `onboarding` | Offer letter sent / being signed |
| `active` | Training is running |
| `completed` | Done and paid |

7 states, one path, zero branching. (`cancelled` exists as a terminal exit from any state.)

### Layer 2 — Candidate (internal; agent and ops only)

One row per expert per engagement. **This never renders as a workflow to any user.**

| State | Meaning |
|---|---|
| `matched` | Agent shortlisted them as a candidate |
| `invited` | Outreach sent |
| `interested` / `declined` / `no_response` | Their answer |
| `screened` | Screening call done, scorecard recorded |
| `presented` | Included in the institution's shortlist |
| `selected` / `not_selected` | Final outcome |

The institution only ever sees candidates in `presented` state. The expert only ever sees their own
single row, as a simple message thread on WhatsApp.

**This is the whole trick.** Today's internal pipeline states became tabs in the institution
dashboard. That is what caused the explosion. Same states, hidden, cause no pain.

---

## 6. The roadmap

Six phases. Phases 0 and 1 contain no AI at all and deliver most of the benefit. Do not reorder.

---

### Phase 0 — Measure before cutting (1–2 weeks)

**Goal:** Know the truth about where users actually get stuck, so we cut the right things and can
prove improvement later.

**Why this comes first:** Right now our belief about what is broken is based on developer pain, not
data. If we cut based on guesses, we will remove something a customer quietly depends on.

**What to do:**

- Add simple event logging at every funnel step: requirement posted, expert applied, moved to
  interview, rate proposed, rate countered, rate agreed, booking locked, offer sent, offer accepted.
  Record a timestamp and who acted.
- Pull 3 months of history and answer:
  - How many applications reach `interview` and then never move? For how long?
  - How many engagements actually use negotiation? How many rounds on average? How many end in
    agreement vs. going silent?
  - Median time from requirement posted → booking confirmed.
  - How many engagements needed manual admin or developer intervention?
- Count support/WhatsApp complaints per week and tag each with the step it came from.
- Interview 5 institutions and 10 experts. Ask experts one question specifically: *"Did you ever log
  into the dashboard to negotiate? If not, how would you have preferred to be contacted?"*

**Definition of done:** A one-page baseline sheet with: negotiation usage %, median time-to-booking,
manual interventions per engagement, and edge-case tickets per week.

**Do not skip this.** It is the only way to prove in month 6 that the redesign worked.

---

### Phase 1 — Collapse the model (8–12 weeks) ⭐ biggest win, zero AI

**Goal:** Remove the branching and the negotiation. After this phase the product is already
dramatically simpler, and it is now *possible* to automate — because the flow is finally
deterministic.

**Why now:** An AI agent cannot help while the underlying model has 32 render combinations per card.
Automation on top of ambiguity produces ambiguity faster.

#### 1a. Make expert supply machine-readable

This is the precondition for everything later. An agent can only match on structured data.

- **Skills taxonomy.** Today expertise is free text / arrays. Free text cannot be matched reliably
  ("Gen AI" vs "GenAI" vs "Generative AI" vs "AI/ML"). Build a controlled skill list (start with
  150–300 skills across your live categories), map existing expert profiles onto it (bulk + agent
  assisted), and make new profiles pick from the list. Keep a free-text "other" field, but matching
  only uses the taxonomy.
- **Rate card.** Expert publishes, once: rate per session / per day / per hour, and a minimum they
  will accept. This replaces per-application `proposed_rate`.
- **Availability.** Structured — dates or weekly recurring slots, not a paragraph. It must be
  trustworthy enough to promise a start date to an institution.
- **Serviceable locations + travel willingness**, since offline delivery is a real constraint.

#### 1b. Delete negotiation

- Drop the 8 rate statuses to **2**: `rate_ok` (expert's rate card fits the engagement) and
  `rate_declined` (expert said no to the offered amount).
- Remove from the UI: negotiation panel, counter-offer buttons, negotiation history timeline,
  over-budget approval checkbox, rate escalation queue.
- Matching rule: an expert is only ever shown an engagement whose pay is **at or above** their
  published minimum. Then the only question is yes/no.
- Keep the audit trail of what was offered and accepted — that is legal record, not workflow.

#### 1c. Collapse the funnel

- Introduce the `engagements` + `candidates` two-layer model from Section 5.
- Remove from the institution dashboard: applications list, pending/interview/shortlisted/rejected
  tabs, interview scheduling, per-application actions.
- Unify vocabulary across expert / freelance / internship funnels — one candidate model, one set of
  words, one code path. (Today `interview` and `shortlisted` mean the same thing in different
  funnels.)
- Make super-admin verification **exception-based**: auto-approve unless flagged. Keep the admin
  screen for flagged cases and for audit.

#### 1d. Kill the duplicated logic

- Move the shared rules (status transitions, pricing, matching eligibility) to **one** source the
  backend owns, and have the frontend consume it via API or a generated shared package. Stop
  hand-maintaining `projectStatus.js` + `projectStatus.ts` and `compensation.js` +
  `projectCompensation.ts` in parallel.

#### 1e. Fix the schema debt (do this before anything reads the data programmatically)

An audit of the current schema found problems that will silently break any matching engine. These are
small fixes now and expensive later:

- **Columns that exist in production but not in migrations.** `experts.subskills` and the entire
  `custom_domains` table are used throughout the code (`server.js:873`,
  `superAdmin.repository.js:750`, `bulkImportService.js`) but have **no `CREATE`/`ALTER` in any
  `.sql` file**. They exist only in the live database. Any fresh environment is broken, and nobody
  can reason about their shape. Write the missing migrations first.
- **The reverse matching function is not in version control.** `GET` recommended-experts calls a
  Postgres RPC `get_recommended_experts` (`server.js:4510`) whose definition exists nowhere in the
  repo. Recover it from the database and commit it, or replace it.
- **Add the missing CHECK constraints** on `applications.status` and `bookings.status` so the
  database, not scattered inline arrays, is the source of truth. Remove the unused `confirmed`
  default on bookings.
- **Delete the dead `messages` table** and its RLS policies, or implement it. Right now it is a
  security surface with no owner.
- **`is_verified` is fake.** Self-signup sets `experts.is_verified = true` unconditionally
  (`server.js:878`, comment: *"Auto-verify since email verification is required for login"*). It
  cannot be used as a quality signal by any ranking logic. Either give it real meaning or stop
  reading it.
- **Dead branch in the existing scorer.** `calculateProjectMatchScore` (`server.js:4460-4505`)
  allocates 20% of the score to comparing `expert.required_expertise` — a column that only exists on
  `projects`, not `experts`. That branch always scores zero, so the live match score is silently
  out of 80%, not 100%.
- **Availability is not safely bookable yet.** Slots have no overlap constraint (only
  `end_at > start_at`), no `held` / `booked` state, and no link from a slot to a booking; recurrence
  is flattened into concrete rows at write time with no rule identity to edit or cancel, and
  timezone is assumed UTC. Meanwhile a legacy free-text `experts.availability` JSONB still competes
  as a second source of truth. Fix this before promising an institution a start date.
- **Add contact + consent fields**: WhatsApp number, explicit outreach opt-in, opt-out timestamp.
  Today `experts` has no consent column of any kind, and there is no WhatsApp or SMS integration in
  the codebase.

#### Migration and safety

- **Do not drop columns or delete rows.** Keep old statuses in the database and map them onto the new
  model (`interview` and `shortlisted` → candidate `screened`, etc.).
- Put the new journey behind a **feature flag per institution**. Run 5–10 institutions on the new
  flow while everyone else stays on the old one. Compare.
- Old engagements finish on the old flow. Only new requirements enter the new flow.

**Definition of done:**

- An institution can post a requirement and reach a confirmed booking without ever seeing an
  application status or a rate negotiation.
- Every expert has a rate card, structured availability, and taxonomy skills (target: 90%+ of active
  experts).
- Render combinations per card drop from 32 to under 6.
- Only one place in the codebase defines each status rule.

**Metrics:** edge-case tickets/week down 50%+; manual admin steps per engagement down to ~0;
median time-to-booking improved.

**Risks:** experts may resist publishing a rate card (mitigate by pre-filling from their history and
explaining that it means fewer, better-matched offers); a few institutions may miss haggling
(mitigate by showing them the speed gain and a fair-price explanation).

---

### Phase 2 — Concierge: agent proposes, human acts (4–6 weeks)

**Goal:** Prove that our matching is actually good, before spending money automating outreach.

**Why now:** This is deliberately a "Wizard of Oz" phase — the institution experiences the final
product (a curated shortlist in 48 hours), but behind the curtain a human is doing the sending.
Toptal still runs on human matchers and is a billion-dollar company. This is not a shortcut, it is
the model.

**What to build:**

- **Matching engine v1.** Given a requirement, rank experts by: taxonomy skill overlap, rate fit,
  availability fit, location fit, past rating, and past reliability. Start with a transparent scoring
  formula — not a black box. Add semantic/embedding similarity only where the taxonomy is too coarse.
- **Ops console (internal).** One screen showing: requirement, ranked candidates with score reasons,
  a draft WhatsApp outreach message per candidate, and buttons to send / mark interested / mark
  declined / add screening notes.
- **Shortlist builder.** Ops assembles 3–5 screened candidates and publishes the shortlist to the
  institution.
- **Institution shortlist screen.** The new "Pick" step from Section 4.1.

**Explainability matters.** Each shortlist card must answer "why this person?" — matched skills,
relevant past engagements, rating, and screening notes. Curated models fail when buyers can't see
the reasoning.

**Definition of done:** 20–30 real engagements delivered this way, with a measured shortlist
acceptance rate (institution picks someone from the shortlist) above 70%, and median
time-to-shortlist under 48 hours.

**Metrics:** shortlist acceptance rate; time-to-shortlist; ops minutes spent per engagement (this is
the number automation must reduce later).

**Risk:** if institutions reject shortlists, the problem is matching quality or supply depth — and it
is far cheaper to discover that here than after building voice automation.

---

### Phase 3 — Automate outreach on WhatsApp, text first (4–6 weeks)

**Goal:** Remove the ops person from routine outreach. Cheapest, safest, highest-leverage
automation.

**Why text before voice:** It is far cheaper per contact, asynchronous (experts reply when free),
leaves a perfect written record, is much easier to keep compliant, and — most importantly — it is
where Indian trainers already are. Voice is glamorous and low-ROI at this stage.

**What to build:**

- WhatsApp Business API integration with approved template messages for: opportunity invite,
  reminder, "you've been shortlisted", "not selected this time", booking confirmed, session
  reminder.
- Interest capture via quick-reply buttons (Yes / No / Tell me more), written straight into the
  candidate record.
- Automatic follow-up rules: one reminder after 24 hours, then mark `no_response` and pull in the
  next-ranked candidate automatically. This "keep the funnel topped up" logic is what actually
  guarantees the 48-hour promise.
- **Consent and opt-out.** Explicit opt-in at expert signup, an easy STOP, and honour it. India's
  DND / TRAI rules and WhatsApp's own policy both require this.
- Agent-mediated only: institution and expert do not get each other's direct contact before booking.
  This also protects the non-circumvention clause in the engagement letter.

**Definition of done:** 80%+ of outreach sent without a human touching it; expert response rate at
or above the Phase 2 human baseline.

**Metrics:** outreach automation %; response rate; time-to-first-yes.

---

### Phase 4 — AI screening (6–10 weeks)

**Goal:** Remove the human screening call, and turn screening output into our actual product
differentiator.

**Why now, and not earlier:** Screening is the expensive, skill-dependent part of the work. It is
also the part where a transcript and a structured scorecard create real value for the institution —
this is what makes a curated shortlist trustworthy. Mercor and micro1 have already proven AI
interviews work commercially at scale; this is no longer experimental.

**What to build:**

- **Structured screening script per skill family**, generated from the requirement: 5–8 questions,
  each with a scoring rubric.
- **Text/async screening first** (WhatsApp or a web form with a time limit), then **AI voice** for
  experts who prefer to talk or who don't respond to text. Voice is an add-on channel, not the
  default.
- **Scorecard + transcript + short summary** attached to the candidate record and shown on the
  shortlist card.
- **Hard guardrails.** The agent may *ask* and *record*; it may never *commit*. It cannot agree a
  price, a date, or a scope change outside pre-authorised bounds. Any commitment happens when the
  institution clicks Select.
- **AI disclosure.** The expert is told clearly at the start that they are speaking with an
  automated assistant, and can request a human instead.
- **Confidence threshold.** Low agent confidence → route to a human screener, don't guess.

**Definition of done:** AI-screened candidates get selected by institutions at a rate at least equal
to human-screened ones (measured against the Phase 2 baseline), with under 10% of screenings needing
human rescue.

**Metrics:** screening automation %; selection rate of AI-screened vs human-screened; expert
satisfaction with the screening experience (one-question survey).

---

### Phase 5 — Conversational intake and near-autopilot (6–8 weeks)

**Goal:** Remove the last form. The institution describes the need in plain language.

**What to build:**

- Conversational requirement intake (chat, and optionally voice) that produces the structured
  requirement, then reads it back for confirmation. Paradox's "Olivia" proved conversational intake
  converts better than forms in high-volume hiring; the same applies to buyers.
- Automatic clarifying questions for anything missing (budget, mode, dates, headcount).
- Full loop: intake → match → outreach → screen → shortlist → select → onboard, with humans only on
  exceptions.
- **Exception dashboard** for ops: everything the agent couldn't finish, with a reason and a
  suggested action.

**Definition of done:** 70%+ of engagements complete with zero human intervention; the exception
dashboard is the only ops surface used day to day.

---

### Phase 6 — Continuous improvement (ongoing)

- Feed outcomes back into ranking: who got selected, who delivered well, whose attendance and
  ratings were good. Matching should get better with every completed engagement.
- Re-tune pricing bands from real accept/decline data.
- Expand the skill taxonomy from actual requirement text.
- Quarterly review of the exception log — every recurring exception is either a product bug or a
  missing rule.

---

## 7. What we never automate or scrap

These look like complexity but they are **compliance and money**. They stay, with humans
accountable:

- Offer letter generation, electronic signature, and the signed-copy audit trail (legal record under
  the IT Act, 2000).
- Attendance capture and attendance-driven payment release.
- Dispute handling.
- KYC / expert verification.
- Finance: invoices, TDS, GST, payouts.
- Full audit log of every agent action — who or what did it, when, and on what basis. An autonomous
  agent makes this *more* important, not less.

---

## 8. Preconditions and dependencies

Phase 2 onwards cannot start until these are true. Phase 1 delivers them.

This is the honest assessment of where we stand today, from an audit of the actual schema and code:

| Precondition | Today | Why it matters / what is missing |
|---|---|---|
| Skills taxonomy | **Missing** | No taxonomy table, no foreign keys. Skills are free-text `text[]` validated against a hardcoded frontend constant (`constants.ts:28-210`, duplicated in `server.js:809`). Worse, supply and demand use *different unjoined vocabularies*: experts have `domain_expertise` / `subskills`, projects have `required_expertise`, freelance has `required_skills`. There is nothing to join on. |
| Expert rate card + minimum | **Partial** | Only one advisory scalar `experts.hourly_rate` is published upfront. Every real price is negotiated per application across four compensation units. An agent cannot price a match without a human round-trip. |
| Structured availability | **Partial** | Slot rows are genuinely structured, but not safe to auto-book against (see Phase 1e). |
| Contactability + consent | **Partial** | Email and phone exist; **no WhatsApp field, and zero consent / opt-in / opt-out columns**. There is no WhatsApp or SMS integration in the codebase at all. Automated outreach today would be legally unguarded. |
| Quality signal | **Missing** | `is_verified` is hardcoded `true` at signup. `kyc_status` and `calxbook_verified` are manual admin toggles. Ratings only exist after a booking, so every new expert is a cold start at zero. **There is no assessment, test, or scored-interview record anywhere in the schema.** Nothing trustworthy to rank on. |
| AI infrastructure | **Missing** | No LLM SDK, no embeddings, no pgvector, no vector column anywhere. The only matcher is a hardcoded weighted string-overlap function with a dead 20% branch. |
| Supply depth per category | Unknown | Measure in Phase 0. |

**Read that table again before committing to a timeline.** Two of these are hard blockers for
autonomous matching: without a taxonomy there is nothing to match on deterministically, and without a
quality signal there is no defensible way to rank. Pricing and availability would force a human into
the loop at the commit step even if matching worked perfectly. This is precisely why Phase 1 exists
and why Phase 2 keeps a human in the loop.

**Supply depth is the one that kills the promise.** Launch category by category — go live with the
new flow only in skills where we have enough vetted, rate-carded, available experts to produce a
shortlist reliably. A missed 48-hour promise damages trust more than a slow old flow.

---

## 9. Risks and how we handle them

| Risk | Handling |
|---|---|
| AI commits to a price or date it shouldn't | Agent proposes only within pre-authorised bounds; commitment happens on institution's Select click |
| Automated calls/messages breach DND/TRAI or WhatsApp policy | Explicit opt-in, honoured STOP, approved templates, AI disclosure at call start |
| Experts find automated outreach impersonal | Text-first, one reminder maximum, always offer a human; measure expert satisfaction |
| Match quality is poor | Phase 2 concierge validates quality with humans before automation is built |
| Thin supply → missed 48-hour promise | Category-by-category launch; keep a human fallback path |
| Institutions distrust a curated black box | Every shortlist card shows why this expert matched, plus screening evidence |
| We break existing live engagements | Feature flag per institution; old engagements finish on the old flow; nothing deleted |
| Agent failures create *new* edge cases | Every agent step has a timeout, a retry limit, and one defined human fallback — designed up front, not added later |

---

## 10. Metrics scoreboard

Track from Phase 0 and review monthly:

| Metric | Baseline (Phase 0) | Target |
|---|---|---|
| Median time: requirement → shortlist | measure | under 48 hours |
| Median time: requirement → confirmed booking | measure | under 5 days |
| Shortlist acceptance rate | n/a | above 70% |
| Expert outreach response rate | measure | above 40% |
| Engagements needing human intervention | measure | under 10% |
| Edge-case tickets per week | measure | down 80% |
| Render combinations per application card | 32 | under 6 |
| Distinct states in the hiring journey | 26 (38 incl. sibling funnels) | under 15, one funnel |
| Ops minutes per engagement | measure (Phase 2) | under 10 |

The last three are the ones that tell us whether the *simplification* worked, as opposed to whether
the AI is impressive.

---

## 11. Rough sequencing

| Phase | Focus | Effort | AI involved? |
|---|---|---|---|
| 0 | Measure | 1–2 weeks | No |
| 1 | Collapse the model | 8–12 weeks | No |
| 2 | Concierge (human sends) | 4–6 weeks | Matching only |
| 3 | WhatsApp automation | 4–6 weeks | Light |
| 4 | AI screening | 6–10 weeks | Yes |
| 5 | Conversational intake + autopilot | 6–8 weeks | Yes |
| 6 | Continuous improvement | Ongoing | Yes |

Effort assumes the current team size and is deliberately rough. Phase 1's real cost is driven by two
things we cannot estimate until we start: how many existing expert profiles need skill-taxonomy
backfill, and how much of the undocumented schema (Phase 1e) turns out to be load-bearing.

**If only one phase can be funded, fund Phase 1.** It removes most of the pain and requires no AI.

---

## 12. Decisions needed before we start

1. **Curated or marketplace?** (Section 3.) Everything depends on this.
2. **Do we remove per-engagement negotiation?** Full removal, or the middle path where the agent asks
   a one-time yes/no at the offered rate?
3. **Who sets the price** if experts' rate cards disagree with the institution's budget — platform
   band, or institution's number wins and we only match experts who fit?
4. **Are we willing to make rate card + structured availability mandatory** for experts to receive
   opportunities? (Recommended: yes — it is the gate for everything else.)
5. **Which 2–3 categories launch first**, based on where supply is deepest?
6. **Does the institution still get an optional "meet the expert" call** after the shortlist? If yes,
   keep it as a single booking action from published availability — never as a workflow stage.

---

*This document describes intended direction, not implemented behaviour. Update it when decisions in
Section 12 are made.*
