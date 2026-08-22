# Calxmap — Expert Dashboard Redesign (AI-First Flow)

**Status:** Proposal for review
**Written:** 1 Sep 2026
**Companion docs:**
- `CALXMAP_AI_END_TO_END_USER_JOURNEY.md` — full user journey + availability model
- `AI_AGENT_FLOW_SIMPLIFICATION_ROADMAP.md` — why we are simplifying

This document redesigns the expert portal around one principle:

> **WhatsApp handles confirmations. The dashboard shows what needs doing and what is booked.
> Never show the internal pipeline as tabs again.**

---

## 1. What we are replacing

### Today (`expert/home` + `expert/dashboard`)

| Screen | What it does | Problem |
|---|---|---|
| `expert/home` | Browse all open requirements, search, filter, apply | Curated model has no public job board |
| `expert/dashboard` | **5 tabs:** Pending · Interview · Offer Letters · Bookings · Rejected | Each tab is a pipeline stage → combinatorial edge cases |
| Per-tab cards | Rate negotiation panels, application status, interview slots, onboarding cross-links | Same engagement appears in 2–3 tabs with different states |
| Availability calendar | Manual slot entry, bulk weekly expansion | Experts do not maintain it; empty = "unavailable" |

### Target

| Screen | What it does |
|---|---|
| **`expert/home`** → rename mentally to **Dashboard** | Single landing page: action items + schedule strip + earnings |
| **`/opportunities`** (new, optional deep link) | Flat list of all invites — pre-booking only |
| **`/bookings`** (new, or tab within dashboard) | Confirmed engagements only — post-signature |
| **Profile / Settings** | Pattern, rate card, verification — unchanged entry points |

**Two user-visible buckets. Four chips max. Zero pipeline tabs.**

---

## 2. Design rules (non-negotiable)

1. **WhatsApp is primary for:** invite response, availability/pattern confirm, interview slot pick,
   rolling session confirm, reminders.
2. **Dashboard is primary for:** offer letter sign, attendance, earnings, booking detail, profile edit.
3. **Expert sees at most 4 chip types** on any card — not 26 internal states.
4. **Backend states stay detailed** (for ops, audit, agent). UI collapses them.
5. **Empty states must never say** "no open requirements" or "no applications" — say "no new
   invites" and show profile health instead.
6. **An opportunity exists in exactly one list** until offer is signed, then it moves to Bookings
   and disappears from Opportunities.

### The 4 expert-facing chips

| Chip | Meaning | Expert action |
|---|---|---|
| **Respond** | Agent or institution sent an invite; no answer yet | Yes / No / Dates badal sakte hain (WhatsApp or dashboard) |
| **Waiting** | Expert responded; institution or system is deciding | None — informational only |
| **Action needed** | Expert must do something on dashboard | Sign offer · Confirm rolling sessions · Mark attendance |
| **Scheduled** | Interview or session has a fixed time | Join link or session detail |

Rejected / expired / declined items **auto-archive after 7 days** — not a permanent "Rejected" tab.

---

## 3. The cast — one expert, two parallel engagements

We follow **Rahul Verma** across **three weeks** so you can see the dashboard evolve in real time.
He has two engagements at different stages plus profile housekeeping.

| | |
|---|---|
| **Rahul Verma** | Gen AI trainer, Mumbai, 6 years, verified (score 84). On Calxmap for 2 months. |
| **Engagement A** | MIT-WPU · 2-month Gen AI program (Oct–Nov) · agent-matched · long / rolling schedule |
| **Engagement B** | Sinhgad Institute · 2-day workshop (9–10 Sept) · direct booking by institution |
| **Engagement C** | (closed) · Completed workshop in August · for earnings history |

This mirrors the journey doc: Rahul's long program (§14.12) + Meera's short workshop (§5–9), combined
in one expert's view.

---

## 4. Information architecture

