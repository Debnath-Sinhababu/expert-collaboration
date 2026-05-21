# Bulk import guide (Google Sheets)

Super admins can import **experts** and **students** from a public Google Sheet at **Super Admin → Bulk import**.

Each row creates:

1. A **profile** in the database (`experts` or `site_students`)
2. A **Supabase login** (email + password) linked via `user_id`

Share the sheet as **“Anyone with the link can view”** (or use authenticated sheet access if configured on the server).

---

## Default login password

Unless you pass a custom `defaultPassword` in the API, new accounts use:

**`ExpertCollaboration@123`**

Users should change this after first login. You can override per import in the bulk-import UI if we add that field, or via API body `defaultPassword`.

---

## Sheet setup (both types)

- First row = **column headers** (names are flexible; see aliases below).
- Data starts on row 2.
- Default range: `Sheet1!A1:Z1000` (change if your tab or range differs).
- Header names are normalized: lowercase, spaces/hyphens → underscores (e.g. `Domain Expertise` → `domain_expertise`).

Paste either the full spreadsheet URL or the Sheet ID from:

`https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`

---

# Expert bulk import

**Endpoint:** `POST /api/superadmin/experts/bulk-import`

### Required columns

| Field | Accepted header names (examples) |
|--------|----------------------------------|
| Name | `name`, `expert_name`, `full_name` |
| Email | `email`, `email_address` |
| Phone | `phone`, `phone_number`, `mobile`, `contact` |
| Domain expertise | `domain`, `domain_expertise`, `expertise_domain`, `field` |

Use a value from the standard domain list (e.g. `Engineering`, `Computer Science & IT`, `Other`) or a custom domain name (created automatically if new).

### Optional columns

| Field | Accepted header names (examples) |
|--------|----------------------------------|
| Bio | `bio`, `biography`, `about` |
| Subskills | `subskills`, `skills` (comma-separated) |
| Hourly rate | `hourly_rate`, `rate` |
| Experience years | `experience_years`, `years_of_experience`, `yoe` |
| Qualifications (text) | `qualifications`, `education` |
| LinkedIn | `linkedin_url`, `linkedin` |
| Last company | `last_working_company`, `company` |
| Designation | `current_designation`, `job_title`, `role` |
| Expert types | `expert_types`, `type` (comma-separated) |
| On demand | `available_on_demand` (`true` / `yes` / `1`) |
| Profile photo URL | `profile_photo_url`, `photo_url` (public HTTP(S) link) |
| Resume URL | `resume_url`, `resume`, `cv` (PDF link) |
| Qualifications PDF URL | `qualifications_url`, `qualifications_pdf` |

### Example header row (experts)

```text
name | email | phone | domain_expertise | subskills | hourly_rate | profile_photo_url | resume_url
```

### After import

- Role in auth: `expert`
- Login at `/auth/login` with sheet **email** + default (or custom) password
- Profile is marked verified (`is_verified: true`)

---

# Student bulk import

**Endpoint:** `POST /api/superadmin/students/bulk-import`

### Required columns

| Field | Accepted header names (examples) |
|--------|----------------------------------|
| Name | `name`, `student_name`, `full_name` |
| Email | `email`, `email_address` |

### Optional columns

| Field | Accepted header names (examples) |
|--------|----------------------------------|
| Phone | `phone`, `mobile` |
| Degree | `degree`, `course`, `program` |
| Year | `year`, `academic_year` |
| Specialization | `specialization`, `major`, `branch` |
| City / State | `city`, `state` |
| Skills | `skills` (comma-separated) |
| LinkedIn / GitHub / Portfolio | `linkedin_url`, `github_url`, `portfolio_url` |
| Institution (by UUID) | `institution_id` |
| Institution (by email) | `institution_email`, `college_email` |
| Institution (by name) | `institution_name`, `college`, `university` (case-insensitive match) |
| Profile photo URL | `profile_photo_url`, `photo_url` |
| Resume URL | `resume_url`, `resume`, `cv` (PDF link) |

Institution linking is optional. If multiple match methods are provided, resolution order is: **id → email → name**.

### Example header row (students)

```text
name | email | phone | degree | year | institution_name | city | state | skills | resume_url
```

### After import

- Role in auth: `student`
- Login at `/auth/login` with sheet **email** + default (or custom) password
- Students can complete or update their profile in the app after login

---

# Super-admin “Create” forms (single profile)

Creating **Expert**, **Institution**, or **Student** from the console also creates a login account automatically (same default password unless `SUPERADMIN_DEFAULT_USER_PASSWORD` is set in backend env).

| Create type | Login email | Auth role |
|-------------|-------------|-----------|
| Expert | Email entered on the form | `expert` |
| Institution | Contact email on the form | `institution` |
| Student | Email on the form | `student` |

API responses may include an `auth` object:

```json
{
  "auth": {
    "email": "user@example.com",
    "canLogin": true,
    "isNewAccount": true,
    "temporaryPassword": "ExpertCollaboration@123"
  }
}
```

`temporaryPassword` is only present when a **new** auth user was created. If the email already had an account, the existing user is linked and no password is returned.

---

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| Row failed: “already exists” | Profile or auth already uses that email |
| Row failed: “Auth user” | Invalid email or Supabase auth policy |
| Sheet not read | Public sharing, correct URL/ID, range includes headers |
| Photo/resume failed | URL must be direct HTTP(S); Google Drive links often need “anyone can view” |
| Institution not linked (students) | Institution must exist in DB; name match is case-insensitive exact |

## API request body (reference)

```json
{
  "spreadsheetId": "<id or full URL>",
  "range": "Sheet1!A1:Z1000",
  "usePublicAccess": true,
  "delayBetweenRows": 500,
  "defaultPassword": "OptionalCustomPassword123"
}
```
