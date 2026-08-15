# Backend module guide

How to add or move Express APIs so multiple people can work without merge conflicts.

## Layout

```
backend/
  server.js                 # Bootstrap: createApp, legacy routes still here, listen
  src/
    app.js                  # Core middleware + error handlers
    routes/index.js         # Mounts extracted domain routers
    modules/<domain>/       # MVC per domain
      <domain>.routes.js
      <domain>.controller.js
      <domain>.service.js
      <domain>.repository.js
      <domain>.dto.js        # Optional
    shared/                 # Cross-cutting helpers only
  auth/                     # Access / JWT helpers
  services/                 # Email, upload, finance, sockets, etc.
  middleware/               # Multer, etc.
  routes/                   # Legacy flat registrars (migrate into modules when touched)
```

## Layer rules

| Layer | Owns | Must not |
|-------|------|----------|
| **routes** | Path, HTTP method, upload middleware, `asyncHandler` | Business rules, SQL |
| **controller** | Read `req`, call service, send `res` | Supabase queries |
| **service** | Orchestration, validation, uploads, auth side-effects | Raw Express `req`/`res` when avoidable |
| **repository** | Supabase queries only | HTTP status decisions |
| **dto** | Parse/normalize body/query | Side effects |

Use `src/shared/http/asyncHandler.js` on every modular handler. Throw errors with `statusCode` (or `status`) so `applyFinalErrorHandlers` returns the right JSON.

## Adding a new endpoint

1. Put it in the matching `src/modules/<domain>/` if that domain is extracted.
2. If the domain is still in `server.js`, either:
   - **Preferred:** extract that domain in its own PR first, then add the endpoint, or
   - Add temporarily in `server.js` only if blocked — move it when the domain is extracted.
3. Register new routers only in [`src/routes/index.js`](../backend/src/routes/index.js).
4. **Do not** put new handlers back into `server.js` for domains already extracted (e.g. institutions).

## PR / conflict rules

- **One domain per PR** when extracting from `server.js`.
- Do not edit extracted module files and `server.js` handlers for the same feature in one PR unless wiring the mount.
- Shared changes (`auth/`, `services/`, `src/shared/`) are intentional cross-team PRs — keep them small.
- **Never change API paths or response shapes** during extraction (behavior-preserving moves only).

## Suggested ownership

| Domain | Module path |
|--------|-------------|
| Institutions | `src/modules/institutions/` (done) |
| Auth + health | `src/modules/auth/` (done) |
| Experts | `src/modules/experts/` (done; handlers → service facade) |
| Projects | `src/modules/projects/` (done; handlers → service facade) |
| Super admin | `src/modules/super-admin/` (done; includes profile hard-delete + custom-domains) |
| Applications | `src/modules/applications/` (done; CRUD + rate/lock) |
| Bookings | `src/modules/bookings/` (done; CRUD + completion; attendance via `routes/trainingAttendanceRoutes.js`) |
| Ratings | `src/modules/ratings/` (done) |
| Students | `src/modules/students/` (done; portal + `/api/student` feedback) |
| Internships | `src/modules/internships/` (done; listings + applications) |
| Freelance | `src/modules/freelance/` (done) |
| Legacy `/api/admin/*` | `src/modules/legacy-admin/` (done) |

## Extraction checklist

1. Copy handlers into routes/controller/service/repository (preserve behavior).
2. Mount in `registerModularRoutes`.
3. Delete the old `app.get/post/...` blocks from `server.js`.
4. Smoke: list / create / get / update (and any uploads) for that domain.
5. Grep `server.js` to confirm the path prefix is gone.

## Next PR targets

See [BACKEND_MVC_NEXT.md](./BACKEND_MVC_NEXT.md).
