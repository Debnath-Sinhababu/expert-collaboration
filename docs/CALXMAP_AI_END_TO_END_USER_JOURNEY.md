# Calxmap — End-to-End User Journey (AI-First Flow)

**Status:** Proposal for review
**Owner:** Product + Engineering
**Written:** 31 Aug 2026
**Companion doc:** `AI_AGENT_FLOW_SIMPLIFICATION_ROADMAP.md` (the *why* and the phasing — read that first)

This document walks one real engagement from start to finish, through the eyes of the three people
involved. Every step names what the user sees, what the system does behind the scenes, and what
happens when things go wrong.

**How to read this:** Sections 1–9 are the happy path told as a story (short 2-day engagement). Section 12
is the complete edge-case catalogue — that is the section engineering should build from. Section 13
contains recommended improvements to the AI profile-creation idea. **Section 14.12 is the full
availability demo** — including a 2-month training program where the institution only knows a date
range, not a fixed schedule.

---

## 1. The cast and the scenario

| | |
|---|---|
| **Meera Joshi** | Expert. Gen AI trainer, 8 years experience, lives in Mumbai. Brand new to Calxmap. |
| **Prof. Kulkarni** | Institution side. Sinhgad Institute, Pune. Needs training for 120 final-year students. |
| **Calxmap Agent** | Our AI agent. Does intake, matching, outreach, profile building, verification and call monitoring. |
| **Ops / Super admin** | Handles exceptions only. Not a step in the normal flow. |

**The engagement:** Gen AI training, 2 sessions × 8 hours, offline at Pune campus, 8–12 Sept.
Institution pays ₹20,000. Expert earns ₹14,000 (70% net share). Platform keeps ₹6,000.

---

## 2. Two different AI interviews — do not confuse them

This is the most important distinction in this document. There are **two separate AI conversations**
with an expert, at two different moments, with two different purposes:

| | **Profile-gap interview** | **Skill verification interview** |
|---|---|---|
| When | Right after resume upload | After profile is complete |
| Length | 2–3 minutes | 12–15 minutes |
| Purpose | Collect facts the resume didn't contain | Judge whether they can actually teach this |
| Channel | **Chat** (WhatsApp or in-app) — recommended | **Voice** |
| Output | Filled profile fields | Score, scorecard, transcript, `verified` flag |
| Can they fail it? | No — it is data entry | Yes — score below threshold |
| Cost | ~₹1 | ~₹200 |
| Repeatable | Any time they edit their profile | Once per skill family, with expiry |

They must stay separate in the product and in the data model. Mixing them creates a 15-minute wall
in front of a new expert who has not even finished signing up.

---

## 3. Part A — Meera creates her profile (Day −10)

### A1. Resume upload → AI-built draft

Meera signs up with email and phone. Instead of a long form, she sees one thing:

> **अपना resume upload कीजिए — बाक़ी हम भर देंगे.**
> PDF, DOC या photo. 30 सेकंड लगेंगे.
> *Resume नहीं है? [कुछ सवालों के जवाब देकर बनाइए]*

She uploads a 2-page PDF. The agent parses it and extracts:

- Name, phone, email, city, LinkedIn URL
- 8 years experience, current and past employers
- Education and certifications
- Skills as written in the resume: "GenAI", "LLMs", "Prompt engineering", "Python", "Data Science"

The agent then **maps her resume skills onto our controlled taxonomy**, because free text cannot be
matched:

| Resume says | Taxonomy match | Confidence |
|---|---|---|
| GenAI | Generative AI | High |
| Prompt engineering | Prompt Engineering & LLMs | High |
| LLMs | Prompt Engineering & LLMs | High |
| Python | Python | High |
| Data Science | Data Science & Analytics | Medium — needs confirmation |

### A2. The review screen (never skip this)

**The parsed profile is never saved silently.** Meera sees a pre-filled review screen with every
field marked as AI-filled, and she confirms or corrects it:

> हमने आपका resume पढ़कर ये भरा है. एक नज़र डाल लीजिए —
> ✓ Name, phone, email, city — **confirm कीजिए**
> ✓ 8 years experience · 4 employers
> ✓ Skills: Generative AI, Prompt Engineering & LLMs, Python
> ⚠️ "Data Science" — क्या आप इसे भी पढ़ाती हैं? [हाँ] [नहीं]

Resume parsing in practice gets 60–80% of fields right. The review screen is what makes an
unreliable input safe, and it costs almost nothing to build. **This is not optional.**

### A3. The 2–3 minute profile-gap interview

Three things are **never** in a resume, and all three are the fields matching depends on most:

1. **Rate card** — what she charges per session / per day, and her minimum
2. **Availability** — which dates or weekdays she is free
3. **Delivery preferences** — offline / online / hybrid, cities she will travel to, languages she
   teaches in

So this step is **not conditional on something being missing** — it always runs, because these facts
cannot come from any resume. The agent asks in chat:

> **Agent:** एक session (लगभग 6–8 घंटे) के लिए आप कितना charge करती हैं?
> **Meera:** 6000
> **Agent:** ठीक. इससे कम पर काम करेंगी? आपका minimum?
> **Meera:** 5000 se kam nahi
> **Agent:** समझ गया. सितंबर में कब available हैं?
> **Meera:** Tuesday Wednesday free rehta hai
> **Agent:** Offline sessions के लिए Mumbai के बाहर travel करेंगी?
> **Meera:** Pune tak thik hai
> **Agent:** हो गया. Profile तैयार है.
>
> *आपके resume में TCS में 3 साल लिखा है — वहाँ आप क्या करती थीं?*
> **Meera:** ML models banati thi, aur team ko train karti thi
> **Agent:** धन्यवाद.

That last question looks like small talk. It is a **cheap fraud check** — if someone uploaded another
person's resume, this is where the story falls apart. Answer gets stored against the claim.

Cost of this whole step in chat: under ₹1. Doing it on voice would cost ~₹40 and add friction for
zero benefit — for "what is your rate", voice tells us nothing that text doesn't.

### A4. Skill verification interview (12–15 min, voice)

Profile is now complete, but Meera is marked **unverified**:

> **Verified नहीं** — Verified experts को 3× ज़्यादा opportunities मिलती हैं.
> 15 मिनट का skill interview दीजिए. [शुरू करें]

She starts. The agent opens with mandatory disclosure:

> यह एक automated assistant है, इंसान नहीं. यह call record होगी और आपकी skills
> जाँचने के लिए इस्तेमाल होगी. आप इंसान से interview भी माँग सकती हैं.
> जारी रखने के लिए सहमति दें. **[सहमत हूँ]**

Six questions on her declared skills, scored on **two axes** (see Section 13 for why both matter):

- **Subject depth** — difference between RAG and fine-tuning; how to reduce hallucinations
- **Teaching ability** — explain embeddings to a non-technical audience; how would you handle a
  120-student offline batch where half have no coding background

Plus one anti-cheat probe: *"आपने जो अभी कहा, वही बात एक first-year student को कैसे समझाएँगी?"* A
memorised or AI-generated answer collapses here.

**Result:** Depth 84, Teaching 80, **overall 82/100 — Strong**. Transcript and a summary are stored.
Meera becomes `verified`. Cost: ~₹200, one time.

### Why this matters more than it looks

Today `experts.is_verified` is set to `true` unconditionally at signup
(`backend/server.js:878`), ratings only exist after a booking, and there is no assessment record
anywhere in the schema. So a brand-new expert has **no trustworthy quality signal at all**. This
interview is what fills that gap — and it is the only reason a curated shortlist is believable to an
institution.

### Data model note: claimed vs verified

Keep these as **two separate fields**:

- `claimed_skills` — from the resume and her own selection
- `verified_skills` — only those covered by a passed skill interview, with score and date

**Only `verified_skills` drive matching and ranking.** Claimed skills can be displayed as
"self-declared" but must never influence a shortlist, or the whole verification exercise is
decorative.

---

## 4. Part B — Prof. Kulkarni describes the requirement (Day 0, 10:00)

No form. A conversation:

