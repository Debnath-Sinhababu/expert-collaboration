# CalxMap 1.5 — EDP end-to-end user flow

**For:** product / design (this is a screen walkthrough, not a schema dump)  
**Date:** 29 Aug 2026  
**In Figma today:** EDP card, Request a proposal modal, Dashboard → Programs list.  
**Not in Figma:** every screen after Send request, every screen under Manage cohort, employee learning, ops quote, finance.

Read this like a design file: **who is on the screen, what they see, what they tap, where they land.**

Walkthrough canvas (open beside chat): `canvases/calxmap-edp-brd.canvas.tsx`

---

## Cast (one company, one program)

| Person | Role | What they want |
|---|---|---|
| **Priya** | Company admin, L&D, Northlane Systems | HR team ko People Operations Foundations mein daalna, budget ke andar, baad mein dekhna kaun peeche hai |
| **Amit** | HR Head (department owner) | Apni 20 logon ki list dena, unka progress dekhna — Engineering ka data nahi |
| **Kavya** | HR employee (learner) | Invite aaye, class join ho, pata ho next kya hai |
| **Dr. A. Sharma** | Faculty expert on CalxMap | Session lena, attendance maarna, paise milna |
| **Meera** | CalxMap programme ops | Request ko 1 working day mein quote banana |
| **Rohit** | Company finance | ₹1.8L+ ho to approve karna |

Program on the card: **People Operations Foundations** — 6 weeks, live + on-site, 4 modules, indicative ₹9,000 / person.

---

# PART A — Priya enrols HR (happy path, screen by screen)

Yeh woh flow hai jo design mein hona chahiye. Har block = ek frame.

---

### Screen 01 — Company | Home  
**Already in Figma** (`3705:7226`)

**Priya dekhti hai**

- Search: “Search Experts, EDPs, Interns…”
- Feed of experts + EDP cards in the middle
- Right: **Featured EDP** (two program tiles) + **Quick Actions**
- One feed card looks like the screenshot: green header `HUMAN RESOURCES • EMPLOYEE DEVELOPMENT PROGRAM`, `NEXT COHORT 18 AUG`, title **People Operations Foundations**, `6 weeks · 15–30 people · Live + on-site · 4 modules`, `₹1.8L/cohort` (or ₹9,000/person), faculty avatars, `4.7 (229)`, buttons **Overview** | **Request proposal**

**Woh kya kar sakti hai**

| Click | Next |
|---|---|
| **Request proposal** | Screen 03 (modal on top of Home) |
| **Overview** | Screen 02 |
| Featured EDP tile | Screen 02 |
| Nav **Services** | Screen 01b |
| Nav **Marketplace** → Programs | Screen 01c |
| Dashboard → Programs → **+ Enrol in a program** | Screen 01c |

---

### Screen 01b — Company | Services  
**In Figma**

Tiles including **Employee Development Program**. Click → Screen 01c (filtered catalog) or Screen 02 if one program.

---

### Screen 01c — Marketplace | Programs tab  
**In Figma (tabs exist; Programs list thin)**

Filterable catalog of EDPs. Same card as Home. Same two buttons.

---

### Screen 02 — Program Overview  
**NOT in Figma (button exists, page nahi)**

**Layout (desktop, 1440)**

- Left 2/3: hero (title, domain chip, next cohort dates, faculty), then **Curriculum** (Module 1–4: name, week, live vs recorded, duration), **Who this is for**, **What changes by the end** (catalog outcomes), FAQ (min 12 people, nothing charged until quote, unused seats refund).
- Right 1/3 sticky: price indicative, seat band 12–40, **Request proposal**, “Programme team confirms dates after quote”.

**Click Request proposal → Screen 03.**  
**Back →** wherever she came from.

---

### Screen 03 — Modal: Request a proposal  
**In Figma (screenshot)**

Overlay 900-wide. Dimmed Home behind. Title **Request a proposal**. X closes, no save.

**Left column — Priya fills**

1. **Which team is this for?**  
   Dropdown of Northlane departments. She picks **Human Resources**.  
   If department missing: “Add department” (name + owner email) then select.  
   Empty department → Send disabled, field error.

