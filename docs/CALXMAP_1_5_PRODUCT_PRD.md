# CalxMap 1.5 — Product Requirements Document

**Status:** Draft for product lock  
**Audience:** Product, design, engineering, ops  
**Sources:** Figma *CalxMap — Explore Your World* (Approved Design), current expert-collaboration codebase and product docs  
**Date:** 27 Aug 2026  
**Code:** none. This document is the product contract for the full-codebase revamp.

---

## 0. How to read this document

CalxMap 1.5 implements **everything on the Figma Approved Design page**, for real users, not as a visual mock.

Figma is the **experience contract** (who sees what, which modules exist, how a session is booked).  
The live product is the **operations contract** (how an application, booking, attendance day, offer letter, and payout actually complete).  
1.5 must ship both. Where they conflict, this PRD states the **user-facing rule** and the **flaw to resolve** — it does not drop a Figma surface.

**Out of this PRD’s committed UI (flagged, not deleted):** Figma *Ideation* (CalxBook learning OS, 393px local-worker app, password signup, six-role picker). Those are separate products. Super-admin is thin in Figma and **required** in 1.5 because live ops cannot run without it.

---

## 1. Product thesis (user perspective)

People do not come to CalxMap to “use a dashboard.” They come to **get expertise, get work, or get learning — and get paid or get delivery without chasing WhatsApp.**

| Person | What “done” feels like |
|---|---|
| Company hiring manager | The right expert is booked or hired, the team can see status, money left the wallet only when work happened. |
| Expert | Work requests are clear, I control what I offer, I am not ghosted after I apply, money lands after I delivered. |
| Student | I applied, I know if I am in, I have a task or a class, I got paid or I learned. |
| Campus admin | My students’ internships are approved, faculty sessions are staffed, the college is not individually invoiced into chaos. |
| Super-admin (ops) | I can fix a stuck engagement, verify a person, and see money without impersonating five accounts badly. |

Today’s live product already completes **campus training and intern/freelance pipelines**, but the UI does not feel like one marketplace OS. Figma feels like that OS, but many journeys **stop at a button**. 1.5 is the join: Figma’s OS, with every journey closed.

**Tagline Figma already wrote (keep):** *The future of work is not hiring, it’s access.*  
**Operating line (keep):** *Workforce OS — Learn. Access. Execute.*

---

## 2. Personas and jobs-to-be-done

### 2.1 Expert — offering expertise

**Job:** Turn skills into bookable services and project work without becoming a full-time salesperson.

**Figma jobs:** publish up to five services; accept 15-min PODs; apply to hourly/freelance/training; log hours; get paid; talk to Agent; use Community.

**Live jobs already in code:** apply to institution requirements; negotiate rate; receive offer letter; mark training attendance; request completion.

**1.5 must do both.** An expert who only gets Instant Book and never sees a college FDP is a different product than the one running today.

### 2.2 Company — looking for expertise

**Job:** Get a person or a program without standing up a vendor process from scratch.

**Figma jobs:** search/book experts; post expert/freelance/internship requirements; run EDPs; approve intern work and freelancer deliverables; calendar; company wallet with escrow; Agent; Community.

**Live analogue:** `institution.type = corporate` plus training `institution` as buyer. Corporate posting is publicly “Coming Soon” while intern/freelance already exist behind the type flag.

**1.5 user rule:** Company is a **first-class signup role** (Figma). Existing corporate institutions **migrate into Company**. Educational institutions stay Institution. One human, one primary role at a time (Figma says role can change later — see §12).

### 2.3 Student — mentors and work at student rates

**Job:** Get internships, freelance, programs, and small paid PODs without being treated as a cheap expert.

**Figma jobs:** apply; track Applied / Working / Accepted; continue learning; Open Workspace; rank; spend/earn wallet; Agent; Community.

**Live jobs:** apply to internships and freelance; profile setup.

**1.5 must close Workspace, application rejects, and wallet.** “Student rates” must be a real price rule, not copy.

### 2.4 Institution — campus / group access

