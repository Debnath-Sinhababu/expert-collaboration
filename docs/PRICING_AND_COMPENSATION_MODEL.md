# Calxmap — Pricing & Compensation Model

**Purpose:** Product spec for how institutions post budgets, how experts see earnings, and how payment ties to attendance.  
**Audience:** Product, design, development, operations  
**Date:** July 2026

---

## Executive summary (share this first)

1. **Institutions do not think in hourly rate** for guest lectures, FDPs, and workshops — they think in **per session**, **per day**, or **fixed package**.
2. **Experts should see net earnings (70%)**; institutions see **gross (what they pay, 100%)**. Platform keeps **30%**.
3. **Total hours stay in the system** — but mainly as an **attendance cap and progress metric**, not always as the primary quote field.
4. **Start date / end date** = engagement **window** (e.g. 2 months). Payment happens on **delivered sessions/days/hours inside that window**, not for every calendar day.
5. **Project post form is dynamic** — fields change by project type and “how you pay”; budget and total hours are **auto-calculated** where possible.

**One-line rule:**

> **UX = session / day / package by engagement type; backend = gross + net + derived hours for attendance and commission.**

---

## Why we are moving away from “hourly only”


| Problem with hourly-only today                         | Real-world behaviour                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| College posts “guest lecture” but must enter ₹/hr      | UGC and most colleges use **per lecture / per session** honorarium        |
| `total_budget` vs `hourly_rate × hours` often mismatch | Institutions budget **₹X per session** or **₹Y for the program**          |
| Experts quote “₹15,000 for one day FDP”                | Hourly equivalent is unclear and negotiable                               |
| Attendance tied to hours only                          | A 2-hour lecture should not need the same punch flow as a 40-hour program |


### What competitors do (summary)


| Market                                | Typical pricing model                                            |
| ------------------------------------- | ---------------------------------------------------------------- |
| Indian universities (UGC)             | Per lecture (e.g. ₹1,500/lecture with monthly cap)               |
| Government training institutes        | Per session (₹500–₹4,000/session by category)                    |
| Upwork                                | Hourly **or** fixed-price **or** consultation per 30 min         |
| Corporate expert networks (GLG, etc.) | Per call / per hour (1:1 diligence — different from college FDP) |
| Workshop / speaker market             | Flat fee per half-day, full-day, or full program                 |


**Calxmap serves colleges and training institutions** — our default UX should match **session / day / package**, not a pure hourly marketplace.

---

## Commission model (70% expert / 30% platform)

### Definitions


| Term           | Who sees it         | Meaning                                                   |
| -------------- | ------------------- | --------------------------------------------------------- |
| **Gross**      | Institution         | Total amount institution pays per unit or for the package |
| **Net**        | Expert              | What expert earns (70% of gross)                          |
| **Commission** | Platform (internal) | 30% of gross                                              |


### Formulas

```
expert_net   = institution_gross × 0.70
commission   = institution_gross × 0.30

# Reverse (when expert proposes net):
institution_gross = expert_net / 0.70
```

### Important: not the same as today’s 1.30× markup

Current code uses `institution_rate = expert_rate × 1.30`, which is **not** exactly 30% of gross.


| Model                      | Expert gets             | Platform gets | Institution pays |
| -------------------------- | ----------------------- | ------------- | ---------------- |
| Old (×1.30 on expert rate) | ~77% of institution pay | ~23%          | expert × 1.30    |
| **New (30% of gross)**     | **70%**                 | **30%**       | gross            |


**Target:** store **both** `institution_gross_`* and `expert_net_*` on application and booking so finance never has to guess.

---

## Compensation units (how institution pays)

### Four units


| Unit          | Code            | Institution enters                     | Best for                                 |
| ------------- | --------------- | -------------------------------------- | ---------------------------------------- |
| Per session   | `per_session`   | Gross per session × number of sessions | Guest lecture, single talk, consultation |
| Per day       | `per_day`       | Gross per day × number of days         | FDP, multi-day workshop                  |
| Fixed package | `fixed_package` | Total gross for entire deliverable     | Curriculum dev, research output          |
| Per hour      | `hourly`        | Gross per hour × expected hours        | Open consulting, variable scope          |