> **Prof:** हमें final year students के लिए Gen AI training चाहिए, 2 sessions, हर एक 8 घंटे,
> campus पर offline, सितंबर के दूसरे हफ़्ते में. Budget ₹10,000 per session.
>
> **Agent:** समझ गया. Confirm कीजिए —
> Gen AI training · 2 sessions · 8 hrs each (16 hrs total) · Offline, Pune campus
> 8–12 Sept · आप देंगे ₹20,000 total · Expert को मिलेगा ₹14,000
> कितने students रहेंगे?
>
> **Prof:** करीब 120.
>
> **Agent:** हो गया. आपको **48 घंटे में shortlist** मिल जाएगी. तब तक आपको कुछ नहीं करना.

Engagement state: `sourcing`. Prof. Kulkarni's work is now finished for 48 hours.

The agent asks at most 3–4 clarifying questions. If more are needed, the requirement is too vague and
it routes to ops rather than interrogating the customer.

---

## 5. Part C — Agent matches and reaches out (Day 0, 10:05 onward)

The agent matches on the taxonomy and ranks candidates on:

`verified skill overlap · rate fit · availability fit · location fit · skill interview score ·
rating · past reliability (attendance, cancellations, no-shows)`

11 experts match; Meera ranks **#2**.

Top 6 get a WhatsApp **utility** template (₹0.115 + GST — marketing templates cost 7.5× more, so
wording must stay transactional):

> Gen AI training · Pune campus · 2 sessions × 8 hrs · 8–12 Sept
> आपको मिलेगा: **₹14,000** (₹7,000/session)
> Interested? **[Yes] [No] [Tell me more]**

Meera taps **Yes** in 20 minutes. Two others say yes, one says no, two stay silent.

**Note what did not happen: no negotiation.** Meera's published minimum is ₹5,000 and the offer is
₹7,000, so the only question is yes or no. Experts whose minimum was ₹8,000 never saw this
opportunity at all.

Silent experts get one reminder at 24 hours, then become `no_response`, and **the agent automatically
invites ranks #7 and #8**. This top-up logic is what makes the 48-hour promise keepable.

---

## 6. Part D — Shortlist ready (Day 1, 16:00 — 30 hours in)

Prof. Kulkarni gets WhatsApp + email. Four cards. Meera's:

> **Meera J.** · Mumbai (Pune travel ok) · **Verified** ⭐ 4.7 (12 engagements)
>
> **Matched skills:** Generative AI · Prompt Engineering & LLMs · Python
> **Experience:** 8 years · 40+ sessions delivered
> **Skill interview:** 82/100 — *Strong* · [summary देखें]
> **Availability:** 9 & 10 Sept — confirmed
> **Fee: ₹14,000** (fixed)
> **Track record:** 100% attendance · 0 cancellations
>
> *क्यों match हुआ: तीनों required skills exact match, 120-student batch का पहले अनुभव,
> requested dates पर available.*
>
> [Select] · [पहले interview करें]

**Identity is masked until booking is confirmed.** See Section 11 for the full rule set and the three
things that silently break the mask.

Price is fixed on every card — there is no negotiate button anywhere.

---

## 7. Part E — Institution interviews Meera (Day 3, 16:00)

Prof. Kulkarni taps **"पहले interview करें"**, picks **3 Sept, 4:00 PM** from Meera's published
availability. Both get WhatsApp with the join link, a calendar invite, and a reminder one hour
before.

Both join our platform's video room. Consent gate on entry:

> यह call record होगी. एक automated assistant transcript बनाएगा और यह देखेगा कि personal
> contact details साझा न हों. जारी रखने के लिए सहमति दें. **[सहमत हूँ]**

Consent is logged for both parties — required under the DPDP Act, 2023.

At minute 22:

> **Prof:** अच्छा Meera, आगे भी ऐसे programs चाहिए होंगे — आप अपना number दे दीजिए, मैं सीधे —
>
> *(~2 seconds later, mic auto-mutes; banner on both screens)*
>
> ⚠️ Contact details साझा करना allowed नहीं है. Mic 10 सेकंड के लिए बंद है.

**Why this is real prevention, not just logging:** a 10-digit number takes 5–8 seconds to speak
aloud. Detection fires in ~2 seconds. Two digits leak; the complete payload does not. Nobody can dial
a two-digit number.

Incident logged with timestamp and transcript excerpt. Enforcement follows the graduated ladder in
Section 12E.

Cost of this call: video ₹0 (inside the 10,000 free participant-minutes/month), recording ₹36,
real-time monitoring ~₹50. **Total ~₹86.**

---

## 8. Part F — Selection and paperwork (Day 3, 18:00)

Prof. Kulkarni taps **Select**. From here it is the flow we already built, and it stays:

1. Booking created. Engagement → `onboarding`.
2. Offer letter generated automatically — reference number, ₹14,000, dates, the master template.
3. **No super-admin gate.** Auto-approved because everything is inside the rules: rate in band,
   expert KYC-verified, no blocking flags. (The contact-sharing incident appears on the ops
   dashboard but does not block.)
4. Meera gets WhatsApp + email → reads the letter in her dashboard → types her name and date →
   accepts.
5. Signed PDF generated; institution and admins receive it as an email attachment.
6. **Identity unmasks now.** Full name, photo, and contact details become visible to the institution,
   because the engagement letter and delivery coordination require it.

Engagement → `active`.

---

## 9. Part G — Delivery and payment (9–10 Sept)

Unchanged from today, and deliberately so — this is compliance and money, not UX complexity:

- Sessions delivered; attendance marked per session
- Attendance drives payment release (50% milestone, 50% completion)
- TDS deducted, invoice raised
- Both sides rate each other → feeds Meera's reliability score for future ranking

Engagement → `completed`.

---

## 10. What the users actually experienced

| | Actions taken | States seen |
|---|---|---|
| **Prof. Kulkarni** | Described need → picked from shortlist → interviewed → selected | 3: "shortlist coming", "shortlist ready", "confirmed" |
| **Meera** | Uploaded resume → 3-min chat → 15-min interview *(one time)* → tapped Yes → attended interview → signed letter | 1: her own WhatsApp thread |
| **Ops** | Nothing | — |

Behind the scenes:

| When | Engagement | Meera's candidate record |
|---|---|---|
| Day 0, 10:00 | `sourcing` | — |
| Day 0, 10:05 | `sourcing` | `matched` → `invited` |
| Day 0, 10:25 | `sourcing` | `interested` |
| Day 1, 16:00 | `shortlist_ready` | `presented` |
| Day 3, 16:00 | `shortlist_ready` | `screened` (institution interview done) |
| Day 3, 18:00 | `selected` → `onboarding` | `selected` |
| 9 Sept | `active` | `selected` |
| 11 Sept | `completed` | `selected` |

**The states did not disappear — they became invisible.** That is the entire mechanism. Today these
same internal stages are rendered as tabs in the institution dashboard, which is what produces the
32-combination render matrix and the endless edge cases.

---

## 11. Identity masking rules

**Visible on the shortlist (before booking):** first name + last initial ("Meera J."), city + travel
radius, years of experience, sessions delivered, verified skills, skill interview score and band,
rating and engagement count, availability, fixed fee, reliability stats, and the "why matched"
explanation.

**Hidden until booking is confirmed:** full name, photo, email, phone, address, LinkedIn and social
handles, PAN.

### Three things that silently break the mask

1. **Resume PDF.** `experts.resume_url` exists. Every resume header carries name, phone, email and
   LinkedIn. One download link on a shortlist card defeats all masking. Gate it behind booking, or
   serve an auto-redacted copy.
2. **Profile and course videos.** `profile_video_url` and `course_video_url` exist. In a self-intro
   video the expert says *"Hi, I'm Meera Joshi"* and sometimes shows her LinkedIn on screen. Gate
   them, or instruct experts to record without full name and contact details.
3. **Raw interview transcript.** In the skill interview Meera names herself and her past employers.
   Show institutions an **identifier-stripped AI summary**, never the raw transcript. Raw transcript
   is for super-admin audit only.

### Masking must apply everywhere, not just the card