**Job:** Open expert access to a group with shared booking and billing; approve student work; staff faculty programs.

**Figma jobs:** approve/decline internships; hire faculty; buy programs per student; shared wallet; Create Requirement; top students.

**Live jobs:** post guest lecture / FDP / workshop; select experts; attendance approve; internships as **consumer** (non-corporate) vs **poster** (corporate).

**1.5 user rule:** Campus is Institution. They **buy training and programs** and **sponsor students**. They do not become a second Company unless the org explicitly has a corporate arm.

### 2.5 Super-admin — not drawn, still a user

**Job:** Keep the marketplace honest and unblocked.

**Live jobs:** create profiles, act-as, margin, KYC, bulk import, finance, CalxBook verification.

**1.5:** Super-admin portal stays. It is not on Approved Design; shipping 1.5 without it strands every exception path (disputes, KYC, failed payouts, impersonation for support).

### 2.6 Anonymous visitor

**Job:** Decide if CalxMap is for me and start the right signup.

Landing, stories, solutions list, Sign Up / Sign In, role explainer (“Read this”).

---

## 3. Experience principles

1. **Every primary CTA has a next screen and a failure screen.** No “View Applicants” into nowhere.
2. **Status is a sentence, not a colour only.** “Elena has 2h to accept. Your card is held.” beats a spinner.
3. **Money is visible before commit.** Fee, GST, escrow vs charge-now, who can refund.
4. **One work object has one lifecycle.** Do not mix Figma “Interviewing” with live `in_progress` without a map (see §5).
5. **Role chrome is shared; work is not.** Home/Services/Marketplace/Dashboard/Profile/CalX AI/Community for all four roles; Dashboard contents differ.
6. **Ops can always find the object.** Super-admin can open the same requirement/booking the user sees.

---

## 4. Scope

### 4.1 In — Approved Design (must implement)

| Module | Surfaces |
|---|---|
| Public | Landing Page |
| Auth | Sign In, OTP, social, role picker, Read this, display name ×4, Completion CTA ×4, I’ll finish later, Form-1/2/3 |
| Company | Home, Services, Marketplace, Create requirement ×3, Requirement view, Dashboard (overview, notifications, requirements, programs, interns, freelancers, calendar month+agenda, **Marketing, Legal**), Profile, Wallet, booking modals, schedule dialog |
| Expert | Home, Services, Marketplace, Manage Services + 5 dialogs, Dashboard + engagements, Profile, Wallet, Agent (Marketplace vs Wallet nav) |
| Student | Home, Services, Marketplace, Dashboard (Overview / Internships / Freelance / PODs), Profile, Wallet |
| Institution | Home, Services, Marketplace, both dashboard treatments (campus-admin + long OS), Profile, Wallet |
| Shared | CalX Agent (chat, voice, history), Community (feed, circle, thread), booking modals |

### 4.2 In — from live product (must survive inside those screens)

Applicant pipeline, rate lock, offer letter, training attendance, booking completion/cancel, invoices/GST/TDS, KYC, acting-as, notifications.

### 4.3 Explicit product decisions this PRD makes (so 1.5 is buildable)

These are analyst calls so engineering is not guessing. Product can override before build.

| Topic | 1.5 rule |
|---|---|
| Roles | Four Figma roles + Super-admin. Company ← migrate corporate institutions. |
| Fees users see | Figma checkout: **platform 5% + GST 18%** on session / visit / similar. **Training/FDP packages** keep **gross/net with platform margin** (today 30% or `margin_percent`) because colleges do not buy “2 hours × ₹4500.” Both appear in the product; the **engagement type** picks the model. |
| Instant Book vs apply | **Both.** 15-min POD and 1:1 Instant Book follow Figma. Multi-week expert requirements, FDPs, internships follow apply → interview → lock. |
| Wallet | Implement. Personal wallets for Expert/Student; Company/Institution wallets with escrow, reserved, available. Until a PSP is live, **wallet is real ledger + “add money” sandbox/ops-funded**; do not fake balances. |
| Agent | Implement chat + history in 1.5. Voice is a mode of the same thread, not a separate product. First skills: create requirement, search experts, explain a status. |
| Community | Implement. Moderation and Admin posts are ops-owned (CalxMap Official). |
| Local work | Implement on-site visit modal **and** Services “Coming Soon” until supply exists. Do not let users pay for a visit with zero experts in range. |
| Marketing / Legal dashboard | Implement as **queues**, not empty tabs: Marketing = promotion/influencer/campaign requirements; Legal = legal-service requirements and contracts. If no objects, show empty states Figma never drew. |