```text
Expert portal
├── Dashboard (expert/home)          ← default landing after login
│   ├── Greeting + profile health strip
│   ├── Action needed (0–n cards, sorted by urgency)
│   ├── This week (schedule strip)
│   ├── Earnings snapshot
│   └── Active bookings preview (max 3, link to /bookings)
│
├── Opportunities (/expert/opportunities)   ← optional; same data as dashboard action+w waiting
│   └── Flat list, filter: All · Respond · Waiting · Closed
│
├── Bookings (/expert/bookings)
│   ├── Active
│   └── Completed
│
├── Booking detail (/expert/bookings/[id])
│   ├── Sessions + rolling confirm (long programs)
│   ├── Attendance
│   ├── Offer letter (signed PDF)
│   ├── Institution contact (post-booking only)
│   └── Earnings for this booking
│
└── Profile (/expert/profile, /expert/profile/edit)
    ├── Rate card
    ├── Standing pattern (L1) — not a date calendar
    ├── Verification status + retake
    └── KYC
```

### Navigation (top bar)

**Remove:** "Browse Requirements" / job-board links.

**Keep:**

| Nav item | Badge |
|---|---|
| **Home** | — |
| **Opportunities** | Count of `Respond` + `Action needed` (pre-booking) |
| **Bookings** | Count of active bookings |
| **Profile** | — |

Notification bell unchanged — deep-links into the right card.

---

## 5. Screen-by-screen specification

### 5.1 Dashboard — default landing

#### Block A: Greeting + profile health (always visible)

```text
┌─────────────────────────────────────────────────────────────────┐
│  Good afternoon, Rahul 👋                                        │
│                                                                  │
│  ✅ Verified · Gen AI (84/100)    ⭐ 4.6 (9 sessions)            │
│  Response rate: 92%  ·  Pattern updated 12 days ago              │
│                                                                  │
│  [Update pattern]  — only if stale > 30 days or missing fields   │
└─────────────────────────────────────────────────────────────────┘
```

**Show profile health when there are zero invites** — this is the anti-empty-state.

Never show: verification CTA if already verified (unless expiring in < 30 days).

---

#### Block B: Action needed (only if count > 0)

Sorted by urgency:

1. Offer letter unsigned (expires in X days)
2. Respond to invite (sent X hours ago)
3. Rolling session confirm pending
4. Attendance not marked (session was yesterday)
5. Interview in < 24 hours (join link)

**Max 5 cards on dashboard.** "View all (2 more)" → `/opportunities`.

---

#### Block C: This week (schedule strip)

Horizontal scroll or compact list — **confirmed times only**, not a maintainable calendar:

```text
┌─────────────────────────────────────────────────────────────────┐
│  This week                                                       │
│  ─────────────────────────────────────────────────────────────  │
│  Tue 9 Sept · 3:00 PM   Interview · MIT-WPU        [Join]       │
│  Sat 4 Oct  · 9:00 AM   Session 1 · MIT-WPU        (in 25d)    │
│  —                                                               │
│  Nothing else scheduled                                          │
└─────────────────────────────────────────────────────────────────┘
```

Rules:
- Show interviews even pre-booking (they are scheduled opportunities).
- Show confirmed sessions only after rolling confirm or fixed-date booking.
- Do **not** show grey empty calendar cells.

---

#### Block D: Earnings snapshot