The interview room display name must read "Meera J.", and so must every WhatsApp and email
notification sent to the institution. Otherwise the interview invite leaks the full name and the
card-level masking is pointless. The offer letter carries the full legal name — that is correct,
because it is post-booking.

### Honest limit

Masking the surname stops LinkedIn search. It does not stop someone determined — face is visible on
video, and a persistent buyer can still find a person. Masking raises the effort; **Clause 6
(non-circumvention) of the engagement letter is the actual backstop**, and the monitoring transcript
is the evidence that makes it enforceable.

---

## 12. Complete edge-case catalogue

This is the build list. "Today" describes current behaviour where it exists.

### 12A. Expert onboarding

| # | Scenario | Today | Fix |
|---|---|---|---|
| A1 | Resume is a scanned image or photo | n/a | OCR path; if confidence low, fall back to the chat interview and collect fields conversationally |
| A2 | Resume in Marathi/Hindi or unusual format | n/a | Multilingual parse; on failure, chat interview instead of an error |
| A3 | Parsing gets fields wrong (years, employer, skills) | n/a | Mandatory review screen — nothing saves without expert confirmation. Never silent-save AI output |
| A4 | Resume skill not in taxonomy | Free text accepted, unmatched forever | Suggest closest taxonomy match; allow "other" but queue it for admin review so the taxonomy grows from real demand |
| A5 | No resume at all | n/a | Slightly longer chat interview (6–8 questions) builds the profile from scratch |
| A6 | Someone uploads another person's resume | n/a | Three cheap checks: consistency probe in the gap interview, face match against profile photo at skill interview, and the skill interview itself |
| A7 | Expert abandons signup midway | Profile sits incomplete forever | Save partial progress; WhatsApp nudge at 24h and 72h, then stop. Never contact after that without consent |
| A8 | Expert fails the skill interview | n/a | Do **not** ban. Show which axis was weak, allow one retake after 7 days. Third failure → human review, not silent rejection |
| A9 | Bad network or audio during interview | n/a | Auto-detect low quality, offer text fallback or reschedule. **Never auto-fail for a technical reason** |
| A10 | Expert disputes their score | n/a | Human review appeal path with the transcript. Needed for fairness and for accent/stage-fright cases |
| A11 | Expert adds a new skill six months later | n/a | Verify **only that skill family** — no blanket re-interview |
| A12 | Verified status goes stale | n/a | Expire verification after 18 months; prompt a short re-verification |
| A13 | Duplicate profile (same phone/email) | Partially handled | Detect at signup and offer to merge, not create |
| A14 | Expert has no WhatsApp | n/a | Fall back to email + SMS; mark as lower-reachability in ranking (reachability is a real delivery risk) |
| A15 | Expert never gave outreach consent | No consent field exists at all | Add explicit opt-in at signup. No opt-in → transactional email only, no WhatsApp outreach |

### 12B. Requirement intake

| # | Scenario | Today | Fix |
|---|---|---|---|
| B1 | Institution is vague ("we need AI training") | Vague requirement gets posted | Agent asks max 3–4 clarifying questions; beyond that, route to ops rather than interrogate the customer |
| B2 | Budget far below market | Requirement sits with no applicants, silently | Agent says so immediately: "इस skill के लिए experts आम तौर पर ₹X–Y लेते हैं. आपका budget ₹Z है." Then offers three options |
| B3 | Start date is tomorrow | Requirement posted, nobody applies in time | Agent flags upfront that the 48-hour shortlist plus interview plus signing needs ~5 days, and offers the earliest realistic date |
| B4 | Institution edits requirement after sourcing started | Silent edit; experts already invited on old terms | Minor edit (student count) → continue. **Material edit (budget, dates, skill) → restart sourcing and notify already-invited experts of the change** |
| B5 | Duplicate requirement posted twice | Two parallel funnels compete for the same experts | Detect near-duplicates and ask whether to merge |
| B6 | Institution wants 3 trainers for one program | Unclear today | Treat as one engagement with headcount 3; shortlist sized accordingly; one offer letter per expert |

### 12C. Matching and outreach

| # | Scenario | Today | Fix |
|---|---|---|---|
| C1 | **Zero matching experts** | Requirement stays open, nobody tells the institution anything | Within 2 hours, an honest message with three concrete options: shift dates, raise budget to ₹X, or switch to online. Silence is the worst outcome |
| C2 | Only 1–2 matches | n/a | Present a shorter shortlist and say so. **Never pad a shortlist with bad matches** — one bad card destroys trust in all of them |
| C3 | Expert says Yes then goes silent | Application stuck in `interview` forever | Auto-replace with next rank; reliability score impact |
| C4 | Everyone invited declines | Requirement rots | Escalate to ops exception dashboard with the decline reasons, plus B2-style options to the institution |
| C5 | Same expert matches two overlapping engagements | No availability locking at all | Soft-hold availability when presented on a shortlist; first booking wins, the other engagement auto-replaces and is told why |
| C6 | Expert changes their rate card mid-flow | n/a | Snapshot the rate at invite time and honour it for that engagement |
| C7 | Expert's availability changes after being shortlisted | n/a | Auto-remove from that shortlist, notify the institution, backfill next rank |
| C8 | Expert is invited to too many opportunities | n/a | Rate-limit outreach per expert per week. Spamming good supply is how you lose it |

### 12D. Shortlist

| # | Scenario | Today | Fix |
|---|---|---|---|
| D1 | Institution ignores the shortlist | Experts wait indefinitely | Reminders at 24h and 72h; experts told "still under review"; auto-expire at 7 days and release availability holds |
| D2 | Institution rejects all candidates | Would require reposting | "New shortlist" button with a required reason; agent re-sources against the same engagement |
| D3 | Institution demands to see all applicants | n/a | Politely no — that is the model. Show *how many* were screened ("11 matched, 6 contacted, 4 screened") to prove depth without exposing the funnel |
| D4 | Institution wants to select two experts from one shortlist | n/a | Allowed if headcount > 1; otherwise ask them to raise headcount first |

### 12E. The interview call

| # | Scenario | Today | Fix |
|---|---|---|---|
| E1 | One side doesn't join | n/a | 10-minute grace, then auto-cancel with a reschedule link; reliability impact on whoever missed it |
| E2 | Contact-sharing attempt | n/a | **Graduated ladder:** (1) banner warning only; (2) 10-second auto-mute of the speaker; (3) call auto-ends, incident to ops, email to both; (4) repeat pattern → account review for institutions, reliability drop then delisting for experts |
| E3 | False positive ("मेरे पास 120 students हैं", "call me Meera") | n/a | Never penalise on first trigger. Warning only. Log false positives and retune weekly |
| E4 | Contact shared in Hindi/Marathi, or digits spelled out | n/a | Multilingual digit-sequence detection plus intent classification, not regex alone. Tune from real Tier-1 data before going live |
| E5 | Contact shared via screen share or card on camera | n/a | OCR on frames; screen share auto-stops on detection. Camera OCR is best-effort — acknowledge the gap |
| E6 | **Institution asks discriminatory questions** (age, caste, religion, marital status) | n/a | Bot flags and warns. This protects experts, is a genuine differentiator, and reduces our own liability |
| E7 | Expert asks for more money during the call | n/a | Bot reminds both sides the fee is fixed. Institution must never feel pressured to renegotiate |
| E8 | Network fails mid-call | n/a | Fall back to audio-only, keep recording, allow rejoin within 10 minutes |
| E9 | Institution wants to interview 3 shortlisted experts | n/a | Sequential slots; each is its own candidate record |
| E10 | Either party refuses recording consent | n/a | Call cannot proceed on-platform. Offer a rescheduled call with consent, or let them skip the interview and select directly |

### 12F. Selection, offer letter, signing