### Default unit by project type


| Project type           | Default compensation unit | Institution can override?              |
| ---------------------- | ------------------------- | -------------------------------------- |
| Guest lecture          | Per session               | Rarely                                 |
| FDP                    | Per day                   | Yes (e.g. fixed package for whole FDP) |
| Workshop               | Per day or per session    | Yes                                    |
| Training program       | Per day or fixed package  | Yes                                    |
| Consultation           | Per session               | Yes (hourly for ongoing advisory)      |
| Curriculum development | Fixed package             | Yes                                    |
| Research collaboration | Fixed package or hourly   | Yes                                    |
| **Other**              | **User must choose**      | Required                               |


---

## Total hours — still required, different role

Total hours are **not removed**. Their role changes.

### Three related concepts


| Concept              | Field (proposed)            | Who sets it                                     | Used for                                   |
| -------------------- | --------------------------- | ----------------------------------------------- | ------------------------------------------ |
| Duration per unit    | `duration_per_unit`         | Institution                                     | “Each session is 2 hours”                  |
| Unit quantity        | `unit_quantity`             | Institution                                     | “8 sessions” or “8 days”                   |
| Expected total hours | `duration_hours` (existing) | **Auto-derived** (or manual for hourly/package) | Attendance cap, progress %, finance sanity |


### How expected total hours is calculated

```
# Per session or per day:
expected_total_hours = unit_quantity × duration_per_unit

# Per hour:
expected_total_hours = entered directly

# Fixed package:
expected_total_hours = estimated effort (cap for attendance)
```

### On booking

```
hours_booked = expected_total_hours
```

Used for attendance summary: “15 / 24 hours approved (62%)”.

### Payment vs hours


| Compensation unit | Institution pays on            | Hours used for                       |
| ----------------- | ------------------------------ | ------------------------------------ |
| Per session       | Approved session count         | Cap: sessions × duration per session |
| Per day           | Approved day count             | Cap: days × hours per day            |
| Fixed package     | Milestones / delivery sign-off | Cap: estimated hours                 |
| Per hour          | Approved logged hours          | Cap = contract hours                 |


**Guest lecture:** payment is **per session**; hours validate that the session happened (optional soft duration check).

---

## Dynamic project form (one form, conditional fields)

Today every project type shows the same fields: `hourly_rate`, `total_budget`, `duration_hours`.  
**Target:** one form with **four layers**.

### Layer 1 — Always visible

- Title, description
- Project type
- Domain / subskills
- **Start date & end date** (engagement window)
- Number of openings

### Layer 2 — Shown by project type


| Type                   | Extra fields                                                           |
| ---------------------- | ---------------------------------------------------------------------- |
| Guest lecture          | Sessions, duration per session                                         |
| FDP / Workshop         | Days, hours per day, schedule note (e.g. “Saturdays only”)             |
| Training program       | Same as FDP or package (institution picks pay unit)                    |
| Consultation           | Session length (30/60 min), number of sessions                         |
| Curriculum dev         | Deliverables description, milestones (optional later)                  |
| Research collaboration | Deliverables, expected effort                                          |
| **Other**              | **Engagement description (required)** + **choose pay unit (required)** |


### Layer 3 — Shown by compensation unit


| Pay unit      | User enters                                | Hide              |
| ------------- | ------------------------------------------ | ----------------- |
| Per session   | Gross per session, # sessions, hrs/session | Hourly rate field |
| Per day       | Gross per day, # days, hrs/day             | Hourly rate field |
| Fixed package | Total gross fee, estimated hours           | Per-unit rate     |
| Per hour      | Gross per hour, expected total hours       | Sessions / days   |


### Layer 4 — Auto-calculated (read-only summary card)


| Display               | Formula                                           |
| --------------------- | ------------------------------------------------- |
| Expected total hours  | See above                                         |
| Total budget (gross)  | `gross_per_unit × unit_quantity` or package total |
| Expert earns (approx) | 70% of gross                                      |
| Platform fee (approx) | 30% of gross                                      |


**Rule:** User never types total budget and total hours separately when they can be derived — reduces errors.

