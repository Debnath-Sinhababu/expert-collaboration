# Backend MVC — next extraction targets

Incremental migration off `server.js`. Keep APIs identical.

## Recommended order

| Priority | Domain | Why | Target module | Status |
|----------|--------|-----|---------------|--------|
| 1 | **Auth + health** | Small, low conflict | `src/modules/auth/` | Done |
| 2 | **Experts** (+ Calxbook, cancelled cheque, availability) | Largest remaining cluster; fold `routes/expertAvailabilityRoutes.js` | `src/modules/experts/` | Done |
| 3 | **Projects** (+ edit-request) | Hot path; uses `projectEditRequestService` | `src/modules/projects/` | Done |
| 4 | **Applications CRUD** | Fold into existing `src/modules/applications/` | same module | Done |
| 5 | **Bookings CRUD** | Fold into existing `src/modules/bookings/`; fold attendance routes | same module | Done |
| 6 | **Ratings** | Small | `src/modules/ratings/` | Done |
| 7 | **Students** | Medium | `src/modules/students/` | Done |
| 8 | **Internships** | Medium | `src/modules/internships/` | Done |
| 9 | **Freelance** | Medium | `src/modules/freelance/` | Done |
| 10 | **Legacy `/api/admin/*`** | Keep until product deletes; separate from `/api/superadmin` | `src/modules/legacy-admin/` | Done |

## Parallel work (remaining)

Phase 2 domain extraction is complete. Follow-ups:
- Thin handlers into real service/repository logic over time
- Retire legacy `/api/admin` when product fully moves to `/api/superadmin`  

Avoid two people editing `server.js` for the same line range: claim a domain in the PR title (`extract(experts): ...`).

## Smoke after each extract

- Hit list + get-by-id + create/update for that domain against local `npm run dev`.
- Confirm `grep '/api/<domain>' server.js` no longer finds handlers (mount may remain only in `src/routes/index.js`).