2. **How many people?** Helper: “12–40 per cohort”.  
   Chips **12 / 20 / 25 / Other**. She taps **20** (green).  
   Other: number field. `1` → error “Minimum 12 for this program”. `41` → error “We’ll split this into two cohorts in the quote — continue?” Confirm still sends **one request** with note `split_suggested`.

3. **Preferred start**  
   Catalog dates as chips: **Tue 18 Aug** (selected, green), **Wed 2 Sep**, **Another date** (calendar).  
   Past date blocked.

4. **Budget (optional)**  
   Label: “Tell us what you have approved”.  
   She types **₹1,80,000**. Helper: “Indicative is ₹9,000 per person”.  
   Right rail total **mirrors** 20 × 9000 = ₹1,80,000 while chip is 20. If she changes to 12, rail becomes ₹1,08,000. If she typed a budget, keep her number; helper shows “Your cap ₹1,80,000 vs indicative ₹X”.

5. **What should change by the end ***  
   Required. Placeholder as Figma. Under 40 characters → cannot send.

**Right column — live summary (not a charge)**

- EDP icon, **People Operations Foundations**, `6 weeks · Live + on-site · 4 modules`, star 4.7
- Team: Human Resources  
- Cohort size: 20 people  
- Starts: Tue 18 Aug  
- **Indicative ₹1,80,000**  
- “excl. GST — final quote after scoping”
- Grey box: **Nothing is charged today.** Scoped quote within one working day. Cohort held only after she approves.
- Green **Send request**
- Foot: “Someone from the programme team will call to confirm dates.”

**Send request**

- Profile incomplete (skipped onboarding) → **not** this modal success. Overlay: Finish setup first. Same as Book now.
- Success → close modal, **Screen 04**.

**X / outside click** → discard. If she typed outcome, confirm “Discard request?”

---

### Screen 04 — Request sent  
**NOT in Figma**

Full page (or Home with banner). Not a dead toast-only.

**She sees**

- Title: **Request sent — nothing charged**
- Program, HR, 20 people, 18 Aug, her outcome text (read-only)
- Status pill: **Awaiting quote**
- “Meera’s team will send a scoped quote by **Mon 11:00 IST**” (next working day)
- “We’ll call to confirm dates.”
- Buttons: **Back to Home** | **View in Programs** (Screen 05, row in Awaiting quote) | **Withdraw request** (confirm)

Email + in-app notification same content.

**Withdraw** → status withdrawn, ops notified, **no money**, Programs row disappears or shows Withdrawn.

---

### Screen 05 — Dashboard → Programs (waiting)  
**Figma has this tab, but only after cohort exists. This state missing.**

Same chrome as Figma Programs: tabs Overview / Requirements / **Programs** / …

KPI strip: **0 / 0 / 0 / —** if this is her first program (no dummy 42).

**Your programs**

One row:

- People Operations Foundations  
- Pill: **Awaiting quote**  
- Human Resources · 20 seats requested · preferred 18 Aug  
- No progress bar  
- Buttons: **View request** (Screen 04) — **Manage cohort** disabled until reserved

**+ Enrol in a program** still works (another department / another EDP).

---

### Screen 06 — Ops: Quote inbox (Meera)  
**NOT in Figma — internal**

Meera’s CalxMap ops home.

Row: Northlane · HR · People Operations Foundations · 20 · 18 Aug · outcome excerpt · SLA countdown **1 WD**.

She opens **Screen 07**.

CalXAI on this screen: right panel **Draft quote** from outcome text (suggested extra workshop on 1:1s + comp framework). Meera edits. **AI cannot Send.**

---

### Screen 07 — Ops: Build quote  
**NOT in Figma**

- Seats 20, start 18 Aug (or she changes to 2 Sep if faculty clash)
- Modules: catalog 4 + optional add-on (priced)
- Faculty: Dr. A. Sharma (lead)
- Mix: live / on-site
- Line items: program ₹1,80,000, add-ons ₹0, **GST extra**
- Validity: 7 days  
- Note to company: “We’ll call Tuesday to lock the on-site day.”

**Send quote** → Priya gets **Screen 08**. SLA clock stops.

If Meera misses SLA: Priya’s Screen 05 pill becomes **Quote delayed — we’ll reply by {date}**. Ops gets escalation. Request does **not** die.

---

