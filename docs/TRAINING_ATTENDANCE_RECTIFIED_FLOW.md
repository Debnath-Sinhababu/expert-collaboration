# Calxmap — Rectified Training Attendance Flow

**Purpose:** Simple plan for fixing attendance after expert selection.  
**Audience:** Product, design, development  
**Date:** July 2026

---

## What is wrong today (one sentence)

You treat **selection** as **training started**, use **wrong dates** in some paths, and let the engagement **finish and get paid** without making sure **approved attendance** matches what was agreed.

---

## How to fix it — 5 phases

```
SELECT → CONFIRM SCHEDULE → TRAIN (attendance) → CLOSE → PAY
```

**Not:** select → in_progress → hope expert punches correctly → anyone clicks complete.

---

## Phase 1 — After expert is selected (not training yet)

### Today
- Booking created as `in_progress` immediately.
- Dates sometimes = today + random window.

### Fixed
1. Institution accepts expert → booking status = **confirmed** (selected, not started).
2. **One way** to create booking — always from project + application:
   - Dates from project (or institution edits once)
   - `hours_booked` = project `duration_hours`
   - Rate from agreed `final_hourly_rate`
3. Institution fills a short **Training plan** screen (2 minutes, not full timetable):
   - **Actual start date** / **actual end date** (when training really runs)
   - **Schedule type:** fixed single session OR flexible multi-day
   - **Expected:** total hours, optional "~X hours per day" or "weekdays only"
   - Optional: upload final timetable PDF later

**Expert sees:** "You're selected. Training runs **10 Mar – 20 Mar**, ~**20 hours**. Institution will confirm exact sessions."

**No attendance yet.**

---

## Phase 2 — Lock schedule (optional but clear)

### Today
- No session plan.
- Expert creates random days on calendar.

### Fixed

Institution (or institution + expert) does one of:

| Type | What gets locked |
|------|------------------|
| Guest lecture (1 day) | One date + start/end time |
| FDP / workshop (multi-day) | Date range + "we expect ~N session days" OR list of session dates |

Expert confirms: **"I'm available for this plan"** (one click).

Then booking → **in_progress** — attendance unlocks **only now**.

**Rule:** No entry/exit until status is `in_progress` **and** today is within **actual** dates.

---

## Phase 3 — During training (attendance — keep core, fix rules)

### Keep
- Expert marks entry → exit → institution approves / disputes.

### Change

| Rule | Why |
|------|-----|
| Attendance only on **actual start–end** (not stale booking dates) | Fixes date mismatch |
| Expert can only mark on **planned session days** (or weekdays in range if flexible) | Less random punching |
| Entry/exit can use **scheduled session time** OR punch time (institution chooses per project type) | Guest lecture = scheduled time; long FDP = punch OK |
| One open day rule stays | Prevents mess |
| Institution gets **notification** when a day is pending review | Faster approvals |
| Expert reminded if they forgot **exit** | Fewer stuck "open" days |

**Expert sees:** Calendar with **green = session day**, mark entry/exit only those days.

**Institution sees:** "3 days delivered, 2 pending approval, 15/20 hours approved."

---

## Phase 4 — Close engagement (gate completion)

### Today
- Expert clicks "Mark complete" anytime.

### Fixed

**Complete** only when:
- All **planned session days** have approved attendance, **OR**
- Institution clicks **"Close with exception"** (with reason: expert left early, sessions cancelled, etc.)

If approved hours **< 80%** of `hours_booked` → warning before close.

After close → booking **completed** → attendance **read-only**.

---

## Phase 5 — Payment (tie to approved hours)

### Today
- Superadmin can type any hours/amount.

### Fixed
1. System auto-calculates: **approved hours × agreed rate** = suggested payment.
2. Superadmin **confirms** (or adjusts with mandatory reason).
3. Invoice uses **approved attendance** as source of truth.

No payment without at least one **approved** day (unless superadmin override).

---

## Full rectified flow (simple story)

```
1. Institution posts requirement (dates, hours, type)
        ↓
2. Expert applies
        ↓
3. Institution selects expert
        ↓
4. Booking = CONFIRMED (not started)
   Institution sets actual dates + rough plan
   Expert confirms plan
        ↓
5. Booking = IN PROGRESS
   Expert marks attendance only on session days
   Institution approves each day
        ↓
6. All sessions done + approved (or institution closes with reason)
   Booking = COMPLETED
        ↓
7. Finance pays from APPROVED HOURS (auto-calculated)
```

---

## What to remove or simplify

| Remove / narrow | Why |
|-----------------|-----|
| Multiple booking-create paths with wrong dates | Root cause of attendance chaos |
| Attendance on consultation, other, etc. | Use only real multi-session training types |
| in_progress on day of selection | Training hasn't started |
| Complete without approval check | Billing disputes |
| "Actual dates" UI that attendance ignores | Wire API to actual dates |

---

## What stays the same (do not rebuild)

- Expert entry/exit per day
- Institution approve / dispute / edit times
- Approved hours → progress vs hours_booked
- Audit log
- Optional attachments on entry/exit

---

## Rules by project type

| Type | Plan at selection | Attendance |
|------|-------------------|------------|
| Guest lecture | 1 date + time | Mark that day only (or institution marks "conducted") |
| Workshop / FDP | Date range + expected session days | Daily entry/exit on session days |
| Consultation | No daily attendance | Mark "session completed" once |

---

## One-line product rule

> **Selection ≠ training started. Training started = schedule confirmed. Payment = approved hours only.**

---

## Implementation order (practical)

| Phase | Scope | Timeline |
|-------|--------|----------|
| 1 | Single booking path + confirmed → in_progress + actual dates drive attendance API | Week 1 |
| 2 | Training plan screen + expert confirm + notifications | Week 2 |
| 3 | Complete gate + finance auto-calc from approved hours | Week 3 |
| 4 | AI "confirm availability" before selection (optional) | Later |

---

## Current flow problems (reference)

| Problem | Impact |
|---------|--------|
| Booking dates inconsistent (some flows use today + 7 days) | Wrong attendance window |
| actual_start_date / actual_end_date not used by attendance API | Institution updates dates but attendance ignores them |
| No session plan | Expert punches random days |
| Booking in_progress immediately on selection | Attendance before training starts |
| Complete not tied to approved attendance | Disputes after engagement closed |
| Finance manual hours can differ from attendance | Payment mismatch |
| Entry/exit = click time only | Misaligned with scheduled lectures |
| Too many project types use attendance | Wrong UX for consultation |

---

## Attendance day states (unchanged)

```
open → expert marks entry
open → expert marks exit → pending_review
pending_review → institution approves → approved
pending_review → institution disputes → disputed
disputed → expert corrects → pending_review
approved → hours count toward payment
```

---

## Booking status lifecycle (new)

```
confirmed     → Expert selected, schedule being finalized
in_progress   → Training running, attendance active
completed     → Closed, attendance read-only
cancelled     → Cancelled, attendance read-only
```

---

*End of document*