---

## 5. Core objects and state machines

Users should recognise these names in the UI.

### 5.1 Account

`anonymous → signed_in_unverified → named → onboarded | skipped_onboarding → restricted | active | suspended`

**OTP:** `code_sent → correct | wrong | expired | rate_limited`  
**Social:** `linked | email_conflict | cancelled`

### 5.2 Requirement (Company/Institution post)

Types: **Expert / Freelance / Internship** (Figma). Live also has **training project types** (guest_lecture, fdp, workshop, …). 1.5: Expert requirement **includes** those training types as a subtype on the Expert form (department + engagement type).

`draft → open → interviewing → offered → filled | closed | cancelled`  
Applicants: `applied → shortlisted → interview → offered → accepted | rejected | withdrawn | expired`

### 5.3 Expert service offering

Five products: Hourly Engagement, 1:1 Consultation (incl. 15-min POD), Interviewer, Training, Job Referral.

Each: `off | live`. Caps: 5 live (Figma). Response SLA 24h or Response Rate drops.

### 5.4 Booking / session / POD / visit

`requested (hold) → accepted (capture) | declined | expired_hold → upcoming → in_progress → completed | cancelled | no_show | disputed`

Cancel: session **12h free**; on-site **1h free** (Figma). After that: fee policy must be stated (not in Figma — see edge cases).

### 5.5 Long engagement (project / internship / freelance / EDP cohort)

`active → on_track | timesheet_due | nearing_cap | behind → completed | closed | cancelled`  
Hours: `logged → awaiting_approval → approved | changes_requested`  
Money: `reserved | in_escrow → released | refunded`

Training attendance (live, keep): day `entry → exit → pending_review → approved | disputed → resubmitted`.

### 5.6 Student application

`applied → working | accepted | rejected | withdrawn`  
Institution gate: `pending_campus_approval → approved | declined` **before** Working, when the student is rostered to a campus.

### 5.7 Wallet

Buckets: **available, in_escrow, reserved**. Txn: `pending → posted | failed`. Payout: `requested → KYC_blocked | processing → paid | failed`.

### 5.8 Community thread

`published → locked | hidden | deleted`  
Reply: `posted | removed`

### 5.9 Agent conversation

`open → awaiting_user | awaiting_tools | failed | archived`

---

## 6. Information architecture (what the user clicks)

Shared authenticated chrome:

`Home · Services · Marketplace · Dashboard · Profile · CalX AI · Community · Search`

**Nav exceptions (Figma):** some Expert Agent frames show **Wallet** instead of Marketplace. **1.5 rule:** Marketplace stays in top nav for everyone who can apply/book. **Wallet is always reachable** from Profile and from Dashboard, and in Expert/Student top nav. Company/Institution Wallet lives under Dashboard and a Wallet entry in the user menu. Do not hide Marketplace to make room for Wallet.

**Company Dashboard:** Overview, Requirements, Programs, Interns, Freelancers, Marketing, Legal, Notifications, Calendar. Actions: Schedule, Post a requirement.

**Expert Dashboard:** Overview, Projects, Services, Notifications, Calendar.

**Student Dashboard:** Overview, Internships, Freelance, PODs.

**Institution Dashboard:** Campus KPIs + Pending Approvals + Faculty + Catalog (compact frame) **and** the long OS tabs (Overview, Applications, Placement, Legal, Calendar, Requirements) — 1.5 **merges** these into one dashboard with those tabs, campus KPI strip on Overview. Do not ship two competing Institution Dashboards.

