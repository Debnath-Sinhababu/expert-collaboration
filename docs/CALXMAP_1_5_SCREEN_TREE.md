# CalxMap 1.5 — Screen tree (development map)

Padh lo, dimag mein rakh lo. Har page: **kahan se aaye, kya kar sakte ho, agla screen kaunsa, kaunse states, kaunse edge cases.**  
Figma ka har Approved Design screen yahan hai. Jahan Figma ruk jaata hai, tree ke andar **(build)** screens hain — yeh bhi banana hai, warna product incomplete hai.

Har screen par yeh 4 states default hain, alag se na likhun to bhi handle karna:

- **Loading**
- **Empty** (koi data nahi)
- **Error** (network / 500 / permission)
- **Success** (action ke baad confirmation)

---

## 0. Master tree (poora product)

```
Landing
├─ Sign Up ──► Create account (pick role)
│                 ├─ Email OTP
│                 ├─ Google / LinkedIn
│                 └─ Read this (role help)
│                       ▼
│                 Display name (by role)
│                       ▼
│                 Completion CTA
│                 ├─ Let’s do it ──► Onboarding Form 1 → 2 → 3 ──► Home
│                 └─ I’ll finish later ──► Saved ──► Home (restricted)
│
├─ Sign In ──► Email OTP / Google / LinkedIn ──► Home (that role)
│
└─ After login (same chrome, har role)
      Home
      ├─ Services
      ├─ Marketplace
      ├─ Dashboard ──► role-specific tabs (kaam yahan complete hota hai)
      ├─ Profile
      ├─ Wallet (user menu + Expert/Student nav)
      ├─ CalX AI (Agent)
      └─ Community
```

Role ke baad trees alag hain: **Company · Expert · Student · Institution**. Super-admin Figma mein nahi hai; ops ke liye alag portal rehna chahiye.

---

## 0.1 Global chrome (har logged-in page)

```
Top nav
├─ Logo ──────────────► Home
├─ Home
├─ Services
├─ Marketplace
├─ Dashboard
├─ Profile
├─ CalX AI
├─ Community
├─ Search ────────────► search results (build)
├─ Notifications bell ► Notification list / Company Notification page
└─ Avatar
      ├─ Wallet
      ├─ Settings (build)
      └─ Log out ──► Landing / Sign In
```

**Edge cases (chrome, har page)**

- Session expired mid-click → Sign In, return URL save
- Super-admin acting-as → banner “Acting as X”, nav us role ka
- Role A ka URL role B khole → 403 + “Go to your Home”
- Search empty query / no results / timeout
- Notification deep-link to deleted requirement
- Wallet vs Marketplace: Expert Agent frames Wallet dikhate hain — **Marketplace nav se hataana mat**; Wallet avatar menu + Expert/Student nav mein rakho

---

# 1. PUBLIC + AUTH

## 1.1 Landing Page

```
Landing
├─ Get Started / Sign Up Now ──► Create account
├─ Sign In ────────────────────► Sign In
├─ Talk to Agent / CalxMap AI ─► Create account (if logged out)
│                                else CalX Agent
├─ Marketplace / Solutions links ► public catalog (build) or Sign In
└─ Terms / Privacy ────────────► legal pages (build)
```

**States:** normal (Figma).  
**Edges:** already logged-in user hits `/` → that role Home, not landing again · CTA with dead marketing link · mobile width (Figma desktop only — responsive required).

---

## 1.2 Sign In

```
Sign In
├─ Continue with Google ──► if new: Create account (role still required)
│                           if existing: Home
├─ Continue with LinkedIn ► same
├─ Continue with email ───► Sign In | Enter Code
└─ Create an account ─────► Create account
```

**Edges:** Google cancel · email not registered → “No account, create one?” · social email already used with password · company user on personal Gmail (invoices) · rate limit · existing 1.0 password users: **password fallback (build)** “Use password instead” taaki old users lock-out na hon.

---

## 1.3 Sign In | Enter Code

```
Enter Code
├─ Correct ──► Home
├─ Wrong ────► same screen + error (Figma: Creating Code Error pattern)
├─ Resend ───► timer 0:24 then enable
└─ Back ─────► Sign In
```

