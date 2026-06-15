/**
 * Training attendance: daily entry/exit on training-type bookings.
 */
const expertAccess = require('../auth/expertAccess');
const institutionAccess = require('../auth/institutionAccess');
const superAdminAuth = require('../auth/superAdminAuth');
const {
  isTrainingProjectType,
  ACTIVE_BOOKING_STATUSES,
  READ_ONLY_BOOKING_STATUSES,
} = require('../lib/trainingTypes');
const ImageUploadService = require('../services/imageUploadService');

function normalizeDateOnly(s) {
  if (s == null || s === '') return null;
  const str = String(s).trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(str);
  return m ? m[1] : null;
}

function parseDateOnly(s) {
  return normalizeDateOnly(s);
}

function dateInRange(sessionDate, startDate, endDate) {
  const d = normalizeDateOnly(sessionDate);
  const start = normalizeDateOnly(startDate);
  const end = normalizeDateOnly(endDate);
  if (!d || !start || !end) return false;
  return d >= start && d <= end;
}

function minutesBetween(entry, exit) {
  if (!entry || !exit) return 0;
  const ms = new Date(exit).getTime() - new Date(entry).getTime();
  return ms > 0 ? ms / 60000 : 0;
}

function computeSummary(days, hoursBooked) {
  let daysApproved = 0;
  let daysPending = 0;
  let daysDisputed = 0;
  let daysOpen = 0;
  let totalMinutesApproved = 0;

  for (const d of days) {
    if (d.status === 'approved') {
      daysApproved += 1;
      const entry = d.effective_entry_at || d.expert_entry_at;
      const exit = d.effective_exit_at || d.expert_exit_at;
      totalMinutesApproved += minutesBetween(entry, exit);
    } else if (d.status === 'pending_review') {
      daysPending += 1;
    } else if (d.status === 'disputed') {
      daysDisputed += 1;
    } else if (d.status === 'open') {
      daysOpen += 1;
    }
  }

  const totalHoursApproved = Math.round((totalMinutesApproved / 60) * 100) / 100;
  const bookedHours = hoursBooked != null ? Number(hoursBooked) : null;
  const percentOfHoursBooked =
    bookedHours != null && bookedHours > 0
      ? Math.round((totalHoursApproved / bookedHours) * 1000) / 10
      : null;

  return {
    daysApproved,
    daysPending,
    daysDisputed,
    daysOpen,
    totalHoursApproved,
    hoursBooked: bookedHours,
    percentOfHoursBooked,
  };
}

async function writeAudit(service, dayId, actorUserId, actorRole, action, payload) {
  await service.from('training_attendance_audit').insert([
    {
      attendance_day_id: dayId,
      actor_user_id: actorUserId || null,
      actor_role: actorRole,
      action,
      payload: payload || {},
    },
  ]);
}