---

## 7. Flows — user stories, edges, flaws

Each flow: **Happy path** (what the user thinks happens) → **Must-have alternate states** → **Edge cases** → **Flaw to fix in 1.5**.

---

### Flow A — Arrive and join

**Users:** anyone.

**Happy path**  
See landing → Get Started → pick Expert / Company / Student / Institution → email or Google/LinkedIn → OTP → display name (role-specific subtitle) → “Let’s do it” → Form-1 (LinkedIn or resume) → expertise → rate → Home.  
Or “I’ll finish later” → Saved screen → Take me to CalxMap (restricted profile).

**Alternates Figma started**  
Wrong OTP. Resume attached vs empty Form-1. Read this modal.

**Edge cases (user feels these)**

- I already have an expert account and pick Company with the same email.  
- Google email ≠ work email I wanted for Company GST invoices.  
- OTP expired while I was in another app.  
- I pick the wrong role and Figma promised I can change later.  
- Institution signup with Gmail (live product blocks this) vs Figma which does not.  
- Form-2/3 are expert-shaped; Company/Student/Institution still hit “Let’s do it” with nothing to fill.  
- Skip onboarding then try to Book now — marketplace must block or warn.  
- Two tabs: one completes signup, one still on OTP.

**Flaw**  
Figma onboarding after CTA exists only for experts. **1.5 must ship role-specific Form-1/2/3** (Company: legal name, GSTIN/CIN, size; Student: college, year, resume; Institution: UGC/NAAC, roster admin). “Change role later” needs a real path or the copy must die.

---

### Flow B — Company books an expert for a few hours (session)

**Happy path**  
Home or Marketplace → expert card → Book now → duration, slot IST, optional counter-rate, agenda → see 5% + GST + total → Request booking. Card **authorised**, charged **when she accepts**. Expert gets request (Response Rate if >24h). Accept → both get calendar. Join / complete. Cancel free until 12h before.

**Alternates**  
Expert declines. Hold expires. User counters below expert’s floor. Expert Instant Book off.

**Edge cases**

- Two companies hold the same slot.  
- Wallet empty vs card hold — Figma says card; Wallet page says company funds. **Which instrument is charged?**  
- GST on discounted counter-rate.  
- Expert accepts then no-shows.  
- Company cancels at 11h 59m vs 12h 1m.  
- Expert’s weekly hour cap would be exceeded by accept.  
- Timezone: user in Dubai, expert IST.  
- Partial duration “HH:MM” custom not in 1/2/3/4h chips.

**Flaw**  
Figma stops at Request booking. **1.5 must add:** pending, accepted, declined, expired, upcoming, join, complete, cancel, dispute. Must pick **card vs wallet** as default tender (recommendation: wallet if balance covers total, else card hold; never both).

---

### Flow C — Company requests an EDP / program

**Happy path**  
Services or Marketplace program → Request a proposal → team, headcount, start, optional budget, outcome → Send request. Nothing charged. Quote within one working day. Company approves quote → seats reserved → cohort appears on Programs dashboard (progress, 2 behind, next session).

**Edge cases**

- Quote comes back 3× budget.  
- 2 employees more than two modules behind (notification exists; what does “Send reminders” do?).  
- Batch below Training minimum — Figma Training dialog says auto-cancel and refund.  
- Seat unused after start.  
- Faculty expert sick on live session.

**Flaw**  
No quote-received, approve-quote, or waitlist screens. Notifications mention cohort problems without a Programs empty/error design.

---

### Flow D — Company posts a requirement (expert / freelance / internship)

**Happy path**  
Post a requirement → pick type → fill form → Next → (missing: review) → live on Requirement View with ID `#REQ-…`. Candidates apply. Company View Applicants → shortlist / interview / offer. Dashboard Requirements shows Open / Interviewing / Closed.

**Edge cases**