**Edges:** expired code · too many wrong tries · email in spam copy · user changes email in other tab · paste 6 digits with space.

---

## 1.4 Create your account

```
Create account
├─ Pick role: Expert | Company | Student | Institution
├─ Read this ──────────► Modal (offering vs looking)
├─ Continue with email ► Creating: Mail Code
├─ Google / LinkedIn ─► Create account (social) → still need role → Continue
├─ Sign in ────────────► Sign In
└─ Back
```

**Edges:** no role selected · switch role after typing email · “change later” promise (Figma) — Settings mein change-role (build) warna copy hatao · Institution + Gmail: **warn or block** (live product blocks; Figma nahi) — decide and handle on this screen.

---

## 1.5 Read this: Modal

```
Read this
├─ Continue as expert / company / student / institution ──► role selected, modal close
└─ Dismiss
```

**Edges:** open without picking · screen reader / small height clip (modal 900×650).

---

## 1.6 Creating: Mail Code  +  Creating: Code Error

```
Mail Code
├─ Correct ──► User Name | {role}
├─ Wrong ────► Code Error (same page, error text)
│                 ├─ Try again
│                 └─ Receive new code
└─ Resend
```

**Edges:** same as 1.3 · code for different email than displayed · social users should **skip** this screen.

---

## 1.7 User Name | Experts / Company / Student / Institution

```
Display name
├─ Next ──► Completion CTA: {role}
└─ Back
```

**Copy alag hai (Figma):** Experts “show up to clients” · Company “to experts” · Student “mentors will see you” · Institution “organization appears to members”.

**Edges:** empty name · emoji/script injection · duplicate public name · Company wants legal name ≠ display name (legal name Form-1 mein).

---

## 1.8 Completion CTA × 4

```
Nice to meet you
├─ Let’s do it ────► Form-1 (role-specific — Figma sirf expert draw kiya)
└─ I’ll finish later ► I’ll do it later screen
```

**Edges:** close tab here → next login: CTA dubara ya Home restricted? **Rule:** Home restricted until Form complete OR skip recorded.

---

## 1.9 I’ll do it later

```
Saved
├─ Finish it now ──────► Form-1
└─ Take me to CalxMap ─► Home (restricted)
```

**Restricted Home edges:** Book now / Post requirement / Apply / Withdraw → **block with “Finish setup”** (build modal). Browse/search allowed.

---

## 1.10 Form-1 / Form-2 / Form-3 (onboarding)

Figma expert:

```
Form-1  Import LinkedIn | Attach resume | Skip typing
   ▼
Form-2  Expertise chips (max 5)
   ▼
Form-3  Hourly rate ──► Home (full)
```

**1.5 (build) — same 3 steps, fields by role**

```
Expert     resume/LinkedIn → skills → hourly rate
Company    legal name, GSTIN/CIN, size, logo → domains → billing admin
Student    college, year, resume → interests → (no public hourly)
Institution UGC/NAAC, campus name → faculties → billing members
```

**Form-1 extra state (Figma):** file attached `alex-chan-resume.pdf` vs empty.

**Edges:** file >10MB / wrong type · LinkedIn fail · Skip then empty profile · Form-3 rate 0 or insane · Back loses upload · Finish later mid-form (save draft) · Company GSTIN invalid format.

---

# 2. COMPANY

## 2.1 Company | Home

```
Company Home
├─ Search ──────────────► Marketplace (query)
├─ Expert Book now ─────► Modal / Book a session
├─ View Profile ────────► Expert public profile (build from Expert-Profile)
├─ Featured EDP Get Started ► Program detail (build) → Request a proposal
├─ Show more news ──────► stay / news list (build)
├─ Post requirement ────► CreateRequirement (type picker)
└─ Nav → Services, Marketplace, Dashboard, Profile, Agent, Community
```

**Edges:** restricted profile + Book now · search typo zero results · expert unavailable / Instant Book off · EDP sold out · recommended experts empty (new company).

---

## 2.2 Company | Services