| # | Scenario | Today | Fix |
|---|---|---|---|
| F1 | **Expert declines the offer** | One decline writes three state machines (onboarding + booking + application), and the rejected application still carries a locked `agreed` rate — this is the source of our re-onboarding bugs | Candidate → `declined`; engagement → back to `shortlist_ready` with the rest of the shortlist intact; institution selects someone else. **No cascade, no re-onboarding path** |
| F2 | Offer expires unanswered (3 days) | Auto-decline exists | Keep it, and automatically offer to the next shortlisted candidate |
| F3 | Expert signs with a different name spelling | Confirmation modal already built | Keep as-is |
| F4 | Institution wants to change dates/rate after selecting | Silent edit possible | Explicit amendment flow: expert must re-accept, new letter version generated. Never silently edit a signed engagement |
| F5 | Institution cancels after selection | Unclear | Defined cancellation policy with compensation tiers by notice period; expert notified immediately |
| F6 | Expert fails KYC after being selected | Blocking admin gate | Flag to ops, engagement held, institution told there is a short delay, backfill offered if unresolved |

### 12G. Delivery and payment

| # | Scenario | Today | Fix |
|---|---|---|---|
| G1 | Expert no-shows on training day | Manual scramble | Immediate ops escalation, replacement search from the original shortlist, penalty per Clause 8 |
| G2 | Session needs rescheduling | Clause 15 requires 48h notice | Enforce in product: reschedule request under 48h needs institution approval |
| G3 | Attendance not marked | Reminder service exists | Keep; block milestone payment until submitted, as the letter already states |
| G4 | Payment or completion dispute | Dispute flow exists | Keep unchanged |
| G5 | Institution contacts the expert directly for the next program | Undetectable today | Post-engagement, direct contact is legitimate for *this* engagement. Clause 6 governs new engagements. Detect via the expert's own reporting and repeat-booking-off-platform patterns |

---

## 13. Recommended improvements to the AI profile-creation idea

These are the changes I would make to the resume-to-profile flow as described.

**1. The gap interview is mandatory, not conditional.** Rate card, availability and travel
willingness are the three fields matching depends on most, and **no resume ever contains them**. So
"run the interview only if something is missing" collapses into "always run it". Design it as an
always-on 3-minute step rather than an exception path.

**2. Use chat for gap-filling, voice only for skill verification.** For "what is your rate?", voice
adds nothing over text but costs ~40× more and is more intimidating for a first-time user. Voice
earns its cost only where we need to *hear someone explain something* — which is exactly the skill
interview. Chat also works on a weak network and can be finished across two sittings.

**3. Score two axes, not one.** For a trainer, the ability to teach matters at least as much as
subject depth. A brilliant engineer who cannot hold a 120-student offline room is a bad booking. Score
**subject depth** and **teaching clarity** separately, and show both. Consider a third for
**delivery language** (English / Hindi / Marathi), which is a real constraint for Indian campuses and
a genuinely useful filter for institutions.

**4. Keep claimed and verified skills in separate fields.** `claimed_skills` from the resume,
`verified_skills` from a passed interview. Only verified skills may influence matching or ranking. If
resume claims can get an expert onto a shortlist, verification becomes decoration.

**5. Never auto-save parsed output.** Resume parsing is 60–80% accurate on a good day. The review
screen is the cheapest reliability fix available, and it also creates a natural consent moment for
the data we extracted.

**6. Verification expires; new skills need their own verification.** An 18-month expiry keeps the
signal meaningful. Adding a new skill later triggers verification for that skill family only, never a
full re-interview — otherwise experts will simply not add skills.

**7. Always allow a human path.** One retake after a failure, an appeal with transcript review, and a
"talk to a human instead" option at the start. Accent, stage fright and poor networks will otherwise
filter out good trainers, and in India that is both a fairness problem and a supply problem.

**8. The resume is a PII payload — treat it as one.** It gives us phone, email and LinkedIn for free
(useful), and it is simultaneously the single biggest hole in identity masking (dangerous). Store it
access-gated from day one, and generate a redacted version for any pre-booking display.

**9. Feed the bulk-import path.** `backend/services/bulkImportService.js` already exists. Resume
parsing should be reusable there so ops can onboard 200 experts from a folder of resumes, each landing
as a draft profile awaiting the expert's own confirmation. That is the fastest way to build the supply
depth the 48-hour promise needs.

**10. Instrument the parser.** Log per-field accuracy — how often the expert corrects each field on
the review screen. That tells you where to improve extraction, and it is free data.

---

## 14. Availability without a calendar

### 14.1 Why the current calendar cannot work

`expert_availability_slots` is a **positive-declaration** calendar: the expert inserts rows saying
"I am free at these times", and absence of a row means nothing in particular. Five structural
problems follow from that, and none of them are fixable by improving the calendar UI:

1. **Empty is ambiguous, and we display it as "busy".**
   `summarizeAvailability()` (`frontend/src/lib/expertAvailabilityUtils.ts:84`) renders
   *"No calendar availability in this period"*. An institution reads that as **"this expert is not
   free"**. In reality it almost always means **"this expert never filled the calendar"**. We are
   silently disqualifying good, available experts — the worst possible failure mode for a supply-
   constrained marketplace.

2. **Bulk weekly expansion has an expiry date.** `/availability/bulk`
   (`backend/routes/expertAvailabilityRoutes.js:187`) materialises concrete rows between
   `from_date` and `to_date`. Once that window passes, the calendar is empty again and nobody
   re-runs it. Every expert's calendar decays to zero on a timer.

3. **Bookings do not block the calendar.** There is no link between `bookings` and
   `expert_availability_slots`. An expert delivering an offline session in Pune on 9 Sept can still
   appear "available" on 9 Sept.

4. **No freshness signal.** There is no `confirmed_at`. Availability entered four months ago and
   availability confirmed this morning look identical to the institution.

5. **Only positive assertions exist.** An expert can add "free" but cannot say "busy on 12 Sept".
   The only way to express unavailability is to never add a slot — which collides with problem 1.

> **Latent bug worth fixing regardless of this redesign:** the bulk route builds slots as
> `` `${y}-${m}-${d}T${start_time}:00.000Z` `` and filters days with `getUTCDay()`
> (`expertAvailabilityRoutes.js:225-230`). An expert entering "9:00–17:00" gets slots stored at
> 09:00 **UTC** = 14:30–22:30 IST. Every existing bulk-created slot is shifted by 5.5 hours, and
> near midnight the weekday itself is wrong.

**The root cause is the model, not the interface.** A calendar asks the expert to *predict and
maintain* their future state with no immediate reward. That effort is paid upfront; the benefit is
distant and uncertain. Humans do not do this — not on Calxmap, not anywhere. Any redesign that still
requires routine calendar maintenance will fail the same way.

### 14.2 The reframe

> **Stop asking experts to declare availability in advance. Ask at the exact moment it matters, about
> the exact dates that matter — and make that question the same question we were already asking.**

Availability is only ever needed for one specific date range: the engagement's dates. And we are
*already* sending the expert a message about those dates. The insight in your suggestion is exactly
right: **the "are you interested?" question and the "are you available?" question are the same
question.** Merging them makes availability free.

### 14.3 Four layers

| Layer | What it is | Who maintains it | Decays? | Used for |
|---|---|---|---|---|
| **L1 Standing pattern** | Coarse preferences, not dates | Expert, once at onboarding | Very slowly | Ranking and filtering only |
| **L2 System-derived blocks** | Confirmed bookings + travel buffer | Nobody — automatic | Never | Hard exclusion |
| **L3 Just-in-time confirmation** | Yes/No on specific dates | Expert, one tap, per opportunity | N/A — always current | **The truth** |
| **L4 Holds & re-confirm** | Soft locks while shortlisted | Automatic | N/A | Preventing double-booking |

Only **L3 is treated as truth.** L1 and L2 decide *whom to ask*; they never decide what an
institution is told.

#### L1 — Standing pattern (set once, in the 3-minute chat)

Collected conversationally during onboarding (Section 3.A3), not as a calendar:

| Field | Example | Why it survives |
|---|---|---|
| Weekday pattern | Tue, Wed, Sat | A teaching-job constraint that holds for months |
| Notice needed | 7 days | A property of the person, not of a date |
| Monthly capacity | max 4 sessions | Stable |
| Blackout periods | exam season, 20 Dec–5 Jan | Recurring, known far ahead |
| Travel radius | Mumbai + Pune | Rarely changes |