```text
┌─────────────────────────────────────────────────────────────────┐
│  Earnings                                                        │
│  September (so far):  ₹14,000 paid  ·  ₹7,000 pending           │
│  [View all bookings →]                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Block E: Active bookings preview

Max 3 cards. Each is a **summary row**, not a full pipeline:

```text
┌─────────────────────────────────────────────────────────────────┐
│  MIT-WPU Gen AI Program          Active · 0/16 sessions done    │
│  Sinhgad Workshop                Starts 9 Sept · 2 sessions       │
└─────────────────────────────────────────────────────────────────┘
```

Tap → `/expert/bookings/[id]`.

---

### 5.2 Opportunity card — the only pre-booking component

One card component for every invite. Fields:

| Field | Shown? | Notes |
|---|---|---|
| Institution name | **Masked** until booking | "MIT-WPU" ok; contact person name hidden |
| Skill / title | Yes | "Gen AI Training Program" |
| Date range or exact dates | Yes | "1 Oct – 30 Nov" or "9 & 10 Sept" |
| Delivery | Yes | Offline · Pune |
| Fee (expert net) | Yes | "~₹1,12,000 total" or "₹14,000" |
| Match source | Yes, small | "Matched by Calxmap" or "Direct request" |
| Availability summary | Yes | "Sat AM confirmed" or "9 & 10 Sept confirmed" |
| Chip | Yes | One of: Respond · Waiting · Scheduled · Action needed |
| Rate negotiate | **Never** | Fixed platform rate |

#### Card actions by chip

| Chip | Primary CTA | Secondary |
|---|---|---|
| **Respond** | `[Haan]` `[Nahi]` `[Dates badal sakte hain]` | Same as WhatsApp — API call, not navigation |
| **Waiting** | None | `[Details]` expand only |
| **Scheduled** | `[Join interview]` if today/tomorrow | `[Reschedule]` → opens WhatsApp deep link or in-app chat |
| **Action needed** (pre-booking) | Only if rolling confirm before booking is rare | Usually post-booking |

**After Respond → Yes:** card chip changes to **Waiting** or **Scheduled** (if interview slot picked on
WhatsApp). Card **stays in Opportunities** — does not move to Bookings until offer signed.

---

### 5.3 Opportunities page (`/expert/opportunities`)

Flat list. **No tabs for Pending / Interview / Offers.**

Optional filter chips (not pipeline stages):

```text
[ All (4) ]  [ Respond (1) ]  [ Waiting (2) ]  [ Closed (1) ]
```

**Closed** = declined by expert, rejected by institution, expired, or completed without booking.
Auto-archive after 7 days from closed date.

Sort order:
1. Respond (oldest first — SLA)
2. Action needed
3. Scheduled (soonest first)
4. Waiting (newest first)
5. Closed (collapsed at bottom)

---

### 5.4 Bookings page (`/expert/bookings`)

Two sections only:

```text
Active (2)
──────────
[ MIT-WPU Gen AI Program card ]
[ Sinhgad Workshop card ]