```
Services
├─ Category tile ──► category browse (Figma: “Select a category…”)
│     Consultations / Interns & Freelancers / EDP / Legal / Local Work
│     Industry Experts / Financial / Interviewer / Video / App / Web …
├─ View more ──────► Marketplace filtered
├─ Local Work ─────► if no supply: Coming Soon (Figma)
│                    if supply: Marketplace local + Book on-site visit
└─ CalX Agent CTA ─► Agent
```

**Edges:** Coming Soon tile still clickable → do not open paid visit modal · stale expert counts.

---

## 2.3 Company | Marketplace  (+ Marketplace — Calxmap)

```
Marketplace
├─ Create requirement ─► CreateRequirement-Expert (default) / type switch
├─ Filters: Domain, Location, Engagement, Experience, Rate, Rating
├─ Sort: Recommended
├─ Expert card Book / View ──► Book session modal / Profile
├─ Explore all {n} ──────────► same page, domain locked
└─ Tabs counts: Experts, Students, Freelancers, Influencers, Trainers, Programs
      Students tab ──► student talent browse (build)
      Programs tab ──► EDP list → Request a proposal
      Freelancers ──► freelancer profiles (build) or intern/freelance reqs
```

**Edges:** filter combo zero results · rate filter vs “Fixed monthly retainer” mix · book while expert at capacity · Create requirement without billing method · Influencers/Trainers empty in v1 → empty state, tab mat hide silently.

---

## 2.4 CreateRequirement-Expert

```
Create Expert Requirement
├─ Fields: title, min/max budget, dates, duration, experience, dept,
│          skills, description, requirement type
├─ Tab: Internship | Freelance ──► other create screens
├─ CalX Agent ──────────────────► Agent (prefill this form)
├─ Next ──► Review (build) ──► Success (build) ──► Requirement View
└─ Need Help ──► Agent / support
```

**Edges:** min > max budget · end < start · Next with empty required · duplicate title · Agent overwrite of edits · training subtype (guest lecture/FDP) — extra fields: compensation unit session/day/package (live product) **is form par handle karo** warna campus-style posts tootengi.

---

## 2.5 CreateRequirement-Freelance

```
Freelance form
├─ Title, description, start, skills, PDF/DOCX, budget
├─ Next ──► Review (build) ──► Requirement View (freelancer card)
└─ Switch to Internship / Expert
```

**Edges:** Figma helper text galat (“for experts” / “internship”) — **copy fix** · file virus/size · budget 0 · deadline past.

---

## 2.6 CreateRequirement-Internship

```
Internship form
├─ Title, type, openings, dates, employment type, stipend, PPO,
│  contact, benefits chips, description, skills
├─ Next ──► Review (build) ──► Requirement View (intern card)
└─ Switch type
```

**Edges:** openings 0 · stipend 0 + PPO yes · end < start · contact invalid · benefits none.

---

## 2.7 Requirement View

```
Requirement View
├─ About / Scope / Skills / Engagement details
├─ Top Candidates ──► candidate preview
├─ View Applicants ─► Applicants pipeline (build) ★ Figma dead button
├─ Closed badge ────► read-only, hide Apply/Edit
├─ Edit (if open) ──► create form prefilled (build)
└─ Intern / Freelance detail cards (side): PPO, benefits, PDF
```

**Applicants pipeline (build) — yahi se complete product banta hai**

```
Applicants
├─ Tabs: Applied | Shortlisted | Interview | Offered | Rejected
├─ Row: profile, match, rate intent (agreed | negotiate)
├─ Shortlist / Interview / Reject / Message
├─ If negotiate: Rate panel ──► lock
└─ Accept ──► Offer letter (training) OR Booking requested (hourly)
      ▼
   Booking / engagement on Dashboard
```

**Edges:** View Applicants on Closed req · 0 applicants empty · expert withdrew · two admins shortlist same person · offer expire 3 days (live) · intern vs expert pipeline mixed on one req (don’t).

---

## 2.8 Modal / Book a session