- Freelance form copy still says “internship” / “for experts” (Figma bug — fix copy in 1.5).  
- Next with empty required fields.  
- Budget min > max.  
- Internship PPO + stipend 0.  
- Duplicate post.  
- Close while 18 applicants waiting.  
- CalX Agent creates the requirement from chat — who owns edits?

**Flaw**  
No review, success, or pay-to-post screen. View Applicants is a dead button in Figma; **1.5 uses the live pipeline** and must **show it**. Expert training requirements must still collect **compensation unit** (session/day/package), not only hourly, or campus users cannot post an FDP.

---

### Flow E — Expert gets selected for a training / long project (live spine inside Figma Dashboard)

This is the flow Figma’s Expert Dashboard “On track / Timesheet due” is trying to be, and that code already runs.

**Happy path (user)**  
I applied (agreed rate or “negotiate if shortlisted”) → moved to interview → we lock money → I get an offer letter → I accept → schedule is confirmed → I mark attendance → institution approves days → I request completion → they approve → I get paid.

**Edge cases**

- I agreed posted rate then the scope grew (travel, extra session).  
- Offer expires in 3 days (live).  
- Attendance disputed.  
- I request completion with &lt;80% approved hours.  
- Institution marks complete without me.  
- Project dates ended, days still pending review.  
- Super-admin acting-as accepts an offer I did not see.

**Flaw**  
Figma Expert Home shows internships in “Recommended Jobs.” Experts should not apply to student internships. **1.5 filters supply vs demand by role.**

---

### Flow F — Expert Manage Services (five offerings)

**Happy path**  
Home → Manage Services → turn on Hourly / 1:1 / Interviewer / Training / Referral with caps, rates, topics. “2 of 5 live.” Open requests must be answered in 24h.

**Edge cases**

- Turning off Instant Book while a POD is already held.  
- Weekly capacity 20h but two 15h engagements.  
- Interviewer NDA before candidate details — expert refuses NDA.  
- Referral: candidate fails probation — clawback? Figma says pay after probation, candidate never charged.  
- Training batch 1–10 minimum, 3 enrolled, auto-cancel — refund from whose wallet?  
- All five live vs Figma sample “2 of 5.”

**Flaw**  
Dialogs are rich; **there is no request inbox UI** beyond “Review requests →”. 1.5 must add that inbox (POD, hourly, interview, training, referral) with accept/decline.

---

### Flow G — Expert applies from Marketplace

**Happy path**  
Marketplace filters → Apply Now / View Details → application lands in Company/Institution applicants.

**Edge cases**  
Apply twice. Requirement closed mid-apply. Rate on card is hourly, requirement is fixed package. Student-looking internship on Expert Marketplace (Figma IA leak).

---

### Flow H — Student gets an internship

**Happy path**  
Home Opportunities or Services internships → Apply → Dashboard Applied → campus admin Approve (if rostered) → Working → Open Workspace task due → Accepted / complete → wallet payout.

**Edge cases**

- Campus declines after company already “Working.”  
- Two campuses claim the same student.  
- Workspace for freelance vs internship vs POD — one object or three?  
- Stipend run on Institution/Company dashboard vs student wallet credit timing.  
- Rank/PODS on profile vs 15-min POD product — **rename in UI:** profile PODS = “completed micro-gigs” or similar; 15-min product stays “POD.”

**Flaw**  
Open Workspace has no screen. Rejected/withdrawn not drawn. Dummy wallet history is the same as Expert’s — 1.5 must be role-true.

---

### Flow I — Institution (campus) day

**Happy path**  
Overview: active interns, lectures live now, pending approvals Approve/Decline. Home: Create Requirement (faculty), top students, faculty program progress. Marketplace: book educational experts / enroll campus programs. Shared wallet.

**Edge cases**  
Student applies off-platform. Faculty expert is also a Company client. NAAC dates expired. Placement Rate widget with no placement module behind it. Two Institution Dashboard frames in Figma — **merged in §6**.