Every one of these is a **pattern, not a date**, which is precisely why it does not decay. A calendar
of dates is stale in three weeks; "Tuesdays and Wednesdays, 7 days notice" is still true next year.

#### L2 — Derived blocks (zero expert effort)

Auto-computed, never entered:

- Every confirmed booking blocks its session dates
- Offline sessions block a **travel buffer** — an offline Pune session for a Mumbai-based expert
  should block the evening before and the morning after, otherwise we book physically impossible
  back-to-back engagements
- Scheduled interview slots block that hour

This layer costs the expert nothing and is always correct. It should have existed from day one.

#### L3 — Just-in-time confirmation (the only source of truth)

The outreach message from Section 5, with the dates carried inside it:

> Gen AI training · Pune campus · 2 sessions × 8 hrs
> **9 और 10 सितंबर** · आपको मिलेगा **₹14,000**
>
> **[हाँ, इन dates पर free हूँ] [नहीं] [dates बदल सकते हैं?]**

A **Yes** here is a dated, timestamped, opportunity-specific availability confirmation. No calendar
was maintained; no extra message was sent; the expert did one tap they were doing anyway.

The third button is the one a calendar can never offer. If Meera taps *"dates बदल सकते हैं?"* and
replies **"9 नहीं, 11–12 कर सकती हूँ"**, the agent parses that into structured dates and offers it
back to the institution as an option — *"Meera 11–12 Sept पर available हैं, आपको चलेगा?"* A calendar
would simply have dropped her. **This converts near-misses into bookings**, and near-misses are a
large share of a thin marketplace.

#### L4 — Holds and final re-confirmation

Two mechanisms close the remaining gap between "said yes on Day 0" and "signs on Day 3":

- **Soft hold** on presented dates for 7 days, so the same expert is not simultaneously promised to
  two institutions.
- **Final re-confirmation at selection.** Before the offer letter is generated, one message to the
  single winning candidate: *"Institution ने आपको select किया है — 9 और 10 Sept अभी भी confirm है?"*
  This is one tap to one person, and it closes the highest-cost failure in the whole flow (an expert
  who accepted an offer for dates they can no longer serve).

### 14.4 Answering your two specific proposals

**"Institution से requirement के समय interview date पूछ लें"** — right instinct, but ask for a
**window, not a date**. A single pinned date fails the moment the expert cannot make it, and we are
back to manual back-and-forth. Ask instead:

> Interview कब तक कर सकते हैं? **[2-3 दिन में] [इस हफ़्ते] [अगले हफ़्ते]**
> कौन सा समय ठीक है? **[सुबह] [दोपहर] [शाम]**

That produces slack instead of a constraint.

**Then collect the expert's interview preference speculatively at invite time.** When Meera taps
"Yes", the very next message offers three concrete slots computed from *institution window ∩ Meera's
weekday pattern*:

> Institution interview करना चाह सकती है. कौन सा slot ठीक रहेगा?
> **[3 Sept, 4 PM] [4 Sept, 11 AM] [5 Sept, 5 PM]**

One extra tap, paid at a moment when Meera is already engaged and motivated. The payoff: when
Prof. Kulkarni later taps *"पहले interview करें"*, the call is scheduled **instantly** — no round
trip, no coordination, no waiting. This is the single highest-leverage change in the scheduling flow.

**"Project timeline पर availability"** — yes, and this is the *primary* question, since delivery dates
are the hard constraint while an interview is soft and reschedulable. But **do not ask date-by-date
for long engagements.** For a 12-session program or a 3-month internship mentorship, asking about 12
dates upfront guarantees a wrong answer. Ask for a **commitment pattern**, then confirm on a rolling
basis:

> यह 3 महीने का program है, हफ़्ते में ~4 घंटे.
> कौन सा weekday slot fix कर सकती हैं? **[Tue शाम] [Wed शाम] [Sat सुबह]**

Commit to the *pattern* at booking; confirm the *next two weeks* of actual dates on a rolling basis.
Short engagements get exact-date confirmation; long ones get pattern plus rolling window.

### 14.5 What the AI agent specifically does here

This is where an agent beats any UI, and it is worth being precise about why:

1. **Parses fuzzy human replies into structured dates.** *"agle hafte thik hai"*, *"9 nahi 10
   chalega"*, *"Saturday ko sirf subah"* — a calendar widget cannot accept any of these. An LLM turns
   all of them into confirmed slots. This alone removes most of the friction.
2. **Captures counter-offers instead of dropping the expert** (L3 above).
3. **Only asks when there is a real reason.** Never *"please update your calendar"*. Always *"यह
   opportunity है, इन dates पर free हैं?"* A request tied to money gets answered; a maintenance chore
   does not.
4. **Batches.** Three opportunities in the same week become **one** message about that week, not
   three. Respect for the expert's attention is what keeps response rates high.
5. **Learns the real pattern from behaviour.** If Meera has declined every Friday for four months,
   stop offering Fridays and update L1 — without asking her anything. Her stated pattern and her
   actual pattern will differ, and the actual one is more useful.
6. **Refreshes L1 lazily, at natural moments** — after a completed engagement, or when a blackout
   period ends. Never on a fixed monthly cron.

Cost: one WhatsApp utility message is ₹0.115 + GST. Even ten availability confirmations per expert
per month is under ₹2 — versus a calendar that is free to run and produces wrong answers.

### 14.6 What institutions see

Availability is shown with **provenance and recency**, never as a bare calendar:

> ✅ **9 & 10 Sept — expert ने confirm किया** *(2 दिन पहले)*

And where it is not confirmed, the honest version — not silence, and never "no availability":

> ⏳ Availability confirm हो रही है · आम तौर पर Tue/Wed available · 7 दिन notice चाहिए

The distinction between *"unavailable"* and *"not yet asked"* must be visible in the UI. Collapsing
those two into one empty state is the specific bug we are fixing.

### 14.7 The incentive that actually works

Do not nag experts to maintain a calendar. Show them what vagueness costs:

> इस महीने आपको **3 opportunities** मिली थीं जो आगे नहीं बढ़ सकीं क्योंकि आपकी availability
> confirm नहीं हो पाई. संभावित earning: **₹38,000**.
> अपना weekly pattern update करें → [30 सेकंड]

Money is the only motivator that reliably beats maintenance friction. Pair it with ranking:
fast-responding experts rank higher, because responsiveness is genuine delivery-risk information —
and tell experts that this is how ranking works, so the incentive is legible.

### 14.8 Google / Outlook calendar sync

Offer it, but as an **optional power feature for the ~10% who will use it**, never as the plan.
Read **busy/free only** — never event titles or attendees, which are third-party personal data we
have no basis to hold. Sync gives L2-quality automatic blocking for the experts who opt in; it does
not remove the need for L3 confirmation, because a free calendar slot is not the same as willingness
to take a job.

### 14.9 Schema changes (backward compatible)

Keep `expert_availability_slots` and everything reading it; extend rather than replace:

| Change | Purpose |
|---|---|
| `status` — `available` \| `busy` (default `available`) | Lets an expert assert unavailability. Existing rows keep today's meaning |
| `confirmed_at`, `confirmation_source` | Freshness and provenance for the L3 display |
| `engagement_id` (nullable) | Marks a slot as confirmed *for a specific opportunity* |
| `source` add `agent_confirmed`, `booking_derived`, `calendar_sync` | Distinguishes the four layers |
| New `expert_availability_patterns` | L1 — weekday pattern, notice days, monthly capacity, blackouts |
| New `expert_availability_holds` | L4 — soft locks with expiry |
| Backfill job | Derive `booking_derived` busy slots from existing confirmed bookings |

Nothing existing breaks: current rows read as `status = 'available'`, `source = 'manual'`, with a
null `confirmed_at` that correctly renders as "not recently confirmed".

### 14.10 Measure the right thing

**Do not measure calendar completion or freshness.** Those are proxies, and optimising them recreates
the maintenance problem we are removing. Measure:

| Metric | Target | Why |
|---|---|---|
| **Shortlist availability accuracy** — % of presented experts still available at selection | > 95% | The only number that matters to an institution |
| Availability confirmation response time | < 4 hours median | Drives the 48-hour shortlist promise |
| Engagements lost to unconfirmed availability | → 0 | Today this is invisible and probably large |
| Reschedules caused by availability conflicts | < 5% | Measures whether L2 travel buffers work |
| Double-booking incidents | 0 | L4 holds are working or they are not |

### 14.11 Availability edge cases

| # | Scenario | Today | Fix |
|---|---|---|---|
| H1 | Expert never filled the calendar | Shown as "no availability" — silently disqualified | Show standing pattern + "confirming"; **never** infer unavailable from empty |
| H2 | Expert confirms, then gets booked elsewhere off-platform | Undetectable | Final re-confirmation at selection (L4) catches most of it |
| H3 | Expert confirms for two overlapping engagements | No holds exist | Soft holds; first to reach offer wins, the other is auto-backfilled and told why |
| H4 | Confirmed availability goes stale (Day 0 yes → Day 20 selection) | n/a | Confirmations expire after 14 days and are re-asked automatically |
| H5 | Offline session in another city, back-to-back with another booking | Both appear available | L2 travel buffer blocks the day before and after for out-of-city offline work |
| H6 | Expert available for session 1 but not session 2 | All-or-nothing | Accept partial confirmation; either split delivery across two experts or return it to the institution as a choice |
| H7 | Institution changes dates after confirmation | Silent | Treat as a material edit (B4): re-confirm with everyone already invited |
| H8 | Expert replies in free text the parser misreads | n/a | Agent echoes its interpretation back for confirmation: *"तो 11 और 12 Sept — सही है?"* Never act on an unconfirmed parse |
| H9 | Timezone drift on bulk-created slots | **Live bug** (§14.1) | Store IST-correct timestamps; migrate existing `bulk_weekly` rows |
| H10 | Expert stops responding to availability asks | n/a | After 3 unanswered asks, mark low-reachability and deprioritise. Do not delete the profile |
| H11 | Expert's blackout period (exams, festival, wedding) | Must delete slots one by one | First-class blackout ranges in L1 — one entry, no date-by-date work |
| H12 | Long engagement, availability changes mid-way | n/a | Rolling 2-week confirmation surfaces it early, while replacement is still possible |
| H13 | Expert available but outside notice period (session in 2 days, needs 7) | Not modelled | L1 notice period filters them out of matching before they are ever bothered |

### 14.12 Full availability demo — 2-month training program (date range only, no fixed schedule)

This section walks the **complete availability flow** for a long-running engagement where the
institution knows the **window** but not the exact session dates yet. That is the normal case for
college training programs — the academic calendar shifts, batches clash, labs are not booked until
later.

**Read this if you want one end-to-end story with every WhatsApp message, every layer (L1–L4), and
every scenario.**

---

#### The setup

| | |
|---|---|
| **Prof. Desai** | HOD, MIT-WPU Pune. Needs a Gen AI trainer for final-year CS students. |
| **Rahul Verma** | Expert. 6 years, Mumbai-based, teaches Gen AI + Python. Already on Calxmap, verified. |
| **Priya Nair** | Another matched expert. Pune local. Also verified. |
| **Calxmap Agent** | Same agent as everywhere else in this doc. |

**The engagement:**

| Field | Value |
|---|---|
| Skill | Generative AI + Prompt Engineering |
| Duration | **2 months** — **1 Oct to 30 Nov 2026** |
| Delivery | Offline, Pune campus |
| Expected load | ~**16 sessions**, ~4 hrs each (~64 hrs total) — **exact count TBD** |
| Schedule | **Not fixed.** Institution will decide week-by-week which Saturdays (or weekdays) to run. |
| Students | ~80 |
| Institution pays | ₹1,60,000 total (₹10,000/session × 16 sessions, estimated) |
| Expert earns | ₹1,12,000 net (70%) |
| Interview | Institution wants to interview before selecting |

**Critical constraint:** Prof. Desai cannot tell us *"sessions on 4 Oct, 11 Oct, 18 Oct…"*. He only
knows: *"Program Oct–Nov mein chalega, mostly weekends, exact dates baad mein fix karenge."*

A date-by-date calendar model **cannot work here**. Our model does not ask for one.

---

#### Phase 0 — Rahul's standing pattern (L1, set once at onboarding)

Six weeks ago, during Rahul's 3-minute profile-gap chat, the agent collected **patterns, not dates**:

| L1 field | Rahul's answer | Stored as |
|---|---|---|
| Weekday pattern | "Saturday subah best, Tuesday shaam bhi chalega" | `Sat AM`, `Tue PM` |
| Notice needed | "7 din" | `notice_days: 7` |
| Monthly capacity | "Max 8 sessions" | `monthly_capacity: 8` |
| Travel | "Mumbai se Pune — Friday travel, Sunday wapas" | `travel_cities: [Pune]`, buffer rules |
| Blackout | "Diwali week — 20–27 Oct family trip" | `blackout: 2026-10-20..2026-10-27` |
| Language | English + Hindi | `delivery_languages: [en, hi]` |

**Rahul has never opened a calendar UI.** This is all the system knows about his future time until
an opportunity arrives.

**L2 (automatic):** Rahul already has one confirmed booking — a 2-day Pune workshop on **14–15
Nov**. Those dates are **hard-blocked** in the system, plus travel buffer (**13 Nov evening, 16 Nov
morning**). He does not maintain this; bookings create it.

---

#### Phase 1 — Institution describes the requirement (Day 0)

Prof. Desai talks to the agent. No form.

> **Prof:** Final year CS students ke liye Gen AI training chahiye. Do mahine ka program — **October
> se November end tak**. Exact schedule abhi fix nahi hai, mostly weekends pe hoga shayad. Total
> lagbhag 16 sessions, 4 ghante each. Campus pe offline. Budget ₹1.6 lakh.
>
> **Agent:** Samajh gaya. Confirm kijiye —
> - Gen AI training · **1 Oct – 30 Nov 2026** · Offline, Pune campus
> - ~16 sessions × 4 hrs (exact dates **baad mein decide**)
> - Aap denge ₹1,60,000 · Expert ko milega ~₹1,12,000
> - ~80 students
>
> Interview karna chahenge pehle?
>
> **Prof:** Haan, interview zaroori hai.
>
> **Agent:** Interview kab tak ho sakta hai?
> **[Is hafte] [Agle 3-4 din mein] [Agle hafte]**
>
> **Prof:** Agle hafte theek hai.
>
> **Agent:** Kaunsa time?
> **[Subah 10–12] [Dopahar 2–4] [Shaam 5–7]**
>
> **Prof:** Dopahar 2–4.
>
> **Agent:** Ho gaya. **48 ghante mein shortlist** milegi.

**What the system stores (not a session calendar):**

```text
engagement:
  date_range_start: 2026-10-01
  date_range_end:   2026-11-30
  schedule_mode:    rolling          # institution decides sessions later
  expected_sessions: 16
  session_duration_hrs: 4
  interview_window: next_week
  interview_time_pref: afternoon_2_4pm
```

Engagement state: `sourcing`.

---

#### Phase 2 — Matching and filtering (L1 + L2, before anyone is messaged)

The agent finds 9 experts. Before WhatsApp goes out, it filters using **L1 + L2 only** — not L3 yet:

| Expert | L1 fit | L2 blocks in Oct–Nov | Pre-filter result |
|---|---|---|---|
| Rahul | Sat AM ✓, 7-day notice ✓, Pune travel ✓ | Blocked 14–16 Nov + Diwali blackout declared | **Eligible — ask** |
| Priya | Sat + Wed ✓, 3-day notice ✓, Pune local ✓ | No blocks | **Eligible — ask** |
| Amit | Only Mon–Fri ✓ | No blocks | **Eligible but lower rank** (institution said weekends) |
| Sneha | Sat ✓ | **Fully booked Oct** (3 other engagements) | **Do not ask** — L2 says no capacity |
| Karan | Sat ✓ | — | **Eligible — ask** |

