# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Calxmap expert-collaboration platform: a Next.js frontend and an Express backend backed by Supabase (Postgres + Auth). It connects institutions with experts/trainers for training projects, freelance work, and internships, plus a super-admin back office.

## Repository layout

- `frontend/` — Next.js 16 (App Router), React 19, TypeScript, Tailwind, shadcn/radix UI components.
- `backend/` — Express 5 API server (`server.js`), Socket.IO, Supabase, Cloudinary, SendGrid/Brevo/Nodemailer for email, Redis (Upstash) for caching/pubsub.
- `supabase/migrations/` — SQL migrations.
- root `*.sql` files — ad hoc/legacy schema migration scripts (predate `supabase/migrations`).
- `docs/` — product specs (pricing/compensation model, training attendance flows, bulk import guide, etc.) — check these before touching related features, they describe intended business logic.

## Commands

### Frontend (`frontend/`)
```bash
npm run dev      # next dev --webpack
npm run build
npm run start
npm run lint
```

### Backend (`backend/`)
```bash
npm run dev       # nodemon server.js
npm start         # node server.js
```
There is no backend test suite configured (`npm test` is a stub). There is no frontend test runner configured either — validate changes via `npm run lint`, `npm run build`, and manual verification.

Each app has its own `.env` (not committed). Backend needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, email provider keys (SendGrid/Brevo/SMTP), Cloudinary keys, Redis URLs. Frontend needs `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Backend architecture

**`server.js` is a large (~7000 line) monolith** containing most routes defined inline (auth, experts, institutions, projects, internships, students, freelance, applications, bookings, notifications, etc.). Middleware order matters: helmet → cors → morgan → json/urlencoded parsers → the `/api/admin` super-admin auth gate → inline routes.

Newer feature work lives instead as **layered modules under `backend/src/modules/<feature>/`**, each with `*.controller.js`, `*.dto.js`, `*.repository.js`, `*.routes.js`, `*.service.js`, mounted near the bottom of `server.js` (e.g. `super-admin`, `applications` (`applicationRate`), `bookings` (`bookingCompletion`), `onboarding`). Prefer this pattern for new backend features rather than adding more inline routes to `server.js`. `backend/src/shared/` holds cross-module logic reused by both old and new code (`projectStatus.js`, `compensation.js`, `completionHistory.js`).

There is also a flatter `backend/routes/` directory (`contact.js`, `expertAvailabilityRoutes.js`, `superadminExpertMutations.js`, `trainingAttendanceRoutes.js`) for routes extracted out of `server.js` but not fully moved to the modules pattern — each exports a `register*Routes(app)` or `setup*Routes` function called at the bottom of `server.js`.

`backend/services/` holds business logic used by inline routes (finance calculations/dashboard, email sending, PDF/offer-letter generation, image upload, notifications, socket.io, bulk import, Google Sheets sync). `backend/auth/` holds access-control helpers, not Express middleware in the traditional sense:
- `expertAccess.js` / `institutionAccess.js` — resolve whether the caller is the resource owner or a super-admin "acting as" that resource, via `resolveExpertAccess`/`resolveInstitutionAccess`. Both roles use a Supabase Auth JWT (`Authorization: Bearer <token>`); super-admin requests additionally carry an `X-Acting-Expert-Id` / `X-Acting-Institution-Id` header when narrowing to a specific target.
- `superAdminAuth.js` — legacy super-admin JWT check (`requireSuperAdmin`), used to gate `/api/admin/*` and set `req.legacyAdmin`.
- `profileAuthService.js` — links/creates Supabase Auth users for profile records (experts/institutions/students created before having login credentials).

## Frontend architecture

App Router structure under `frontend/src/app/` is organized by **role/portal**, each with its own `layout.tsx`: `expert/`, `institution/`, `student/`, `admin/`, `superadmin/`, plus public routes (`experts/`, `requirements/`, `solutions/`, `auth/`). Each portal layout typically enforces auth/role checks and renders portal-specific nav.

`frontend/src/lib/api.ts` is the single client for backend calls — always attaches the Supabase session's `access_token` as a Bearer token via `getAuthHeaders()`/`getAuthHeadersForFormData()` (use the latter for `multipart/form-data`/file uploads, since it omits `Content-Type`).

**Super-admin "acting as" pattern**: a super-admin can act as a specific expert or institution to see/use that portal as they would. `frontend/src/lib/superAdminActing.ts` stores the acting expert/institution id in `sessionStorage` (mutually exclusive — setting one clears the other); `api.ts` reads it and adds `X-Acting-Expert-Id`/`X-Acting-Institution-Id` to requests when the session role is `super_admin`. Backend access-resolution helpers (`resolveExpertAccess`/`resolveInstitutionAccess`) honor these headers.

Other notable `frontend/src/lib/` modules: `projectStatus.ts`/`projectCompensation.ts`/`projectPricing.ts` (project state machine and pricing logic — must stay consistent with `backend/src/shared/projectStatus.js` and `compensation.js`), `expertAvailability*.ts`, `trainingAttendance.ts`, `bookingCompletion.ts`, `navigation.catalog.ts` (per-portal nav definitions).

## Domain concepts worth knowing before changing business logic

- **Entities**: institutions post requirements (training/freelance/internship); experts apply/get selected; bookings track scheduled sessions; students apply to internships/freelance projects.
- **Project status and compensation** are governed by shared logic duplicated conceptually across frontend (`lib/projectStatus.ts`, `lib/projectCompensation.ts`) and backend (`src/shared/projectStatus.js`, `src/shared/compensation.js`) — check both sides when changing state transitions or payment calculation.
- See `docs/PRICING_AND_COMPENSATION_MODEL.md` and `docs/TRAINING_ATTENDANCE*.md` for the intended business rules behind pricing/compensation and attendance-driven payment flows before modifying them.

## Editing conventions

A repo-wide Cursor rule (`.cursor/rules/preserve-rule.mdc`) applies: preserve existing logic, data flow, and functionality; make the minimum edit necessary; don't refactor, rename, or restructure code beyond what's requested; treat existing behavior as intentional and production-critical.