**Flaw**  
One dashboard still says “Welcome back, Rahul” (student copy). 1.5 campus voice is “Campus Admin,” not a student clone.

---

### Flow J — Wallets and money (all roles)

**Happy path**  
Company: available / escrow / reserved, auto-recharge, GST credit, department caps, spend &gt; ₹50k needs finance approval. Expert/Student: available balance, withdraw, add money, filters All / Earnings / Spends.

**Edge cases**

- Auto-recharge fails, hold already placed on an expert.  
- Escrow release: session complete vs hours approved vs intern stipend date vs referral probation — **four different events**.  
- Withdraw below KYC.  
- Split GST invoice to Company vs expert GST on payout.  
- Two members spend the last rupee concurrently.  
- Figma 5% on session vs 30% on FDP — user sees both on one statement; labels must name the **product line**.

**Flaw**  
No add-money, withdraw, KYC, or failed-payout screens. Four Company Wallet frames look identical in copy. **1.5:** tabs Category / Department / Members / Methods as real views. **Do not ship a decorative ₹8.4L balance.**

---

### Flow K — CalX Agent

**Happy path**  
CalX AI → Chat “create requirement for UI/UX Designer” → Agent drafts → user confirms → requirement exists. History lists past jobs. Voice tab speaks the same thread.

**Edge cases**  
Agent posts without confirm. Agent uses another role’s data (acting-as). Voice on noisy campus. Agent fails mid-tool. User asks to “pay Priya” — Agent must not move money without a confirm screen.

**Flaw**  
Empty greeting + one history item only. Voice has no UI. **1.5:** confirm cards for any write; read-only status explanations; Voice = speech-to-text into the same composer if full voice pipeline is late, but the tab must not be a dummy.

---

### Flow L — Community

**Happy path**  
Feed (Trending / Newest / No Replies) → circle (Gig Economy, Student Zone, …) → thread → reply with editor → upvote. Start New Thread.

**Edge cases**  
Doxxing, spam, expert poaching off-platform, student sharing paid EDP materials, “Report” with no outcome. Empty circle. Banned user.

**Flaw**  
Start New Thread and Report have no completion UI. **1.5:** compose, report, and empty states. Guidelines circle is not optional if Community is public.

---

### Flow M — Calendar and Schedule dialog

**Happy path**  
Company Schedule → type (e.g. interview), date, time, who’s involved → everyone sees it. Calendar month vs agenda. Unconfirmed invites wait on expert.

**Edge cases**  
Expert in another booking. Cohort session vs interview vs timesheet deadline mixed on one calendar. DST. Invitee without a CalxMap account.

---

### Flow N — Notifications

**Happy path**  
All / Unread / Needs action. Deep links: Open, Review and pay, Approve timesheet, View applicants, Send reminders.

**Edge cases**  
Mark all as read hides unpaid timesheet. Notification for a requirement I no longer can access.

---

### Flow O — Profiles and trust

**Happy path**  
Company: entity verified, payment verified, response rate. Expert: IQ, background check, skills, hourly. Student: rank, assessment, college, resume. Institution: NAAC, UGC, placement rate.

**Edge cases**  
“Finish Verification • 2 left” with no wizard. Decorative IQ vs live `kyc_status`. Student retake assessment — cooldown? Fake NAAC.

**Flaw**  
Trust badges without collection flows will be gamed. **1.5:** each badge has a source (KYC vendor, GSTIN API, proctoring, self-attest + ops). If a badge cannot be sourced in 1.5, show “Unverified” not a fake 872/1000.

---

## 8. Cross-cutting rules (so users are not surprised)

### 8.1 Who can do what (simple)

| Action | Expert | Company | Student | Institution |
|---|---|---|---|---|
| Book session / visit | Receive | Yes | 1:1/POD if Instant Book allows student rates | Faculty book |
| Post expert requirement | No | Yes | No | Yes (faculty/training) |
| Post internship / freelance | No | Yes | No | No (approve only) unless product later allows campus-posted internships |
| Apply to internship | No | No | Yes | No |
| Manage 5 services | Yes | No | No | No |
| Shared billing members | — | Yes | — | Yes |
| Act-as (ops) | Super-admin only | Super-admin | Super-admin | Super-admin |