```
Book a session
├─ Duration 1h/2h/3h/4h or HH:MM
├─ Date/time IST
├─ Optional counter rate
├─ Agenda *
├─ Totals: hours × rate, 5% fee, GST 18%, Total
├─ Request booking ──► Pending (build) ──► Expert accept/decline
│                         ├─ Accepted ──► Upcoming session (build)
│                         ├─ Declined ──► reason, hold released
│                         └─ Expired ──► hold dropped
└─ Cancel (free until 12h before) — after book
```

**Edges:** slot taken (race) · counter below floor · Instant Book off → request not instant · card vs wallet (ek hi tender) · GST on counter · expert over weekly cap · cancel at 12h boundary · no-show (build) · custom duration 0.

---

## 2.9 Modal / Request a proposal (EDP)

```
Request proposal
├─ Team, headcount, start, budget optional, outcome *
├─ Send request ──► “nothing charged”
│                    ▼
│              Quote received (build)
│                    ├─ Approve ──► Programs dashboard (cohort)
│                    ├─ Counter / reject
│                    └─ Expire
└─ Call to confirm dates (copy)
```

**Edges:** headcount “Other” empty · budget 0 · quote 3× budget · seats unused after start · batch below minimum → auto refund (Training rule).

---

## 2.10 Modal / Book an on-site visit

```
On-site visit
├─ Address (registered / another)
├─ Date window
├─ Fee + 5% + GST, due now
├─ Confirm visit
└─ Cancel free until 1h before
```

**Edges:** “Another address” with no fields (Figma) — **address form build** · no expert in range → do not open this modal · 1h cancel · visit no-show.

---

## 2.11 Company | Dashboard | Overview

```
Overview
├─ KPIs: views, applications, experts engaged, open reqs
├─ Chart applications/day
├─ Post a requirement ──► CreateRequirement
├─ Schedule ────────────► Schedule dialog
└─ Tabs → Requirements | Programs | Interns | Freelancers
          | Marketing | Legal | Notifications | Calendar
```

**Edges:** new company all zeros (empty KPIs, not dummy 282,000) · figures “update every hour” stale.

---

## 2.12 Company | Dashboard | Notification

```
Notifications
├─ All | Unread | Needs action
├─ Mark all as read
├─ Row CTA: Open | Review and pay | Approve | View applicants | Send reminders
└─ Deep link to the object
```

**Edges:** mark all hides unpaid timesheet (Needs action should stay) · object deleted · acting-as notifications mix.

---

## 2.13 Company | Dashboard | Requirements

```
Requirements
├─ All | Open | Closed
├─ + Post ──► CreateRequirement
├─ Row: Interviewing / Open / Closed
├─ Edit ──► form
└─ View applicants ──► pipeline (build)
```

**Edges:** 48 to review badge vs actual · closed still editable · hours awaiting approval on this tab vs Freelancers tab (same hours? one source).

---

## 2.14 Company | Dashboard | Programs

```
Programs
├─ + Enrol ──► catalog / Request proposal
├─ Cohort row: progress, 2 behind, next session
├─ View report (build)
└─ Manage cohort (build): seats, reminders, attendance
```

**Edges:** 2 behind + session today · 12/15 seats · program ended still “manage”.

---

## 2.15 Company | Dashboard | Interns

```
Interns
├─ Waiting on you: Approve | Send feedback | Request changes
├─ + Post internship
├─ Stipend run due (build confirm)
└─ Intern requirements list
```

**Edges:** approve without attendance · stipend to student without KYC/wallet · campus also must approve (Flow H) — **both gates** · student withdrew.

---

## 2.16 Company | Dashboard | Freelancers

```
Freelancers
├─ Deliverable: Approve | Request changes
├─ + Hire a freelancer
└─ Engagements table: rate, budget used 75%
```

**Edges:** approve at 100%+ budget · 22h pending vs 164h approved · request changes loop forever — cap rounds.

---

## 2.17 Company | Dashboard | Calendar  (month + agenda)

```
Calendar
├─ Month | Agenda toggle
├─ Event click ──► event detail (build)
├─ Unconfirmed invites
└─ Schedule ──► Dialog
```

**Dialog: Schedule something**

```
Type, date, start, who's involved → Cancel | Schedule
```

**Edges:** expert conflict · invitee no account · DST · timesheet deadline vs interview vs cohort on same slot.

---