### Screen 08 — Quote received  
**NOT in Figma (1.5 PRD already called this a flaw)**

Priya notification: **Quote ready — valid until 5 Sep**.

**Layout**

- Left: what she asked vs what we scoped (seats, dates, modules, faculty names, on-site city)
- If quote > indicative: yellow **This is 0% over indicative** or **12% over**
- If quote > her optional budget: red **Quote is above the ₹1,80,000 you entered** + she must still explicitly Approve
- Right: **₹1,80,000 excl. GST**, GST line, **Total payable on approve (GST incl.)**
- Copy: **Still nothing reserved until you Approve**

Buttons:

| Button | Next |
|---|---|
| **Approve quote** | If under finance cap → Screen 09. If over cap → Screen 08b |
| **Counter** | Screen 08c |
| **Reject** | Reason required → dead. Can request again later |
| **Need a call** | Books a slot / “we’ll call” ticket |

Quote expiry → Screen 08 becomes **Expired**. **Request new quote** (same request, ops again). Approve disabled.

---

### Screen 08b — Finance approval (Rohit)  
**NOT in Figma**

If total ≥ company cap (reuse wallet ₹50k pattern unless finance sets EDP cap).

Rohit sees program, department, amount, Priya’s name. **Approve** / **Decline**.  
Priya blocked with “Waiting for finance”. Decline → Screen 08 with reason.

---

### Screen 08c — Counter  
**NOT in Figma**

Priya: seats (e.g. 18), start date, max budget, note. **Send counter**.  
Meera gets Screen 07 again. New quote **supersedes** old (old Approve dies). Priya only sees latest.

---

### Screen 09 — Quote approved, seats reserved  
**NOT in Figma**

Success page.

- **₹1,80,000 reserved** in company wallet (GST as quoted)
- Sentence: **₹1,80,000 reserved for 20 HR seats. Unused seats refunded if you confirm with fewer people. Cohort is not charged beyond this reserve until the first session.**
- **Next: add the 20 people** — primary **Add employees** → Screen 10
- Secondary: **Go to Programs**

Wallet ledger shows the reserve. Dashboard Programs row now:

- Pill **Add people** (not 2 behind)
- 0 of 20 seats used  
- **Manage cohort** enabled

---

### Screen 10 — Manage cohort → People (empty roster)  
**NOT in Figma (Figma only has the button)**

Chrome: cohort header — People Operations Foundations · Human Resources · 0/20 · start 18 Aug.

Tabs: **People** (this) | Schedule | Billing | Settings

**People tab empty**

- “Add the HR employees who will attend. You can add fewer than 20; unused reserved seats are refunded when you confirm the cohort.”
- **Upload CSV** (name, work email, employee id optional)
- **Add one by one**
- **Import from company roster** (if employees already exist)

CSV errors stay on this screen (bad email, personal Gmail warning, duplicate, already in another overlapping cohort).

She uploads 20 HR people. Table appears: name, email, **Invite not sent**.

Primary: **Send invites** → each row **Invited**. Kavya gets email.

Cannot add 21st: “Reserved seats are 20. Request extra seats” → mini quote (ops), not silent.

Amit (dept owner) can open this tab **only for HR**. Engineering cohort is hidden.

---

### Screen 11 — Kavya’s invite email / logged-out landing  
**NOT in Figma**

“Northlane enrolled you in People Operations Foundations. Accept by 11 Sep.”  
**Accept invite** → if no CalxMap login: set password / Google **with that work email** → Screen 20 (My learning).  
Wrong email → “Ask Priya to resend.”

14 days, no accept → row **Invite expired**. Priya **Resend**.

---

### Screen 12 — Confirm cohort (T-7 or Priya clicks Confirm)  
**NOT in Figma**

When at least `min_seats` (12) have **Accepted**:

- Banner: **12–20 accepted. Confirm to lock dates and generate the schedule.**
- **Confirm cohort** → Screen 13 schedule generated, faculty bookings created, learners see dates. Wallet: still reserved; moves to escrow **T-24h before first session**.

If at T-7 accepted < 12:

**Screen 12b — Below minimum**

Three choices, all explicit:

1. **Postpone** (pick new start)  
2. **Merge with another department’s waitlist** (ops helps)  
3. **Cancel and full refund**