### 8.2 Money event → user sentence

| Event | What the user should see |
|---|---|
| Session requested | “₹X held. Charged if the expert accepts by {time}.” |
| Session accepted | “₹X captured. Cancel free until {deadline}.” |
| Hours approved | “₹X moved from escrow to expert (net of fee).” |
| Intern stipend run | “₹X to {n} students on {date}. {k} blocked (attendance/KYC).” |
| Referral | “₹X reserved until {name} clears probation.” |
| EDP quote approved | “₹X reserved for {n} seats. Unused seats refunded by {rule}.” |

### 8.3 Empty, loading, error (none in Figma — required for users)

Every list: loading skeleton, empty (“Post your first requirement”), zero search results, permission denied, payment failed, session expired. Every form: field error, duplicate, offline. Every money action: processing, failed, retry.

---

## 9. Product flaws (honest)

### 9.1 Figma flaws (experience is incomplete)

- Journeys stop at CTA (applicants, booking accept, quote, workspace, withdraw).  
- Duplicate frames with conflicting nav and copy.  
- Dummy data reused across roles (same ₹6,800 payout on student and company).  
- Two Institution dashboards.  
- Marketing/Legal tabs with no pages.  
- Expert Home recommends internships.  
- Onboarding forms only for experts.  
- Fee 5% vs live 30% with no engagement-type split.  
- Wallet and card both implied.  
- POD means two things.  
- Local work Coming Soon vs a complete paid visit modal.  
- Almost no error/empty/success states except OTP wrong.

### 9.2 Live product flaws (users already hit these)

- Corporate is a type, not a Company home — public “Coming Soon” while features exist.  
- Chrome is not one OS (no Services/Marketplace/Agent/Community/Wallet).  
- Applicant and attendance flows exist but do not feel like Figma’s OS.  
- Selection vs training-start confusion (already documented in attendance rectified flow).  
- No PSP — you cannot honestly show “card authorised” in production without one.

### 9.3 User harm if we ship Figma pixels without closing flows

People will think they booked, paid, applied, or got approved when they only pressed a button. That is worse than today’s clunkier but completable training flow.

---

## 10. Roadmap — workflow of the product (all Figma, in an order users can survive)

Do not build Community before a booking can succeed or fail. Users forgive a missing forum; they do not forgive a vanished payment.

### Phase 0 — Product lock (1 week, no code)

Confirm: role migration, dual fee by engagement type, wallet vs card, PSP, KYC vendor, Agent write-confirm, Community moderation owner, super-admin in IA.

### Phase 1 — Identity and chrome (users can enter the OS)

Landing, auth (OTP + social + password fallback for existing users), four roles, display name, role-specific onboarding **or** skip with restrictions, shared nav, Home shells with **real** search over live experts/requirements. Super-admin acting-as on 1.5 chrome.

**User outcome:** I can sign up as the right person and not get lost.

### Phase 2 — Company demand OS (the money-making loop)

Marketplace + expert profiles + **session booking lifecycle** (hold/accept/decline/cancel). Create requirement ×3 + Requirement view + **View Applicants** (live stages). Dashboard: Overview, Requirements, Notifications, Calendar, Schedule dialog. Profile verification **started** (GSTIN/CIN).

**User outcome:** I can hire or book someone and see what happened.

### Phase 3 — Expert supply OS

Manage Services + request inbox. Marketplace apply. Dashboard engagements. Map live offer letter + attendance + completion into Figma engagement rows. Wallet **ledger** (even if payouts are ops-manual for a short window).

**User outcome:** I can say what I offer, accept work, and see when I get paid.

### Phase 4 — Student + Institution

Student apply + dashboard states + Workspace **v1** (task list + due dates, not a full IDE). Campus approvals. Institution dashboard merged. Faculty booking uses Phase 2 session/training paths. Programs dashboard **minimum:** enrol, progress, next session (quote flow can be ops-assisted in 4, self-serve in 5).