## 2.18 Marketing | Legal tabs (Figma pages nahi — build)

```
Marketing ──► promotion / influencer requirements queue (empty OK)
Legal ──────► legal-service reqs + contracts queue (empty OK)
```

**Edges:** empty tab ≠ hide · do not leave dead labels.

---

## 2.19 Company | Profile

```
Profile
├─ Edit
├─ + Add Skills
├─ Finish Verification • 2 left ──► KYC wizard (build)
└─ View Details on scores
```

**Edges:** unverified still posting? (recommend: post allowed, Book paid requires Payment Verified) · fake 872/1000 — show Unverified until sourced.

---

## 2.20 Company Wallet (4 frames = 4 tabs)

```
Company Wallet
├─ Overview: Available | Escrow | Reserved | Auto-recharge | Add funds | Withdraw
├─ Spend: Category | Department
├─ Budget & Controls: cap, ₹50k approval, members
├─ Payment methods
├─ Download statement
└─ Billing settings
```

**Add funds / Withdraw (build)**

```
Add funds ──► PSP ──► posted | failed
Withdraw ───► KYC check ──► processing | failed
```

**Edges:** auto-recharge fail while hold open · two members spend last rupee · spend > ₹50k without finance user · escrow release event galat (session vs hours vs stipend vs probation) — **har line item pe event dikhao** · GST credit with no invoices.

---

# 3. EXPERT

## 3.1 Expert - Home

```
Expert Home
├─ Search ──► Marketplace (projects)
├─ Manage Services ──► Expert | Manage Services
├─ CalX Agent
├─ POD request: Accept POD | View Request
│     Accept ──► Upcoming POD (build) / Instant if Instant Book on
├─ Recommended: Apply Now | View Details ──► Marketplace / job detail (build)
└─ Industry news
```

**Edges:** Accept POD over capacity · request already expired · **Internships in recommended — hide for Expert** · restricted onboarding + Accept.

---

## 3.2 Expert - Services

```
Services
├─ Category: Hourly / Freelance / Training / Health / Entrepreneurship
├─ Manage Services (2 of 5)
└─ Enroll on a course (expert as learner) ──► program (build) / skip if not v1
```

**Edges:** “2 of 5” vs actually 0 live · enroll spends wallet.

---

## 3.3 Expert | Marketplace

```
Marketplace (demand for expert)
├─ Filters: Domain, Location, Engagement, Rate, Duration
├─ Apply Now ──► Apply modal (build): agree posted | negotiate if shortlisted
└─ View Details ──► job detail (build)
```

**Edges:** apply twice · req closed while submitting · student internship leaked here — filter out.

---

## 3.4 Expert | Manage Services

```
My Services
├─ Review requests → ──► Request inbox (build) ★
├─ Cards: Hourly | 1:1 | Interviewer | Training | Referral
│     each ──► Dialog (Figma) Save / Cancel
└─ 2 of 5 live cap
```

**Request inbox (build)**

```
Inbox
├─ POD / Hourly / Interview / Training / Referral
├─ Accept | Decline | Counter
└─ SLA 24h → Response Rate warning
```

**Dialog edges (sab dialogs):**

- Hourly: turn off “accepting” but active engagements continue (Figma copy) — honour it  
- 1:1: Instant Book on + calendar hole  
- Interviewer: NDA refuse · feedback past 24/48/72h  
- Training: batch below min → cancel+refund  
- Referral: no company verified email · probation clawback (define)  
- Save with ₹0 rate · 6th service

---

## 3.5 Expert - Dashboard  +  Frame 2285 (engagements)

```
Dashboard
├─ Overview KPIs: views, earned, escrow, applications
├─ Tabs: Projects | Services | Notifications | Calendar
└─ Engagements table
      All | Active | Closed
      On track | Timesheet due | Nearing cap
      Message | Open workspace | Log hours | Submit
```

**Delivery (live, is screen ke peeche)**

```
Selected ──► Offer letter (build overlay)
   ├─ Accept ──► confirmed
   │     └─ Schedule lock ──► in_progress
   │           └─ Attendance entry/exit ──► institution approve/dispute
   │                 └─ Request completion ──► they approve ──► paid
   └─ Decline / 3-day auto-decline
```