Completed (7)
──────────
[ August Data Science workshop · ₹12,000 · ⭐ 4.8 given ]
...
```

**Booking card fields:**

| Field | Notes |
|---|---|
| Title | Institution + program name |
| Status | `Active` · `Completed` · `Cancelled` |
| Progress | "4/16 sessions" or "2/2 sessions done" |
| Next session | Date/time or "Rolling — confirm pending" |
| Earnings | Earned / pending for this booking |
| Offer letter | Link to signed PDF |

**Never on booking card:** application status, interview history, negotiation thread.

---

### 5.5 Booking detail (`/expert/bookings/[id]`)

#### Short engagement (Sinhgad — fixed dates)

```text
┌─────────────────────────────────────────────────────────────────┐
│  Sinhgad Institute · Gen AI Workshop                             │
│  Active · Offline · Pune                                         │
│                                                                  │
│  Sessions                                                        │
│  ✅ 9 Sept  · 9 AM–5 PM  · Attendance marked                    │
│  ⏳ 10 Sept · 9 AM–5 PM  · Tomorrow                             │
│                                                                  │
│  Earnings: ₹14,000 total · ₹7,000 paid · ₹7,000 after completion│
│                                                                  │
│  [Signed offer letter PDF]                                       │
│  Institution: Prof. Kulkarni · kulkarni@sinhgad.edu · +91 …      │
│  (contact visible — post-booking only)                           │
└─────────────────────────────────────────────────────────────────┘
```

#### Long engagement (MIT-WPU — rolling)

```text
┌─────────────────────────────────────────────────────────────────┐
│  MIT-WPU · Gen AI Training Program                               │
│  Active · 1 Oct – 30 Nov · Sat AM · ~16 sessions                │
│                                                                  │
│  Confirmed sessions                                              │
│  ✅ 4 Oct  · 9 AM–1 PM                                           │
│  ✅ 11 Oct · 9 AM–1 PM                                           │
│  ⏳ 25 Oct · 9 AM–1 PM  · confirm by Mon 20 Oct                  │
│     [Confirm] [Can't make it]                                    │
│                                                                  │
│  Pattern: Sat AM · max 6/month · blocked 20–27 Oct, 14–16 Nov   │
│                                                                  │
│  Progress: 2 sessions done · 2 upcoming · ~12 TBD               │
│                                                                  │
│  [Signed offer letter PDF]                                       │
└─────────────────────────────────────────────────────────────────┘
```

Rolling confirm **lives on booking detail**, not on a separate calendar page. WhatsApp sends the
prompt; dashboard mirrors the same `[Confirm]` buttons.

---

## 6. Real-time walkthrough — Rahul's dashboard over 3 weeks

### Week 0 — Monday 1 Sept (quiet day)

Rahul logs in. No new invites. Dashboard:

```text
Good afternoon, Rahul 👋
✅ Verified · Gen AI (84/100)    ⭐ 4.6 (9 sessions)
Response rate: 92%

── Action needed ──
(empty)

── This week ──
Nothing scheduled

── Earnings ──
September (so far): ₹0 paid · ₹0 pending

── Active bookings ──
(empty — Sinhgad not signed yet)

── Profile health ──
💡 Experts with updated patterns get 2× more invites.
   Your pattern was set 45 days ago. [Update in 30 sec]
```

**WhatsApp (11:00):** MIT-WPU invite arrives. Rahul responds on phone — pattern confirm + interview
slot 9 Sept 3 PM.

**Dashboard does not need to reload for Respond** — next visit shows updated card. Optional: real-time
via websocket or poll on focus.

---

### Week 0 — Monday 1 Sept, 12:00 (after WhatsApp confirm)

Rahul opens dashboard on laptop to check:

```text
── Action needed ──
(empty)   ← he already responded on WhatsApp

── This week ──
Tue 9 Sept · 3:00 PM · Interview · MIT-WPU     [Join]

── Opportunities (badge: 1) ──
┌──────────────────────────────────────────────┐
│ MIT-WPU · Gen AI Training Program            │
│ 1 Oct – 30 Nov · Offline · ~₹1,12,000      │
│ Sat AM confirmed · Interview 9 Sept 3 PM   │
│ 🟡 Waiting — institution reviewing           │
│ Matched by Calxmap                           │
└──────────────────────────────────────────────┘
```

**Key point:** He did the work on WhatsApp. Dashboard reflects state — does not force him to redo it.

---

### Week 0 — Wednesday 3 Sept (direct booking invite)

Sinhgad browsed Rahul's expert card and sent a **direct booking request**. WhatsApp:

> Sinhgad Institute · Gen AI Workshop · 9 & 10 Sept · ₹14,000
> [Haan, in dates par free] [Nahi]

Rahul has not opened WhatsApp yet. Dashboard:

```text
── Action needed ──
┌──────────────────────────────────────────────┐
│ 🔴 Respond · Sinhgad Institute               │
│ Gen AI Workshop · 9 & 10 Sept · ₹14,000    │
│ Direct request                               │
│ [Haan] [Nahi] [Dates badal sakte hain]       │
└──────────────────────────────────────────────┘

── This week ──
Tue 9 Sept · 3:00 PM · Interview · MIT-WPU     [Join]
(+ conflict note only if dates overlap — see §8)
```

Badge: Opportunities **2**.

---

### Week 0 — Wednesday 3 Sept, evening

Rahul taps **Haan** on Sinhgad (dashboard). System:
- L3 confirm for 9 & 10 Sept
- Institution notified
- Because Sinhgad uses **direct select** (institution already chose him), flow skips shortlist wait
- Offer letter generated same day

Dashboard:

```text
── Action needed ──
┌──────────────────────────────────────────────┐
│ 🔴 Action needed · Sinhgad Institute         │
│ Offer letter ready · expires in 3 days       │
│ ₹14,000 · 9 & 10 Sept                      │
│ [Review & sign offer]                        │
└──────────────────────────────────────────────┘

── Opportunities ──
│ MIT-WPU      · 🟡 Waiting                    │
│ Sinhgad      · 🔴 Sign offer                 │
```

**Still two items in Opportunities — not Bookings yet.**

---

### Week 0 — Thursday 4 Sept (Sinhgad signed)

Rahul signs offer on dashboard (typed name + date).

- Sinhgad card **leaves Opportunities**
- Sinhgad appears under **Active bookings**
- MIT-WPU still in Opportunities as Waiting

```text
── Action needed ──
(empty)

── Active bookings ──
│ Sinhgad Workshop · Starts 9 Sept · 2 sessions │
│ MIT-WPU Program · Waiting for selection        │  ← NO — this is wrong
```

**Correction:** MIT-WPU stays in **Opportunities only**, not Active bookings, until signed.

```text
── Active bookings ──
│ Sinhgad Workshop · Active · starts in 5 days   │

── Opportunities ──
│ MIT-WPU · Waiting · Interview done 9 Sept      │
```

---

### Week 1 — Wednesday 10 Sept (MIT-WPU selected)

Prof. Desai selects Rahul. WhatsApp final re-confirm → Rahul taps Haan.

Dashboard:

```text
── Action needed ──
┌──────────────────────────────────────────────┐
│ 🔴 Action needed · MIT-WPU                   │
│ You were selected · Sign offer letter        │
│ ~₹1,12,000 · 1 Oct – 30 Nov                 │
│ [Review & sign offer]                        │
└──────────────────────────────────────────────┘

── Active bookings ──
│ Sinhgad Workshop · Active · Session 2 today  │
```

After signing MIT-WPU:

```text
── Active bookings ──
│ Sinhgad Workshop · Active · 1/2 sessions done │
│ MIT-WPU Program · Active · starts 1 Oct      │
```

Opportunities: **empty** (both converted).

---

### Week 2 — Monday 13 Oct (rolling confirm)

Sinhgad completed. MIT-WPU rolling window open. WhatsApp asked Rahul to confirm 25 Oct — he did not
reply yet.

```text
── Action needed ──
┌──────────────────────────────────────────────┐
│ 🔴 Action needed · MIT-WPU                   │
│ Confirm session: 25 Oct (Sat) 9 AM–1 PM      │
│ [Confirm] [Can't make it]                    │
└──────────────────────────────────────────────┘

── This week ──
Sat 25 Oct · 9 AM · Session · MIT-WPU  (pending confirm)
```

Tap **Confirm** on dashboard → same API as WhatsApp button.

---

### Week 3 — quiet again

```text
── Action needed ──
(empty)

── This week ──
Sat 25 Oct · Session · MIT-WPU · confirmed

── Earnings ──
October: ₹21,000 paid · ₹7,000 pending

── Active bookings ──
│ MIT-WPU · 3/16 sessions · next 1 Nov        │
```

Rahul did not open Opportunities for 3 weeks. **That is success.**

---

## 7. Mapping internal states → one chip (backend reference)

Engineering keeps full state machines. UI maps them:

| Internal states (examples) | Expert chip | List |
|---|---|---|
| `matched`, `invited` | **Respond** | Opportunities |
| `interested`, `presented`, institution reviewing | **Waiting** | Opportunities |
| `screened`, interview scheduled | **Scheduled** | Opportunities |
| `selected`, offer_sent, unsigned | **Action needed** | Opportunities |
| `rolling_session_proposed` | **Action needed** | Booking detail (+ dashboard banner) |
| `offer accepted`, `active` | — (no chip — use booking status) | **Bookings** |
| `completed` | — | Bookings → Completed |
| `declined`, `rejected`, `expired` | Closed label | Opportunities → Closed (archive 7d) |

**Never expose:** `pending`, `interview`, `expert_proposed`, `institution_countered`, `onboarding`,
`pending_review` as UI labels.

---

## 8. Edge cases on the dashboard

| # | Scenario | Dashboard behaviour |
|---|---|---|
| D1 | Expert responds on WhatsApp, never opens dashboard | State syncs; dashboard correct on next visit |
| D2 | Same dates — MIT-WPU interview 9 Sept + Sinhgad session 9 Sept | **Conflict banner** on Action card: "9 Sept par overlap — ek choose karein" |
| D3 | Two Respond cards | Both in Action needed; sorted by sent_at |
| D4 | Waiting card sits 14 days | Auto-expire → Closed; optional notify |
| D5 | Expert declines on WhatsApp | Card → Closed; removed from Action within 24h |
| D6 | Institution rejects after interview | Push + card → Closed with reason (one line) |
| D7 | Offer expires unsigned | Action needed → Closed; "Offer expired" |
| D8 | Long program — 3 rolling confirms pending | One **Action needed** card with bullet list, not 3 cards |
| D9 | Super-admin acting as expert | Same UI; banner "Viewing as Rahul Verma" |
| D10 | Brand-new expert, zero history | Profile health + "Complete verification to receive invites" |
| D11 | Expert only uses dashboard, no WhatsApp | All Respond buttons work in dashboard — parity required |
| D12 | Direct booking vs agent-matched | Same card component; `source` badge differs |

---

## 9. What we remove (explicit kill list)

| Remove from expert UI | Reason |
|---|---|
| `expert/home` requirement browse grid | No public postings |
| Search / filter projects on expert side | Same |
| Apply button + cover letter + proposed rate | No self-apply funnel |
| Dashboard tabs: Pending, Interview, Rejected | Pipeline stages |
| Separate Offer Letters tab | Fold into Opportunities as Action needed chip |
| Rate negotiation panel (`RateAgreementPanel`) | Fixed rates |
| `ExpertAvailabilityCalendar` on dashboard home | Pattern + rolling confirm replace it |
| Application counts header (pending/interview/accepted) | Misleading |
| "Browse more requirements" empty-state CTA | Wrong mental model |
| Project detail apply flow (`/expert/project/[id]` apply CTA) | Keep read-only if linked from invite card |

### What we keep (reuse)

| Component | New home |
|---|---|
| `OfferLetterPreviewDialog` + sign flow | Opportunities / Action needed |
| `TrainingAttendancePanel` | Booking detail |
| `BookingCompletionActions` | Booking detail |
| Earnings / analytics queries | Dashboard snapshot + bookings |
| Notification bell | Deep links to cards |
| Profile edit | Unchanged |

---

## 10. API / data shape (minimal)

### `GET /api/expert/workspace`

Single payload for dashboard — avoids 6 parallel fetches:

```json
{
  "expert": { "id", "name", "is_verified", "rating", "response_rate", "pattern_stale" },
  "action_needed": [
    { "type": "respond|sign_offer|confirm_sessions|attendance|join_interview",
      "opportunity_id", "booking_id", "title", "institution_label", "fee_net",
      "dates_summary", "chip", "cta", "expires_at", "source" }
  ],
  "this_week": [
    { "type": "interview|session", "at", "title", "join_url", "booking_id" }
  ],
  "earnings": { "month_paid", "month_pending" },
  "active_bookings_preview": [ { "id", "title", "progress", "next_at" } ],
  "opportunity_counts": { "respond": 1, "waiting": 1, "total_open": 2 }
}
```

### `GET /api/expert/opportunities?filter=all|respond|waiting|closed`

Paginated opportunity cards — same shape as action cards plus `closed_reason`.

### `GET /api/expert/bookings?status=active|completed`

Booking list — no application join required.

**Deprecate from expert dashboard load:** `applicationCounts`, multi-tab application queries,
onboarding cross-joins for display logic.

---

## 11. Mobile vs WhatsApp

| User type | Primary channel |
|---|---|
| Responds fast on WhatsApp | Dashboard = read-only mirror + sign offer |
| No WhatsApp / prefers app | Dashboard = full parity on Respond buttons |
| Session day | WhatsApp reminder → dashboard attendance |

**Parity rule:** every WhatsApp interactive button must have an equivalent API endpoint the dashboard
can call.

---

## 12. Migration from current dashboard

| Phase | Ship |
|---|---|
| **1** | Add `workspace` endpoint + new dashboard home layout alongside old `/dashboard` |
| **2** | Redirect `/expert/dashboard` → new home; old tabs behind `?legacy=1` for 2 weeks |
| **3** | Remove browse from `expert/home`; 301 to dashboard |
| **4** | Delete tab components, application count logic, expert-side negotiation UI |

Feature flag: `EXPERT_DASHBOARD_V2=true`.

---

## 13. Success metrics

| Metric | Target |
|---|---|
| Expert dashboard sessions per week (active experts) | ↓ — WhatsApp handles volume |
| Time from invite to respond | < 4h median (unchanged; measure channel-agnostic) |
| Support tickets "where is my application status" | → 0 |
| Cards appearing in 2+ tabs (debug assert) | 0 |
| Offer sign completion on dashboard | > 95% (signature requires dashboard) |

---

## 14. Open decisions

1. **Merge `expert/home` and `expert/dashboard` into one route** (`/expert` or `/expert/home`)?
   Recommended: yes — one landing URL.
2. **Show Closed opportunities forever or 7-day archive?** Recommended: 7-day archive.
3. **Conflict detection** — block Respond or warn only when dates overlap?
   Recommended: warn on dashboard, block final double-booking at L4 hold layer.
4. **Earnings page** — separate nav item or only snapshot + bookings?
   Recommended: snapshot on home; detail in bookings for v1.

---

*This document is the build spec for expert-facing UI. Institution dashboard redesign is out of scope
here but mirrors the same "no pipeline tabs" principle.*