Cannot click Confirm. Cannot silently start a batch of 8.

---

### Screen 13 — Manage cohort → Schedule  
**NOT in Figma**

List of sessions from modules:

| When | Module | Type | Faculty | Join / venue |
|---|---|---|---|---|
| Mon 18 Aug 10:00 | 1: Structured 1:1s | Live | Dr. Sharma | Meet link |
| … | … | Recorded | — | Watch |
| … | Comp framework workshop | On-site | Dr. Sharma | Office address |

Priya cannot fake attendance here. She can **Excuse** a named employee for one session (reason, audit).

---

### Screen 14 — Dashboard → Programs (in flight) — **this is the Figma screenshot**

Now the Figma row finally makes sense:

- Title **People Operations Foundations** (or AI Systems for Managers in the mock)
- Pill **2 behind** if ≥2 HR learners match the behind rule
- `Cohort A · Human Resources · Dr. A. Sharma`
- `18 of 20 seats used · Ends {date}` (2 never accepted → unused)
- Bar **Cohort progress · module 2 of 4 · 40%**
- **Next session: Mon 25 Aug, 10:00**
- **View report** → Screen 16  
- **Manage cohort** → Screen 15  

KPI strip **across all Northlane EDPs** (not dummy forever): employees enrolled, completion, learning hours, average assessment.

**+ Enrol in a program** → catalog again (e.g. Engineering’s Applied AI).

---

### Screen 15 — Manage cohort → People (with progress)  
**NOT in Figma — this is the screen you asked for**

Table, one row per employee, **this cohort only**:

| Employee | Dept | Status | Progress | Live | Last assessment | Flag | Actions |
|---|---|---|---|---|---|---|---|
| Kavya Shah | HR | Active | 75% | 3/4 | 82 | — | Message |
| Neha | HR | Active | 25% | 1/4 | — | **Behind** | Remind, Excuse |
| … | | Invited | — | | | | Resend |
| … | | Dropped | | | | | — |

Filters: Behind only | Status | Search.

**Send reminders** (Figma notification CTA) → only **Behind** rows. Confirm: “Email + in-app to 2 people.” Done. Disabled 24h for those two.

Click a name → **Screen 15b Employee drawer**

- Module list: Module 1 **Done** (live attended), Module 2 **Recording 40%**, Module 3 **Locked**, Module 4 Assessment **Not started**
- Attendance days (from faculty booking, approved)
- Scores
- Priya **cannot type 75%**. She can Excuse / Drop (reason) / Message

---

### Screen 16 — View report  
**NOT in Figma**

- Heatmap: employees × modules (green done, yellow in progress, red missed, grey locked)
- Behind list
- Assessment histogram
- Hours
- **AI summary** labelled: “Two people missed both lives in week 2; both have not opened the recording.”
- Download CSV / PDF

Amit sees **only HR rows**. Priya sees all departments’ cohorts as separate reports.

---

### Screen 17 — Manage cohort → Billing  
**NOT in Figma**

- Reserved ₹1,80,000  
- Seats used 18 / 20  
- Forecast refund 2 seats  
- After first session: escrow  
- After complete: faculty paid (net), refund posted, GST invoice download

---

### Screen 18 — Cohort complete  
**NOT in Figma**

All active learners completed or dropped/failed. Priya:

- Certificates issued (download zip)
- Final money sentence
- Report frozen (read-only)

---

# PART B — Kavya learns (employee path)

Kavya is **not** an Expert and **not** a Student intern. She is a **company learner** for this cohort only.

---

### Screen 20 — My learning (home)  
**NOT in Figma**

After Accept invite.

- Program name, HR, faculty
- **Your progress 75%**
- If behind: red banner **You’re 2 modules behind. Watch Module 2 recording before Monday live.**
- **Next: Live session Mon 25 Aug 10:00 — Join** (enabled 15 min before)
- Module list 1–4 with states: Done / In progress / Locked / Missed

She does **not** see Neha’s scores. She does **not** see Company Dashboard.

---

### Screen 21 — Live session

Join → Meet/venue. After session, status **Attendance pending faculty**. Then **Present** or **Absent** (company can dispute like training).

Miss live → module **Missed**. If catalog says recording is catch-up only (default): she can watch but it **does not** clear “missed live” for behind-count unless Priya Excuses.

