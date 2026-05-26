# Training attendance

## Scope

Attendance applies to **bookings** linked to training-type projects: `guest_lecture`, `fdp`, `workshop`, `training_program`.

## Flow

1. **Expert** opens the booking card → **Training attendance** → marks **entry**, then **exit** for the day.
2. The day moves to **pending review**.
3. **Institution** approves, edits times (save & approve), or disputes with a reason.
4. If disputed, the expert **resubmits** corrected times; institution reviews again.

## Summary metrics

- **Days approved** / **Hours delivered** count only approved days (effective entry/exit).
- **Pending review** and **Progress** (% of `hours_booked`) update as days are approved.

## API (backend)

- `GET /api/bookings/:bookingId/attendance`
- `GET /api/bookings/:bookingId/attendance/summary`
- Expert: `POST .../days`, `POST .../days/:dayId/entry`, `POST .../exit`, `PUT .../correct`
- Institution: `PUT .../approve`, `PUT .../dispute`, `PUT .../times`

Apply migration `supabase/migrations/20260527120000_training_attendance.sql` before use.