**Edges:** timesheet due + cap 20h · complete with <80% hours (ack) · institution marks complete without expert · cancellation_requested · Message with no chat (build thread or email).

---

## 3.6 Expert - Profile

```
Profile
├─ Edit About / Skills
├─ Retake Assessment
├─ View Details (cognitive / background)
└─ Add Skills
```

**Edges:** public vs private fields · KYC pending · IQ decorative → Unverified until real source.

---

## 3.7 Expert - Wallet

```
Wallet
├─ Available, Withdraw, Add Money
├─ Filters: All | Earnings | Spends | This Month
└─ Load more
```

**Edges:** dummy rows mat dikhana · payout while KYC pending · same txn as student template — **role-true data** · escrow vs available confusion (copy).

---

# 4. STUDENT

## 4.1 Students - Home

```
Home
├─ Search internships/jobs/projects
├─ Continue Learning Resume ──► course player / Workspace (build)
├─ Opportunities Apply Now | View Details
├─ Get Mental Support ──► Services wellness / Agent
├─ Top students / you on leaderboard
└─ CalX AI
```

**Edges:** 0 courses empty · Apply without resume (onboarding skip) · “You” rank missing.

---

## 4.2 Students - Services

```
Services
├─ Jobs | FDPs | Wellness | Career | Skill | Placement | Entrepreneurship
├─ Recommended internships Apply / View
└─ Go to Community
```

**Edges:** student rates not applied at Apply · remote vs on-site mismatch.

---

## 4.3 Students - Marketplace

```
Marketplace (learning)
├─ Enroll Now ──► pay wallet / PSP (build) ──► Continue Learning
├─ Category grid
└─ Mentor carousel
```

**Edges:** enroll fail payment · already enrolled · expert switch mid-course (Ideation copy — if not in 1.5, mat dikhao).

---

## 4.4 Students - Dashboard

```
Dashboard
├─ Tabs: Overview | Internships | Freelance | PODs
├─ Current Task Open Workspace ──► Workspace (build) ★
├─ Applications: Applied | Working | Accepted
│     (+ Rejected | Withdrawn — build)
└─ Wallet balance widget ──► Wallet
```

**Workspace v1 (build)**

```
Workspace
├─ Task list, due, submit
└─ Back to Dashboard
```

**Edges:** campus Decline after Working · Open Workspace on Applied (too early — disable) · POD tab vs profile “850 PODS” naming clash — UI: “Micro-gigs completed” vs product “POD”.

---

## 4.5 Students - Profile

```
Profile
├─ Follow / Add Section
├─ Resume, college, rank, assessment Retake
├─ View Leaderboard
└─ View Portfolio
```

**Edges:** Add Section modal (Ideation has it — build: about, projects, links) · resume missing Apply block.

---

## 4.6 Students - Wallet

Same tree as Expert Wallet; txns intern stipend / enroll / session spend.

**Edges:** withdraw as minor / no PAN · company stipend vs freelance payout mix.

---

# 5. INSTITUTION (campus)

## 5.1 Institution - Home

```
Home
├─ Create Requirement ──► CreateRequirement-Expert (faculty/training)
├─ University Workspace ──► Dashboard
├─ Search internships/experts/placement
├─ Faculty program Resume
├─ Book faculty expert
└─ Our Top Students ──► student profile
```

**Edges:** Create Requirement as campus ≠ Company internship post (default Expert/training) · no students yet empty.

---

## 5.2 Institution - Services / Marketplace

Same pattern as Company, **campus catalog**: Academic Experts, FDPs, Wellness, Placement, Skill, Legal, Local, CSR, Entrepreneurship, Promo.

**Edges:** “Recommended Internships” on campus Services (Figma) — yeh **student** content hai; campus par “Recommended faculty / programs” dikhao ya internships ko “for your students” label do.

---

## 5.3 Institution - Dashboard (merge Figma ke 2 frames)