Top 5 get invited. Sneha never gets a message — not because her calendar was empty, but because L2
proved she has no room.

---

#### Phase 3 — WhatsApp invite (L3 — the truth layer)

**This is the most important part.** For a long engagement we do **not** ask:

> ❌ "1 Oct, 4 Oct, 11 Oct, 18 Oct… par available hain?"

We ask for a **commitment pattern inside the range**:

**Message to Rahul (Day 0, 11:00):**

> **Calxmap**
>
> MIT-WPU Pune · Gen AI Training
> **1 Oct – 30 Nov 2026** · Offline · ~16 sessions (4 hrs each)
> Exact session dates baad mein fix hongi — mostly weekends expected
> Aapko milega: **~₹1,12,000** total (~₹7,000/session)
>
> Kya aap is program ke liye interested hain?
>
> **[Haan, is date range mein commit kar sakta hoon]**
> **[Nahi]**
> **[Kuch dates par nahi — batata hoon]**

Rahul taps **"Kuch dates par nahi — batata hoon"** (Scenario: partial availability).

**Agent follow-up (same thread, 30 seconds later):**

> Theek hai. Aapki Diwali trip **20–27 Oct** profile mein hai — woh block kar dete hain.
>
> Is range (1 Oct – 30 Nov) mein:
> - **Kaunse weekdays** regular sessions ke liye theek hain?
>   **[Saturday subah] [Tuesday shaam] [Dono]**
> - **Max kitni sessions per month** le sakte hain?
>   **[4] [6] [8]**
>
> **[Saturday subah + max 6/month]**

**Agent confirmation (echo parse — never act on unconfirmed text):**

> Confirm kijiye:
> - Program: **1 Oct – 30 Nov**, Pune offline
> - Aap: **Saturday subah** sessions · max **6/month**
> - Blocked: **20–27 Oct** (Diwali), **14–15 Nov** (aapki existing booking)
> - Fee: ~₹7,000/session · total ~₹1,12,000
>
> **[Sahi hai, confirm] [Edit karna hai]**

Rahul taps **Confirm**.

**What L3 stores:**

```text
availability_confirmation:
  engagement_id: ...
  expert_id: rahul
  type: pattern_commitment        # NOT exact_dates
  date_range: 2026-10-01..2026-11-30
  committed_pattern: [Sat_AM]
  max_sessions_per_month: 6
  blackouts_within_range: [2026-10-20..2026-10-27]
  derived_blocks: [2026-11-13..2026-11-16]  # from L2 booking
  confirmed_at: 2026-09-01T11:45:00+05:30
  source: agent_confirmed
  expires_at: confirmed_at + 14 days        # H4 — stale confirmations re-asked
```

**Priya's happy path (same day):** taps **"Haan, commit"** in one tap — her L1 already says Sat + Wed,
max 8/month, no blackouts. Agent echoes back, she confirms. Done in 2 taps.

**Karan (Scenario: decline):** taps **Nahi** — "Already committed to another college full semester."
Candidate state: `declined`. Agent invites rank #6.

**Amit (Scenario: counter-offer on fee):** taps **"Tell me more"** → asks if ₹8,000/session possible.
Agent: fee is fixed at platform rate; Amit declines. Not a calendar problem — out of funnel.

**Silent expert (Scenario: no response):** Reminder at 24h. No reply at 48h → `no_response`, rank #7
invited.

---

#### Phase 4 — Interview slot (immediately after L3 confirm)

Only experts who confirmed L3 get this. **Not at shortlist time — right now.**

**Message to Rahul (same thread, right after confirm):**

> MIT-WPU interview karna chahegi — **agle hafte dopahar 2–4**.
>
> Kaunsa slot theek rahega?
> **[8 Sept (Mon), 2:30 PM]**
> **[9 Sept (Tue), 3:00 PM]**
> **[10 Sept (Wed), 2:00 PM]**
>
> Slots aapke pattern (Tue available) aur unki window se match kiye gaye hain.

Rahul picks **9 Sept, 3 PM**.

```text
interview_slot:
  expert_id: rahul
  institution_id: mit_wpu
  start_at: 2026-09-09T15:00:00+05:30
  source: agent_confirmed_at_invite
  status: held                         # L4 soft hold until interview happens
```

**When Prof. Desai later taps "Pehle interview karein" on Rahul's card → call is already scheduled.
Zero coordination.**

---

#### Phase 5 — Shortlist (Day 1, ~30 hours later)

Prof. Desai gets 3 cards. **Only L3-confirmed experts appear.**

**Rahul's card:**

> **Rahul V.** · Mumbai (Pune travel ok) · **Verified** ⭐ 4.6 (9 engagements)
>
> **Matched skills:** Generative AI · Prompt Engineering · Python
> **Program fit:** 1 Oct – 30 Nov · Sat AM · max 6 sessions/month
>
> **Availability:**
> ✅ **Pattern confirmed** — Sat AM within Oct–Nov *(confirm kiya: kal)*
> 🚫 Blocked: 20–27 Oct (Diwali), 14–16 Nov (existing booking)
> 📅 Interview: **9 Sept, 3 PM** — scheduled
>
> **Fee:** ~₹1,12,000 total (~₹7,000/session × ~16)
> **Track record:** 100% attendance · 0 cancellations
>
> [Select] · [Pehle interview karein → already 9 Sept 3 PM]

**What is NOT on the card:** a 60-day calendar grid with empty/green cells. That would imply precision
we do not have and panic the institution when most cells are grey.

**Priya's card:** Sat + Wed, no blackouts, interview 8 Sept 2:30 PM.

Engagement state: `shortlist_ready`. **L4 soft hold** active on both experts' committed patterns for
7 days — they will not be double-promised for overlapping long programs without ops knowing.

---

#### Phase 6 — Interview, selection, final re-confirm (Day 5–7)

Prof. Desai interviews Rahul on 9 Sept. Goes well. Taps **Select** on 10 Sept.

**Before offer letter — L4 final re-confirm (one tap, one expert only):**

> MIT-WPU ne aapko select kiya hai.
>
> Confirm kijiye — ab bhi theek hai?
> - Program: **1 Oct – 30 Nov**, Sat AM, max 6/month
> - Blocked: 20–27 Oct, 14–16 Nov
> - Total: ~₹1,12,000
>
> **[Haan, confirm] [Ab nahi ho sakta — reason batayein]**

Rahul confirms. Offer letter generated. Engagement → `active`.

If Rahul had said **"Ab nahi"** → candidate `declined`, engagement back to `shortlist_ready`, Priya
offered next. **No cascade across three state machines** (see edge case F1).

---

#### Phase 7 — Rolling schedule (the part that replaces a calendar)

Program starts 1 Oct. Institution still does not have all 16 dates. **This is expected.**

**How sessions get scheduled — rolling 2-week window:**

Every **Monday**, the agent asks Prof. Desai:

> Agle 2 hafte (6–19 Oct) mein kaunse sessions schedule karni hain?
> Rahul **Sat AM** confirm hai · **20–27 Oct blocked** (Diwali)
>
> Suggested: **[4 Oct, Sat, 9 AM–1 PM] [11 Oct, Sat, 9 AM–1 PM]**
> **[Khud dates batayein] [Is hafte kuch nahi]**

Prof. Desai confirms **4 Oct** and **11 Oct**.

Agent immediately messages Rahul:

> MIT-WPU ne schedule kiya:
> - **4 Oct (Sat) 9 AM – 1 PM** · Pune campus
> - **11 Oct (Sat) 9 AM – 1 PM** · Pune campus
>
> **[Dono confirm] [4 Oct haan, 11 Oct nahi] [Dono nahi — reason]**

Rahul confirms both. System writes **concrete L3 slots** for those two dates only — not the whole
calendar:

```text
session_confirmations:
  - date: 2026-10-04, pattern: Sat_AM, status: confirmed, source: rolling_window
  - date: 2026-10-11, pattern: Sat_AM, status: confirmed, source: rolling_window
```

**L2 updates:** 4 Oct and 11 Oct now hard-blocked. Travel buffer applied (3 Oct PM, 12 Oct AM for
Mumbai→Pune).