---

### Screen 22 — Recording

Player on CalxMap. Progress at 90% watch → module recording complete. Download-only does not count.

---

### Screen 23 — Assessment

Pass mark **70**. Fail → **one retake**. Fail again → module failed; faculty can override. Certificate needs all required modules passed.

---

### Screen 24 — Certificate

PDF when enrolment completed. Linked from My learning.

---

# PART C — Dr. Sharma (faculty)

---

### Screen 30 — Expert dashboard engagement

Row: People Operations Foundations · Northlane HR · next session Mon 25 Aug. **Open**.

---

### Screen 31 — Session — mark attendance

Same pattern as live **training attendance**: entry, exit, pending company review. This booking is tied to the EDP session, not a campus FDP post.

---

### Screen 32 — Grade assignment / long-form assessment

Queue of submissions. Score. Kavya sees Screen 23 result.

Payout: after approved attendance / package line — wallet to expert net. Sharma does not Instant-Book this.

---

# PART D — If it breaks (same screens, different content)

Do not invent new products. Same frames, different pills.

| What happened | Where Priya is | What she sees |
|---|---|---|
| She closes modal without send | Screen 01 | Nothing saved |
| Withdraw after send | Screen 04 | Withdrawn, ops pinged |
| Quote 3× budget | Screen 08 | Red banner, Approve still possible with checkbox “I accept over budget” |
| Quote expired | Screen 08 | Expired, Request new quote |
| Finance declines | Screen 08 | Decline reason |
| 8 people accepted at T-7 | Screen 12b | Cannot start; postpone / merge / refund |
| Employee quits week 3 | Screen 15 | Drop; replacement **only if <20% modules done** |
| Faculty sick | Screen 13 | Session cancelled; new date; **no behind penalty** for that session |
| Two HR + Engineering same EDP | Two rows on Screen 14 | Two cohorts, never merged |
| Restricted company profile | Screen 03 | Cannot send |

---

# PART E — Rules that make the screens honest

These are not “backend notes”. They are **why the UI shows what it shows**.

1. **Department is the cohort.** HR request ≠ company-wide batch.  
2. **Send request = ₹0.** Indicative on Screen 03 is a calculator.  
3. **Approve quote = reserve.** Grey box on Figma modal is a promise — Screen 09 must match it.  
4. **2 behind** on Screen 14: that learner is ≥2 required modules behind the cohort’s current module **or** has ≥2 unexcused missed lives.  
5. **78% / 42 / 872-style dummy** never on a new company. Empty Programs = Screen 05 zeros + Enrol.  
6. **Priya cannot type progress.** Screen 15 numbers come from attendance, watch %, scores.  
7. **CalXAI** drafts quote, reminders, report paragraph. Never Approve, never Present, never Issue certificate. AI text labelled **AI summary**.  
8. **Campus FDP** is a different product (institution posts a training project). Do not put Kavya on that flow.

---

# PART F — Screen index (design file you still need)

| # | Frame | In Figma? |
|---|---|---|
| 01–01c | Home / Services / Marketplace Programs | Yes |
| 02 | Program Overview | Button only |
| 03 | Request a proposal | Yes |
| 04 | Request sent | No |
| 05 | Programs — awaiting quote | No |
| 06–07 | Ops inbox + build quote | No |
| 08 / 08b / 08c | Quote / finance / counter | No |
| 09 | Reserved | No |
| 10–12b | Roster, invite, confirm, min-batch | No |
| 13 | Schedule | No |
| 14 | Programs in-flight | Yes (list) |
| 15 / 15b | People + employee drawer | No — **this is per-employee tracking** |
| 16 | View report | Button only |
| 17–18 | Billing / complete | No |
| 20–24 | Employee My learning | No |
| 30–32 | Faculty session | Extend expert dashboard |

Until 04–13 and 15–16 exist, Figma’s Programs page is a **poster**, not a product.

---

# Open product locks (one line each)

1. EDP platform fee vs 30% training default.  
2. Can recording replace a missed live? **Default in this flow: no.**  
3. Replacement hire until 20% modules.  
4. Learner ≠ Student role.  
5. Faculty: CalxMap assigns on quote vs company picks shortlist.