### Form decision flow

```
Project type
    → (if Other: description + pick pay unit)
    → (else: default pay unit for type)
    → Show unit-specific inputs
    → Compute total_hours + total_budget
    → Show summary card
    → Submit
```

### Implementation note

Use a single config (e.g. `PROJECT_FORM_FIELD_CONFIG`) keyed by `type` + `compensation_unit` — not separate forms per type.

---

## Long-running projects (example: 2-month FDP)

**Start/end date = window when work can happen — not “bill for every day in between”.**

### Example setup


| Field                | Value                             |
| -------------------- | --------------------------------- |
| Type                 | FDP                               |
| Start date           | 1 Aug 2026                        |
| End date             | 30 Sep 2026                       |
| Schedule             | Every Saturday, 3 hours           |
| Pay unit             | Per day                           |
| Gross per day        | ₹15,000                           |
| Days                 | 8                                 |
| Expected total hours | 8 × 3 = **24 hrs**                |
| Total budget         | 8 × ₹15,000 = **₹1,20,000** gross |
| Expert net per day   | ₹10,500                           |


### Timeline

```
Aug 1                 Aug 2 (Sat)        ...        Sep 27 (Sat)       Sep 30
  |                       |                          |                  |
Booking active        Session 1                  Session 8          Window
                      deliver + approve          deliver + approve   closes
```

### What happens each Saturday

1. Expert delivers session (3 hours).
2. Expert marks attendance for that day.
3. Institution approves.
4. **One day unit paid** → expert ₹10,500, platform ₹4,500.

### Progress tracking

```
Sessions/days: 5 / 8 complete
Hours:         15 / 24 approved
Budget used:   ₹75,000 / ₹1,20,000 gross
```

### After end date

- If 8/8 approved → project complete, full settlement.
- If 7/8 → institution must approve extra day or renegotiate; no auto-pay beyond agreed units.

### Wrong vs right mental model


| Wrong                        | Right                                                   |
| ---------------------------- | ------------------------------------------------------- |
| 2 months ≈ 60 billable days  | Only **8 scheduled delivery days** are billable         |
| One payment at end date      | Pay **per approved session/day** (or batched invoice)   |
| Calendar span = hours worked | **Scheduled delivery** inside the window = hours worked |


---

## Project type = “Other”

`Other` is a catch-all. **Do not auto-pick pricing unit.**

### Required for Other

1. **Engagement description** (free text, min ~20 characters)
2. **Compensation unit** — institution must choose: per session / per day / fixed package / per hour

### Optional soft defaults (suggest in UI, do not force)


| If description suggests…        | Suggest       |
| ------------------------------- | ------------- |
| lecture, talk, seminar          | Per session   |
| FDP, bootcamp, multi-day        | Per day       |
| curriculum, report, deliverable | Fixed package |
| advisory, ongoing support       | Per hour      |


### Guardrails

- Show clear pay unit on expert browse card
- Flag for superadmin review if amount is extreme or unit + budget look inconsistent

---

## When rates are negotiated


| Stage                     | What happens                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| **Apply**                 | Expert accepts posted net **or** indicates “happy to discuss” — no long negotiation               |
| **Shortlist / interview** | Full rate discussion; institution and expert agree on unit and amounts                            |
| **Accept / booking**      | **Lock** `gross_per_unit`, `net_per_unit`, `compensation_unit`, `unit_quantity`, `duration_hours` |
| **During engagement**     | No rate change without amendment flow                                                             |
| **Attendance / complete** | Pay only on **locked** rates and **approved** units/hours                                         |


### Rate guardrails (recommended)

- **Floor:** expert profile minimum net
- **Soft ceiling:** ~25% above posted net without flag
- **Hard ceiling:** institution total budget
- **Extreme asks:** superadmin review queue

---

## Link to attendance & finance


| Phase            | Pricing role                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| Post requirement | Institution sets gross unit(s), quantity, derived hours & budget                                          |
| Application      | Expert sees **net** per unit and total approximate earn                                                   |
| Booking created  | Copy locked rates + `hours_booked` from project                                                           |
| Schedule plan    | Map delivery dates inside start–end window                                                                |
| Attendance       | Approve sessions/days/hours; compare to `hours_booked` cap                                                |
| Complete         | Gate completion on minimum approved units/hours                                                           |
| Finance          | Expert payout = approved units × net **or** approved hours × net hourly; institution bill = same at gross |


