# Bulk import sample spreadsheets

Bulk import in the app reads **Google Sheets**, not `.xlsx` files directly. Use these CSV samples in Excel, then publish them as a Google Sheet.

## Quick test steps

1. **Start the app**  
   - Backend: `http://localhost:8000`  
   - Frontend: `http://localhost:3000`  
   - Log in as **super admin**

2. **Prepare a Google Sheet**  
   - Open [Google Sheets](https://sheets.google.com) → **Blank spreadsheet**  
   - **File → Import → Upload**  
   - Choose `bulk-import-experts-sample.csv` or `bulk-import-students-sample.csv`  
   - Import location: **Replace current sheet**  
   - Separator: **Comma**

3. **Use unique emails**  
   - Replace `@example.com` addresses with real addresses you control (Gmail is fine for students).  
   - Each row must use an email **not already** in Supabase or the `experts` / `site_students` tables.

4. **Share the sheet**  
   - **Share** → **General access** → **Anyone with the link** → **Viewer**  
   - Copy the URL (e.g. `https://docs.google.com/spreadsheets/d/ABC123.../edit`)

5. **Run import**  
   - Go to `http://localhost:3000/superadmin/bulk-import`  
   - Tab: **Experts** or **Students**  
   - Paste the spreadsheet URL  
   - Range: `Sheet1!A1:Z1000` (change if your tab name differs)  
   - Optional: set a custom **Default login password**  
   - Click **Start import**

6. **Verify login**  
   - Default password (if you left the field empty): `ExpertCollaboration@123`  
   - `/auth/login` with an imported **email** + password  
   - User should land on expert/student home (not profile-setup)

## Files in this folder

| File | Purpose |
|------|---------|
| `bulk-import-experts-sample.csv` | 3 sample experts (required columns + a few optional ones) |
| `bulk-import-students-sample.csv` | 3 sample students (name + email required; optional fields) |

## Expert columns (minimum)

`name`, `email`, `phone`, `domain_expertise`

Valid `domain_expertise` examples: `Engineering`, `Computer Science & IT`, `Data Science & Analytics`, `Other` (see `docs/BULK_IMPORT_GUIDE.md`).

## Student columns (minimum)

`name`, `email`

Optional: link to an institution via `institution_name` (must match an existing institution name in your DB), or `institution_id` / `institution_email`.

## Optional: photo/resume from URLs

Add columns `profile_photo_url` or `resume_url` with **public** direct links (HTTP/HTTPS). Google Drive links often fail unless shared for anyone with the link.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Invalid spreadsheet URL | Paste full URL or only the ID between `/d/` and `/edit` |
| Failed to read Google Sheet | Sheet must be **Anyone with the link can view** |
| Email already exists | Change emails in the sheet to unused addresses |
| Row failed: Domain expertise | Use a standard domain name from the guide |
| Student institution not linked | Create the institution first, or match `institution_name` exactly |

Full column list: [`../BULK_IMPORT_GUIDE.md`](../BULK_IMPORT_GUIDE.md)