```
Dashboard  (ek hi)
├─ Overview strip: Active interns, Expert lectures, Student earnings
├─ Pending Approvals: Approve | Decline ──► student application
├─ Current Faculty: Live Now | Hire New Experts
├─ Calx Programs Browse Catalog
└─ Tabs: Applications | Placement | Legal | Calendar | Requirements
      Requirements ──► faculty posts (not company intern posts)
```

**Edges:** Figma frame 2 “Welcome back Rahul” — **mat use karo** · Approve without company also accepting · Decline reason required · Live Now with no join link (build).

---

## 5.4 Institution - Profile

NAAC / UGC / placement widgets.

**Edges:** expired accreditation · Edit CIN as campus · Company-like “company size” field — hide if campus.

---

## 5.5 Institution Wallet

Company Wallet jaisa, **shared billing for members** (faculty book, program seats).

**Edges:** student personal wallet ≠ campus wallet · who pays session: campus or student.

---

# 6. CALX AGENT (shared)

```
Calx Agent-1  Empty greeting, Chat | Voice, History
Calx Agent-2  Composer “Start typing…”
Calx Agent-3  History item “Create requirement… 6 hours ago”
```

```
Agent
├─ Chat send ──► reply
│     If WRITE (create req, apply, pay): Confirm card (build) → then execute
├─ Voice ──► same thread (STT into composer minimum)
├─ History click ──► reopen thread
└─ Nav: Home / Services / Marketplace / Dashboard / Profile / Community
         (Expert variant: Wallet instead of Marketplace — don’t drop Marketplace)
```

**Edges:** send empty · tool fail · acting-as leak · “pay Priya” without confirm · Voice tab dummy — minimum: mic → text · two Agent-1 frames (company vs expert nav) = **one component, nav from role**.

---

# 7. COMMUNITY (shared)

```
Community (feed)
├─ Trending | Newest | No Replies
├─ Circle select (Gig Economy, Student Zone, …)
├─ Start New Thread ──► Compose (build) ──► Thread
├─ Post click ──► Community-1 (thread)
│     ├─ Reply editor Post
│     ├─ Sort Top Voted
│     ├─ Upvote / Reply / Share / Report (build outcome)
│     └─ Trending sidebar
└─ Search topics
```

**Edges:** empty circle · compose empty · Report no UI — **build: submitted / reviewed** · spam · off-platform poach · logged-out hit Community → Sign In · Guidelines not optional.

---

# 8. Shared small screens

## Expert public profile (Figma Expert-Profile / cards)

```
View Profile (from Book / Marketplace)
├─ Book a session
├─ Request proposal (if trainer)
└─ Back
```

**Edges:** unlisted expert · rate hidden until login.

## Spend table (Figma Table)

Company/Expert spend rows: Resume / Rate session / View report — **Wire to real objects**.

**Edges:** “Module 4 overdue” with no course player.

---

# 9. Delivery checklist (complete product)

Jab yeh tree dimag mein ho, development complete tab maan na jab:

1. Auth se lekar Home tak **4 roles** + skip + restrict.  
2. Company: **Book session poora lifecycle** + **Applicants pipeline** + Dashboard queues.  
3. Expert: **Inbox + 5 dialogs** + Dashboard delivery (offer, attendance, complete).  
4. Student: **Apply states + Workspace v1** + campus Approve/Decline.  
5. Institution: **ek Dashboard** + faculty requirement + shared wallet rule.  
6. Wallet: add/withdraw/fail/escrow **kisi role par dummy nahi**.  
7. Agent: write = confirm. Community: compose + report.  
8. Har list: loading / empty / error. Marketing/Legal: empty queue, dead tab nahi.  
9. Local work: supply nahi to Coming Soon, paid modal nahi.  
10. Super-admin acting-as 1.5 chrome par kaam kare.

Is order se banao (same tree, build sequence):

```
Auth + chrome
  → Company Home/Marketplace/Book+Applicants/Dashboard
    → Expert Home/Manage/Inbox/Dashboard delivery
      → Student + Institution
        → Wallet PSP
          → Programs/PODs/5 services/on-site
            → Agent + Community + Marketing/Legal empty
```

Nav par Agent/Community **Coming Soon** rakh sakte ho jab tak phase na aaye — label jhootha mat banana.