**Next Monday (13 Oct):** agent asks for 20 Oct – 2 Nov window. Prof. Desai skips 18 Oct (internal
exam week), picks **25 Oct (Sat)** only. Rahul confirms. **20–27 Oct Diwali block** already known —
agent never suggested those dates.

**Payment tie-in:** attendance on confirmed sessions drives milestone payments. Unscheduled sessions
do not create payment expectations — the letter covers the program total, sessions are operational
detail.

---

#### Phase 8 — All scenarios in this demo (quick reference)

| # | Scenario | What happens | Fix / behaviour |
|---|---|---|---|
| **S1** | Institution only has date range, no fixed schedule | Pattern commitment (Sat AM, max 6/mo), not 16 date ticks | `schedule_mode: rolling` — core model for long programs |
| **S2** | Expert has blackout inside range (Diwali) | Declared at L1, confirmed at L3, never suggested for sessions | Blackout is first-class, not "delete calendar slots" |
| **S3** | Expert has existing booking mid-range (14–15 Nov) | L2 auto-block + shown on shortlist card | Zero expert effort |
| **S4** | Expert partially available — "some dates nahi" | Third button → structured follow-up → echo confirm | Near-miss converted, not dropped |
| **S5** | Expert confirms pattern, declines one rolling session later | "4 Oct haan, 11 Oct nahi" | Institution notified; can reschedule 11 Oct or accept partial month |
| **S6** | Institution skips a week ("is hafte kuch nahi") | No message to expert; no false "unavailable" | Agent only asks expert when institution proposes dates |
| **S7** | Institution adds extra session outside pattern (urgent Wed session) | Agent flags: "Rahul ka pattern Sat hai — Wed exception chahiye?" → one-off confirm to Rahul | Pattern is default; exceptions are explicit one-offs |
| **S8** | Expert stops responding to rolling confirms | After 2 missed rolling confirms → ops alert + institution told "scheduling delay" | H10 — deprioritise, do not delete profile |
| **S9** | L3 pattern confirm expires (14 days, institution slow to select) | Re-ask before shortlist refresh: "Ab bhi Sat AM Oct–Nov confirm?" | H4 |
| **S10** | Two institutions want same expert same Saturday | L4 hold at shortlist; first to offer letter wins; second gets backfill | H3 |
| **S11** | Expert free-text reply: "25 Oct nahi, 1 Nov kar sakta hoon" | Agent parses → echo → institution approves swap | H8 |
| **S12** | Program runs 2 months but expert capacity is 6/month | Matching already knew max 12 sessions possible in 2 mo; institution wanted ~16 | Agent flags at intake: "16 sessions @ 6/mo max = need 3 months OR second expert" — **before sourcing** |
| **S13** | Institution changes date range (extends to Dec) | Material edit → re-confirm pattern with Rahul for new range | B4 + H7 |
| **S14** | Expert never maintained calendar | Irrelevant — L3 pattern confirm is the truth | H1 — empty calendar never shown as "busy" |
| **S15** | Interview slot collected at invite, institution never interviews | Slot hold expires after 7 days; Priya/Rahul released; institution can still Select without interview | Optional interview (Open decision #4) |

---

#### Side-by-side: short engagement vs 2-month rolling program

| | **Short (Meera, §5–9)** | **Long (Rahul, this demo)** |
|---|---|---|
| Institution gives | Exact session dates (9 & 10 Sept) | **Date range only** (1 Oct – 30 Nov) |
| L3 question at invite | "In dates par free?" | "Is range mein **pattern** commit?" |
| Expert answer | Yes / No / counter dates | Pattern + max capacity + blackouts |
| Interview slot | At invite, after Yes | Same — at invite, after pattern confirm |
| Shortlist shows | "9 & 10 Sept confirmed" | "Sat AM · max 6/mo · blackouts listed" |
| After booking | Dates fixed — deliver | **Rolling 2-week** session confirm each Monday |
| Calendar UI needed? | **No** | **No** |
| What would break today | Empty calendar = "unavailable" | 60 empty calendar cells = expert looks idle for 2 months |

---

#### What Rahul actually did (expert effort tally)

| When | Action | Time |
|---|---|---|
| Onboarding (once) | Answered pattern questions in chat | 3 min |
| Day 0 | Pattern confirm for MIT-WPU program | 2 taps + 1 confirm |
| Day 0 | Picked interview slot | 1 tap |
| Day 7 | Final re-confirm at selection | 1 tap |
| Every Monday for 2 months | Confirm next 1–2 proposed sessions | 1–2 taps/week |

**Total: ~5 taps to get booked + ~8 taps/month during delivery.** No calendar maintenance. No bulk
weekly slot expansion. No stale rows expiring silently.

---

#### What the institution actually did

| When | Action |
|---|---|
| Day 0 | Described program + date range + interview window | 5 min chat |
| Day 1 | Reviewed shortlist | 10 min |
| Day 5 | Interview (optional — already scheduled) | 30 min |
| Day 7 | Selected Rahul | 1 tap |
| Every Monday Oct–Nov | Confirmed next 2 weeks' sessions | 2 min/week |

Prof. Desai never asked Rahul "aap calendar update karo". He never coordinated interview timing
manually. He never saw a misleading empty calendar.

---

#### System diagram (long program)

```text
┌─────────────────────────────────────────────────────────────────┐
│  L1 Standing pattern (once)     Tue/Sat, notice, blackouts, travel │
└────────────────────────────┬────────────────────────────────────┘
                             │ filters who gets invited
┌────────────────────────────▼────────────────────────────────────┐
│  L2 Derived blocks (auto)       bookings + travel buffer           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  L3 Pattern confirm (invite)    "Sat AM, max 6/mo, Oct–Nov?"      │
│       + interview slot          picked immediately after          │
└────────────────────────────┬────────────────────────────────────┘
                             │ only confirmed experts → shortlist
┌────────────────────────────▼────────────────────────────────────┐
│  L4 Hold + final re-confirm     at selection, before offer letter  │
└────────────────────────────┬────────────────────────────────────┘
                             │ engagement active
┌────────────────────────────▼────────────────────────────────────┐
│  Rolling L3 (weekly)            institution proposes → expert      │
│                                 confirms session-by-session       │
└─────────────────────────────────────────────────────────────────┘
```

---

*This demo is the canonical reference for long-running training programs. Short fixed-date engagements
follow the same layers but skip the rolling weekly step (see Meera's journey, §5–9).*

---

## 15. What we deliberately do not automate

Compliance and money stay human-accountable: offer letter generation and electronic signature,
attendance-driven payment release, dispute handling, KYC decisions, finance (invoices, TDS, GST,
payouts), and a full audit log of every agent action. An autonomous agent makes that audit log **more**
important, not less.

---

## 16. Open decisions

1. **Identity masking — yes or no?** It is the only effective anti-circumvention lever, but it costs
   institution transparency. (Recommended: yes, mask surname/photo/contact until booking.)
2. **Skill interview threshold** — what score is "verified"? And is it uniform across skill families?
3. **Does a failed interview block outreach entirely,** or does the expert appear as "self-declared,
   unverified" with lower ranking?
4. **Is the institution↔expert interview optional or mandatory** before selection? (Recommended:
   optional — some institutions will want to book straight from the shortlist.)
5. **Contact-sharing enforcement for institutions** — how many incidents before account review?
6. **Recording retention period** — how long do we keep raw audio and video versus transcripts?
7. **Do we keep the manual calendar UI at all?** (Recommended: keep it read-only for the experts who
   like it, but remove it from the onboarding path and stop treating it as a data source.)
8. **Hold duration** — 7 days matches the shortlist expiry, but a longer hold blocks good experts
   while a shorter one risks double-booking.
9. **Does an unconfirmed-availability expert still appear on a shortlist,** marked as "confirming",
   or do we wait for confirmation before presenting? (Recommended: wait, unless the shortlist would
   otherwise be empty.)

---

*This document describes intended behaviour, not what is built today. Update it as decisions in
Section 16 are made.*