---

## Proposed database fields (projects & bookings)

### Projects (post requirement)


| Field                        | Type    | Notes                                               |
| ---------------------------- | ------- | --------------------------------------------------- |
| `type`                       | enum    | Existing project types                              |
| `compensation_unit`          | enum    | `per_session`, `per_day`, `fixed_package`, `hourly` |
| `unit_quantity`              | integer | Sessions, days, or 1 for package                    |
| `duration_per_unit`          | decimal | Hours per session/day; null for hourly-only         |
| `institution_gross_per_unit` | decimal | Gross per session/day/hour                          |
| `institution_gross_total`    | decimal | For fixed package (or derived total)                |
| `duration_hours`             | integer | Expected total hours (derived or entered)           |
| `total_budget`               | decimal | Institution gross total (derived, stored)           |
| `other_description`          | text    | Required when type = other                          |
| `schedule_notes`             | text    | e.g. “Saturdays only”                               |
| `start_date`, `end_date`     | date    | Engagement window                                   |


### Applications & bookings (locked at accept)


| Field                  | Notes                              |
| ---------------------- | ---------------------------------- |
| `final_gross_per_unit` | Locked institution pay rate        |
| `final_net_per_unit`   | Locked expert earn rate            |
| `compensation_unit`    | Copied from project                |
| `unit_quantity`        | Copied from project                |
| `hours_booked`         | = `duration_hours` at booking time |


### Legacy migration

- Existing `hourly_rate` → treat as institution gross hourly where `compensation_unit` was implicit hourly
- Recompute display net as `hourly_rate × 0.70` for expert-facing UI
- New posts use explicit gross/net fields

---

## UI copy examples (institution post form)

### Guest lecture

```
Sessions:              2
Duration per session:  2 hours
You pay:               ₹10,000 per session
─────────────────────────────────────────
Total engagement:      4 hours
Total budget:          ₹20,000 (you pay)
Expert earns:          ~₹7,000 per session
Engagement period:     1 Aug – 31 Aug 2026
```

### Two-month weekend FDP

```
Days:                  8
Hours per day:         3
Schedule:              Every Saturday
You pay:               ₹15,000 per day
─────────────────────────────────────────
Total engagement:      24 hours
Total budget:          ₹1,20,000 (you pay)
Expert earns:          ~₹10,500 per day
Engagement period:     1 Aug – 30 Sep 2026
```

### Open consulting (hourly)

```
Expected total hours:  40
You pay:               ₹1,000 per hour
─────────────────────────────────────────
Total budget:          ₹40,000 (you pay)
Expert earns:          ~₹700 per hour
Engagement period:     1 Jun – 31 Jul 2026
```

---

## What we are NOT changing in this doc

- Attendance rectification phases (see `TRAINING_ATTENDANCE_RECTIFIED_FLOW.md`)
- Single booking creation path from accept application
- Expert availability approval flow
- Superadmin finance oversight

This doc defines **what** institutions and experts see for money; the attendance doc defines **when** work is approved and complete.

---

## Open questions for team discussion

1. **Payout timing:** per approved session/day vs monthly batch vs on project complete?
2. **Fixed package milestones:** 50/50 default or institution-defined?
3. **Partial session:** dispute if expert leaves early — pay full session or prorate hours?
4. **UGC-scale institutions:** show “per lecture” label even when backend uses `per_session`?
5. **Phase 1 launch:** support only `per_session` + `per_day` + keep hourly for backward compat?

---

## Glossary


| Term              | Meaning                                             |
| ----------------- | --------------------------------------------------- |
| Gross             | What institution pays (100%)                        |
| Net               | What expert receives (70% of gross)                 |
| Unit              | One billable session, day, hour, or package         |
| Engagement window | Start date to end date — not equal to billable days |
| `hours_booked`    | Attendance and progress cap for the booking         |
| Derived field     | Calculated by system, not typed by user             |


---