async function loadBooking(service, bookingId) {
  const { data, error } = await service
    .from('bookings')
    .select(
      `
      *,
      projects!inner(id, type, title, institution_id)
    `
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function normalizeBookingStatus(status) {
  if (status == null) return '';
  return String(status)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/**
 * @returns {Promise<{ booking, projectType, role, user, expertAccess, institutionAccess } | null>}
 */
async function resolveBookingAttendanceAccess(req, bookingId) {
  const { user, error: authErr } = await expertAccess.getAuthedUserFromRequest(req);
  if (!user) return { error: authErr || 'Unauthorized', status: 401 };

  const service = expertAccess.getServiceClient();
  const booking = await loadBooking(service, bookingId);
  if (!booking) return { error: 'Booking not found', status: 404 };

  const project = booking.projects;
  const projectType = project?.type;
  if (!isTrainingProjectType(projectType)) {
    return { error: 'Attendance is only available for training-type projects', status: 403 };
  }

  const roleMeta = await superAdminAuth.getUserRoleFromRequest(req);
  if (roleMeta.role === 'super_admin') {
    return {
      booking,
      projectType,
      role: 'super_admin',
      user,
      service,
      canMark: true,
      readOnly: false,
    };
  }

  const expertAcc = await expertAccess.resolveExpertAccess(req, booking.expert_id);
  if (expertAcc) {
    const bStatus = normalizeBookingStatus(booking.status);
    const readOnly = READ_ONLY_BOOKING_STATUSES.some((s) => s === bStatus);
    const canMark = !readOnly && ACTIVE_BOOKING_STATUSES.includes(bStatus);
    return {
      booking,
      projectType,
      role: 'expert',
      user,
      service,
      expertAccess: expertAcc,
      canMark,
      readOnly,
    };
  }

  const instAcc = await institutionAccess.resolveInstitutionAccess(req, booking.institution_id);
  if (instAcc) {
    const bStatus = normalizeBookingStatus(booking.status);
    const readOnly = READ_ONLY_BOOKING_STATUSES.some((s) => s === bStatus);
    return {
      booking,
      projectType,
      role: 'institution',
      user,
      service,
      institutionAccess: instAcc,
      canMark: false,
      readOnly,
    };
  }

  return { error: 'Unauthorized', status: 403 };
}

function getWriteClient(ctx) {
  // Use service client after access checks — attendance tables may lack per-user RLS grants.
  return ctx.service;
}

async function getDayForBooking(service, bookingId, dayId) {
  const { data, error } = await service
    .from('training_attendance_days')
    .select('*')
    .eq('id', dayId)
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function assertNoOtherOpenDay(service, bookingId, excludeDayId) {
  let q = service
    .from('training_attendance_days')
    .select('id, session_date, expert_entry_at, expert_exit_at')
    .eq('booking_id', bookingId)
    .eq('status', 'open');
  if (excludeDayId) q = q.neq('id', excludeDayId);
  const { data } = await q.limit(1);
  if (data?.length) {
    const openDay = data[0];
    const err = new Error(
      `Attendance for ${normalizeDateOnly(openDay.session_date) || 'a previous day'} is still open. Mark exit for that day before starting a new attendance entry.`
    );
    err.statusCode = 400;
    throw err;
  }
}

async function uploadAttendanceAttachment(file, folder) {
  if (!file) return null;
  const result = await ImageUploadService.uploadDocument(
    file.buffer,
    folder,
    null,
    file.mimetype,
    file.originalname
  );
  if (!result?.success) {
    const err = new Error(result?.error || 'Attendance attachment upload failed');
    err.statusCode = 500;
    throw err;
  }
  return result;
}

function registerTrainingAttendanceRoutes(app, upload) {
  app.get('/api/bookings/:bookingId/attendance/summary', async (req, res) => {
    try {
      const ctx = await resolveBookingAttendanceAccess(req, req.params.bookingId);
      if (ctx.error) return res.status(ctx.status).json({ error: ctx.error });

      const { data: days, error } = await ctx.service
        .from('training_attendance_days')
        .select('*')
        .eq('booking_id', req.params.bookingId);

      if (error) throw error;
      const summary = computeSummary(days || [], ctx.booking.hours_booked);
      res.json({
        summary,
        bookingStatus: ctx.booking.status,
        canMark: ctx.canMark,
        readOnly: ctx.readOnly,
        role: ctx.role,
      });
    } catch (err) {
      console.error('GET attendance summary error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/bookings/:bookingId/attendance', async (req, res) => {
    try {
      const ctx = await resolveBookingAttendanceAccess(req, req.params.bookingId);
      if (ctx.error) return res.status(ctx.status).json({ error: ctx.error });

      let query = ctx.service
        .from('training_attendance_days')
        .select('*')
        .eq('booking_id', req.params.bookingId)
        .order('session_date', { ascending: true });

      const from = parseDateOnly(req.query.from);
      const to = parseDateOnly(req.query.to);
      if (from) query = query.gte('session_date', from);
      if (to) query = query.lte('session_date', to);

      const { data: days, error } = await query;
      if (error) throw error;

      let mergedDays = days || [];
      if (from || to) {
        const { data: openDays, error: openError } = await ctx.service
          .from('training_attendance_days')
          .select('*')
          .eq('booking_id', req.params.bookingId)
          .eq('status', 'open');
        if (openError) throw openError;
        const byId = new Map(mergedDays.map((day) => [day.id, day]));
        for (const day of openDays || []) {
          byId.set(day.id, day);
        }
        mergedDays = Array.from(byId.values()).sort((a, b) =>
          String(a.session_date || '').localeCompare(String(b.session_date || ''))
        );
      }

      const summary = computeSummary(mergedDays, ctx.booking.hours_booked);
      res.json({
        days: mergedDays,
        summary,
        booking: {
          id: ctx.booking.id,
          status: ctx.booking.status,
          start_date: normalizeDateOnly(ctx.booking.start_date),
          end_date: normalizeDateOnly(ctx.booking.end_date),
          hours_booked: ctx.booking.hours_booked,
          project_type: ctx.projectType,
          project_title: ctx.booking.projects?.title,
        },
        canMark: ctx.canMark,
        readOnly: ctx.readOnly,
        role: ctx.role,
      });
    } catch (err) {
      console.error('GET attendance error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/bookings/:bookingId/attendance/days', async (req, res) => {
    try {
      const ctx = await resolveBookingAttendanceAccess(req, req.params.bookingId);
      if (ctx.error) return res.status(ctx.status).json({ error: ctx.error });
      if (ctx.role !== 'expert' && ctx.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only the expert can create attendance days' });
      }
      if (!ctx.canMark && ctx.role !== 'super_admin') {
        return res.status(400).json({ error: 'Booking is not active for attendance marking' });
      }

      const sessionDate = parseDateOnly(req.body.session_date);
      if (!sessionDate) {
        return res.status(400).json({ error: 'session_date (YYYY-MM-DD) is required' });
      }
      if (!dateInRange(sessionDate, ctx.booking.start_date, ctx.booking.end_date)) {
        return res.status(400).json({ error: 'session_date must be within booking start and end dates' });
      }

      const service = ctx.service;
      const { data: existing } = await service
        .from('training_attendance_days')
        .select('*')
        .eq('booking_id', req.params.bookingId)
        .eq('session_date', sessionDate)
        .maybeSingle();

      if (existing) {
        return res.json(existing);
      }

      await assertNoOtherOpenDay(service, req.params.bookingId, null);

      const writeClient = getWriteClient(ctx);
      const { data, error } = await writeClient
        .from('training_attendance_days')
        .insert([
          {
            booking_id: req.params.bookingId,
            session_date: sessionDate,
            status: 'open',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      await writeAudit(service, data.id, ctx.user.id, ctx.role, 'create_day', { session_date: sessionDate });
      res.status(201).json(data);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code !== 500) console.error('POST attendance day error:', err.message);
      else console.error('POST attendance day error:', err);
      res.status(code).json({ error: err.message });
    }
  });

  const optionalAttendanceUpload = upload
    ? upload.single('attendance_attachment')
    : (req, res, next) => next();

  app.post('/api/bookings/:bookingId/attendance/days/:dayId/entry', optionalAttendanceUpload, async (req, res) => {
    try {
      const ctx = await resolveBookingAttendanceAccess(req, req.params.bookingId);
      if (ctx.error) return res.status(ctx.status).json({ error: ctx.error });
      if (ctx.role !== 'expert' && ctx.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only the expert can mark entry' });
      }
      if (!ctx.canMark && ctx.role !== 'super_admin') {
        return res.status(400).json({ error: 'Booking is not active for attendance marking' });
      }

      const day = await getDayForBooking(ctx.service, req.params.bookingId, req.params.dayId);
      if (!day) return res.status(404).json({ error: 'Attendance day not found' });
      if (!['open', 'disputed'].includes(day.status)) {
        return res.status(400).json({ error: 'Entry can only be marked on open or disputed days' });
      }
      if (day.expert_entry_at && day.status !== 'disputed') {
        return res.status(400).json({ error: 'Entry already marked for this day' });
      }
      await assertNoOtherOpenDay(ctx.service, req.params.bookingId, day.id);

      const now = new Date().toISOString();
      const attachment = await uploadAttendanceAttachment(
        req.file,
        'training-attendance-entry'
      );
      const writeClient = getWriteClient(ctx);
      const updates = {
        expert_entry_at: now,
        status: day.expert_exit_at ? 'pending_review' : 'open',
        dispute_reason: day.status === 'disputed' ? null : day.dispute_reason,
        updated_at: now,
      };
      if (attachment) {
        updates.entry_attachment_url = attachment.url;
        updates.entry_attachment_public_id = attachment.publicId;
      }

      const { data, error } = await writeClient
        .from('training_attendance_days')
        .update(updates)
        .eq('id', day.id)
        .select()
        .single();

      if (error) throw error;
      await writeAudit(ctx.service, day.id, ctx.user.id, ctx.role, 'mark_entry', {
        expert_entry_at: now,
        entry_attachment_url: attachment?.url || null,
      });
      res.json(data);
    } catch (err) {
      console.error('POST mark entry error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/bookings/:bookingId/attendance/days/:dayId/exit', optionalAttendanceUpload, async (req, res) => {
    try {
      const ctx = await resolveBookingAttendanceAccess(req, req.params.bookingId);
      if (ctx.error) return res.status(ctx.status).json({ error: ctx.error });
      if (ctx.role !== 'expert' && ctx.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only the expert can mark exit' });
      }
      if (!ctx.canMark && ctx.role !== 'super_admin') {
        return res.status(400).json({ error: 'Booking is not active for attendance marking' });
      }

      const day = await getDayForBooking(ctx.service, req.params.bookingId, req.params.dayId);
      if (!day) return res.status(404).json({ error: 'Attendance day not found' });
      if (!day.expert_entry_at) {
        return res.status(400).json({ error: 'Mark entry before exit' });
      }
      if (day.expert_exit_at && day.status !== 'disputed') {
        return res.status(400).json({ error: 'Exit already marked for this day' });
      }

      const now = new Date().toISOString();
      if (new Date(now) <= new Date(day.expert_entry_at)) {
        return res.status(400).json({ error: 'Exit must be after entry' });
      }

      const writeClient = getWriteClient(ctx);
      const attachment = await uploadAttendanceAttachment(
        req.file,
        'training-attendance-exit'
      );
      const updates = {
        expert_exit_at: now,
        status: 'pending_review',
        dispute_reason: null,
        updated_at: now,
      };
      if (attachment) {
        updates.exit_attachment_url = attachment.url;
        updates.exit_attachment_public_id = attachment.publicId;
      }
      const { data, error } = await writeClient
        .from('training_attendance_days')
        .update(updates)
        .eq('id', day.id)
        .select()
        .single();

      if (error) throw error;
      await writeAudit(ctx.service, day.id, ctx.user.id, ctx.role, 'mark_exit', {
        expert_exit_at: now,
        status: 'pending_review',
        exit_attachment_url: attachment?.url || null,
      });
      res.json(data);
    } catch (err) {
      console.error('POST mark exit error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/bookings/:bookingId/attendance/days/:dayId/correct', async (req, res) => {
    try {
      const ctx = await resolveBookingAttendanceAccess(req, req.params.bookingId);
      if (ctx.error) return res.status(ctx.status).json({ error: ctx.error });
      if (ctx.role !== 'expert' && ctx.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only the expert can correct attendance' });
      }
      if (!ctx.canMark && ctx.role !== 'super_admin') {
        return res.status(400).json({ error: 'Booking is not active for attendance marking' });
      }

      const day = await getDayForBooking(ctx.service, req.params.bookingId, req.params.dayId);
      if (!day) return res.status(404).json({ error: 'Attendance day not found' });
      if (day.status !== 'disputed') {
        return res.status(400).json({ error: 'Only disputed days can be corrected by the expert' });
      }

      const entry = req.body.expert_entry_at || day.expert_entry_at;
      const exit = req.body.expert_exit_at || day.expert_exit_at;
      if (!entry || !exit) {
        return res.status(400).json({ error: 'Both entry and exit times are required' });
      }
      if (new Date(exit) <= new Date(entry)) {
        return res.status(400).json({ error: 'Exit must be after entry' });
      }

      const now = new Date().toISOString();
      const writeClient = getWriteClient(ctx);
      const { data, error } = await writeClient
        .from('training_attendance_days')
        .update({
          expert_entry_at: entry,
          expert_exit_at: exit,
          status: 'pending_review',
          dispute_reason: null,
          effective_entry_at: null,
          effective_exit_at: null,
          approved_at: null,
          approved_by_user_id: null,
          updated_at: now,
        })
        .eq('id', day.id)
        .select()
        .single();

      if (error) throw error;
      await writeAudit(ctx.service, day.id, ctx.user.id, ctx.role, 'expert_correct', {
        expert_entry_at: entry,
        expert_exit_at: exit,
      });
      res.json(data);
    } catch (err) {
      console.error('PUT correct attendance error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/bookings/:bookingId/attendance/days/:dayId/approve', async (req, res) => {
    try {
      const ctx = await resolveBookingAttendanceAccess(req, req.params.bookingId);
      if (ctx.error) return res.status(ctx.status).json({ error: ctx.error });
      if (ctx.role !== 'institution' && ctx.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only the institution can approve attendance' });
      }
      if (ctx.readOnly && ctx.role !== 'super_admin') {
        return res.status(400).json({ error: 'Booking is closed; attendance is read-only' });
      }

      const day = await getDayForBooking(ctx.service, req.params.bookingId, req.params.dayId);
      if (!day) return res.status(404).json({ error: 'Attendance day not found' });
      if (day.status !== 'pending_review') {
        return res.status(400).json({ error: 'Only days pending review can be approved' });
      }
      if (!day.expert_entry_at || !day.expert_exit_at) {
        return res.status(400).json({ error: 'Expert entry and exit are required before approval' });
      }

      const effectiveEntry = day.effective_entry_at || day.expert_entry_at;
      const effectiveExit = day.effective_exit_at || day.expert_exit_at;
      const now = new Date().toISOString();

      const writeClient = getWriteClient(ctx);
      const { data, error } = await writeClient
        .from('training_attendance_days')
        .update({
          effective_entry_at: effectiveEntry,
          effective_exit_at: effectiveExit,
          status: 'approved',
          approved_at: now,
          approved_by_user_id: ctx.user.id,
          dispute_reason: null,
          updated_at: now,
        })
        .eq('id', day.id)
        .select()
        .single();

      if (error) throw error;
      await writeAudit(ctx.service, day.id, ctx.user.id, ctx.role, 'approve', {
        effective_entry_at: effectiveEntry,
        effective_exit_at: effectiveExit,
      });
      res.json(data);
    } catch (err) {
      console.error('PUT approve attendance error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/bookings/:bookingId/attendance/days/:dayId/dispute', async (req, res) => {
    try {
      const ctx = await resolveBookingAttendanceAccess(req, req.params.bookingId);
      if (ctx.error) return res.status(ctx.status).json({ error: ctx.error });
      if (ctx.role !== 'institution' && ctx.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only the institution can dispute attendance' });
      }
      if (ctx.readOnly && ctx.role !== 'super_admin') {
        return res.status(400).json({ error: 'Booking is closed; attendance is read-only' });
      }

      const reason = typeof req.body.dispute_reason === 'string' ? req.body.dispute_reason.trim() : '';
      if (!reason) {
        return res.status(400).json({ error: 'dispute_reason is required' });
      }

      const day = await getDayForBooking(ctx.service, req.params.bookingId, req.params.dayId);
      if (!day) return res.status(404).json({ error: 'Attendance day not found' });
      if (!['pending_review', 'approved'].includes(day.status)) {
        return res.status(400).json({ error: 'Can only dispute pending or approved days' });
      }
      if (day.status === 'approved') {
        return res.status(400).json({
          error: 'Approved days cannot be disputed. Contact support if a correction is needed.',
        });
      }

      const now = new Date().toISOString();
      const writeClient = getWriteClient(ctx);
      const { data, error } = await writeClient
        .from('training_attendance_days')
        .update({
          status: 'disputed',
          dispute_reason: reason,
          updated_at: now,
        })
        .eq('id', day.id)
        .select()
        .single();

      if (error) throw error;
      await writeAudit(ctx.service, day.id, ctx.user.id, ctx.role, 'dispute', { dispute_reason: reason });
      res.json(data);
    } catch (err) {
      console.error('PUT dispute attendance error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/bookings/:bookingId/attendance/days/:dayId/times', async (req, res) => {
    try {
      const ctx = await resolveBookingAttendanceAccess(req, req.params.bookingId);
      if (ctx.error) return res.status(ctx.status).json({ error: ctx.error });
      if (ctx.role !== 'institution' && ctx.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only the institution can edit attendance times' });
      }
      if (ctx.readOnly && ctx.role !== 'super_admin') {
        return res.status(400).json({ error: 'Booking is closed; attendance is read-only' });
      }

      const day = await getDayForBooking(ctx.service, req.params.bookingId, req.params.dayId);
      if (!day) return res.status(404).json({ error: 'Attendance day not found' });
      if (day.status !== 'pending_review') {
        return res.status(400).json({ error: 'Times can only be edited while pending review' });
      }

      const effectiveEntry = req.body.effective_entry_at;
      const effectiveExit = req.body.effective_exit_at;
      const approve = req.body.approve === true;

      if (!effectiveEntry || !effectiveExit) {
        return res.status(400).json({ error: 'effective_entry_at and effective_exit_at are required' });
      }
      if (new Date(effectiveExit) <= new Date(effectiveEntry)) {
        return res.status(400).json({ error: 'Exit must be after entry' });
      }

      const now = new Date().toISOString();
      const updates = {
        effective_entry_at: effectiveEntry,
        effective_exit_at: effectiveExit,
        updated_at: now,
      };

      if (approve) {
        updates.status = 'approved';
        updates.approved_at = now;
        updates.approved_by_user_id = ctx.user.id;
        updates.dispute_reason = null;
      }

      const writeClient = getWriteClient(ctx);
      const { data, error } = await writeClient
        .from('training_attendance_days')
        .update(updates)
        .eq('id', day.id)
        .select()
        .single();

      if (error) throw error;
      await writeAudit(ctx.service, day.id, ctx.user.id, ctx.role, 'edit_times', {
        ...updates,
        approve,
      });
      res.json(data);
    } catch (err) {
      console.error('PUT edit times error:', err);
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerTrainingAttendanceRoutes, computeSummary };