**User outcome:** Students are not ghosts; campus can approve; faculty can be staffed.

### Phase 5 — Money for real

PSP. Add money / withdraw. Escrow buckets. Auto-recharge. ₹50k approval. GST invoices. Dual fee lines on statements. Stipend run. Failed payout UX.

**User outcome:** The Wallet page is not theatre.

### Phase 6 — Programs, PODs, five services, local work

EDP proposal → quote → cohort. Instant Book PODs with student rates. Interviewer + Training + Referral with their Figma rules. On-site visits **only** where supply exists; otherwise Coming Soon (honest).

**User outcome:** Figma’s extra products exist without breaking Phase 2–3.

### Phase 7 — Agent + Community + Marketing/Legal queues

Agent with confirm-to-write. Community with compose/report/moderation. Marketing and Legal dashboard queues. Empty/error/success pass on every Phase 1–6 list.

**User outcome:** The OS matches the Figma map; leftover tabs are real or honestly empty.

### Parallel (entire time)

Design the missing states Figma skipped (this PRD §7–8). Do not wait for Phase 7 to invent “payment failed.”

---

## 11. Success metrics (user-centric)

| Signal | Why it matters |
|---|---|
| Time from signup to first meaningful action (book, apply, post, accept POD) | Chrome works |
| % session requests that reach accepted or declined (not stuck) | Flow B is closed |
| % applications that leave `applied` in 7 days | Companies are not a black hole |
| Expert payout lag after approved hours | Trust |
| Wallet “failed” txns recovered vs abandoned | Money UX |
| % onboarding skip who later complete profile | Form-1/2/3 not a wall |
| Support tickets: “I thought I paid / applied / booked” | Pixel-without-flow detector |
| Super-admin time to resolve a stuck booking | Ops is a user too |

---

## 12. Open questions (short — rest is decided in §4.3)

1. PSP and KYC vendors for India (wallet, UPI, GST).  
2. Exact post-window cancel fee (Figma only defines free windows).  
3. Hold TTL when expert does not respond (Figma: “usually ~2h” is not a rule).  
4. Role-change: allowed objects, wallet merge, in-flight bookings.  
5. Whether existing 70/30 training engagements **grandfather** forever.  
6. Agent model/provider and what it is **forbidden** to do (payouts, NDA bypass).  
7. Community: public vs logged-in-only.  
8. Student rate card: % off expert rate vs separate student SKUs.

---

## 13. Analyst summary (from the user’s chair)

If I am a **company**, Figma promises I can book in two minutes **or** hire like an ATS **or** run a course. Today I can mostly hire faculty the long way. 1.5 has to make the two-minute book **real**, without deleting the long way.

If I am an **expert**, Figma promises I control five products and get paid. Today I apply to colleges and punch attendance. 1.5 has to keep that paycheck path **and** add POD/inbox, or I will think the new UI stole my work.

If I am a **student**, Figma promises a career OS. Today I can apply. 1.5 is not a new dashboard; it is **knowing if I got in, what is due tomorrow, and whether money moved.**

If I am a **campus**, Figma promises control of students and faculty. Today I approve training days. 1.5 is **one admin home**, not a student dashboard with the names changed.

**Building all of Figma is right. Building it in the Phase 1→7 order is what makes it usable.** Shipping Agent and Community on dummy wallets first is how users lose trust.

---

## Related internal specs (do not duplicate; 1.5 must absorb)

- `docs/PRICING_AND_COMPENSATION_MODEL.md`  
- `docs/PRICING_NEGOTIATION_UX_FLOW.md`  
- `docs/TRAINING_ATTENDANCE.md`  
- `docs/TRAINING_ATTENDANCE_RECTIFIED_FLOW.md`  

Training/FDP money and attendance in those docs **win** on training engagements. Figma booking-modal math **wins** on session/POD/visit. The statement line must always name which product the user bought.
