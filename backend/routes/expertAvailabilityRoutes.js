/**
 * Expert availability calendar slots (CRUD + bulk weekly expansion).
 */
const expertAccess = require('../auth/expertAccess');
const institutionAccess = require('../auth/institutionAccess');
const superAdminAuth = require('../auth/superAdminAuth');

function parseIsoDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayBoundsUtc(dateStr) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
}

async function institutionMayViewExpertAvailability(req, expertId) {
  const { user, role } = await superAdminAuth.getUserRoleFromRequest(req);
  if (!user) return false;
  if (role === 'super_admin') return true;
  if (role !== 'institution') return false;

  const service = expertAccess.getServiceClient();
  const { data: inst } = await service
    .from('institutions')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!inst) return false;

  const { data: apps } = await service
    .from('applications')
    .select('id, projects!inner(institution_id)')
    .eq('expert_id', expertId)
    .eq('projects.institution_id', inst.id)
    .limit(1);
  if (apps?.length) return true;

  const { data: bookings } = await service
    .from('bookings')
    .select('id')
    .eq('expert_id', expertId)
    .eq('institution_id', inst.id)
    .limit(1);
  return Boolean(bookings?.length);
}

function registerExpertAvailabilityRoutes(app) {
  app.get('/api/experts/:id/availability', async (req, res) => {
    try {
      const expertId = req.params.id;
      const from = parseIsoDate(req.query.from);
      const to = parseIsoDate(req.query.to);
      if (!from || !to) {
        return res.status(400).json({ error: 'from and to query params (ISO dates) are required' });
      }

      const access = await expertAccess.resolveExpertAccess(req, expertId);
      let allowed = Boolean(access);
      if (!allowed) {
        allowed = await institutionMayViewExpertAvailability(req, expertId);
      }
      if (!allowed) {
        const { role } = await superAdminAuth.getUserRoleFromRequest(req);
        if (role !== 'super_admin') {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      }

      const service = expertAccess.getServiceClient();
      const { data, error } = await service
        .from('expert_availability_slots')
        .select('*')
        .eq('expert_id', expertId)
        .gte('start_at', from.toISOString())
        .lte('start_at', to.toISOString())
        .order('start_at', { ascending: true });

      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      console.error('GET availability error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/experts/:id/availability', async (req, res) => {
    try {
      const expertId = req.params.id;
      const access = await expertAccess.resolveExpertAccess(req, expertId);
      if (!access) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const slots = Array.isArray(req.body.slots) ? req.body.slots : [req.body];
      const rows = [];
      for (const slot of slots) {
        const startAt = parseIsoDate(slot.start_at);
        const endAt = parseIsoDate(slot.end_at);
        if (!startAt || !endAt || endAt <= startAt) {
          return res.status(400).json({ error: 'Each slot needs valid start_at and end_at (end > start)' });
        }
        rows.push({
          expert_id: expertId,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          source: slot.source === 'bulk_weekly' ? 'bulk_weekly' : 'manual',
        });
      }

      const writeClient = expertAccess.getWriteClientForExpert(access);
      const { data, error } = await writeClient
        .from('expert_availability_slots')
        .insert(rows)
        .select();

      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      console.error('POST availability error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/experts/:id/availability/bulk', async (req, res) => {
    try {
      const expertId = req.params.id;
      const access = await expertAccess.resolveExpertAccess(req, expertId);
      if (!access) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const {
        days_of_week = [],
        start_time = '09:00',
        end_time = '17:00',
        from_date,
        to_date,
      } = req.body;

      const fromD = parseIsoDate(from_date);
      const toD = parseIsoDate(to_date);
      if (!fromD || !toD || toD < fromD) {
        return res.status(400).json({ error: 'Valid from_date and to_date required' });
      }
      const daySet = new Set(
        (Array.isArray(days_of_week) ? days_of_week : []).map((d) => Number(d))
      );
      if (!daySet.size) {
        return res.status(400).json({ error: 'days_of_week array required (0=Sun .. 6=Sat)' });
      }

      const [sh, sm] = String(start_time).split(':').map((n) => parseInt(n, 10) || 0);
      const [eh, em] = String(end_time).split(':').map((n) => parseInt(n, 10) || 0);

      const rows = [];
      const cursor = new Date(fromD);
      cursor.setUTCHours(0, 0, 0, 0);
      const endCursor = new Date(toD);
      endCursor.setUTCHours(23, 59, 59, 999);

      while (cursor <= endCursor) {
        if (daySet.has(cursor.getUTCDay())) {
          const y = cursor.getUTCFullYear();
          const m = String(cursor.getUTCMonth() + 1).padStart(2, '0');
          const d = String(cursor.getUTCDate()).padStart(2, '0');
          const startAt = new Date(`${y}-${m}-${d}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00.000Z`);
          const endAt = new Date(`${y}-${m}-${d}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00.000Z`);
          if (endAt > startAt) {
            rows.push({
              expert_id: expertId,
              start_at: startAt.toISOString(),
              end_at: endAt.toISOString(),
              source: 'bulk_weekly',
            });
          }
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }

      if (!rows.length) {
        return res.status(400).json({ error: 'No slots generated for the given range' });
      }

      const writeClient = expertAccess.getWriteClientForExpert(access);
      const { data, error } = await writeClient
        .from('expert_availability_slots')
        .insert(rows)
        .select();

      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      console.error('POST availability bulk error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/experts/:id/availability/:slotId', async (req, res) => {
    try {
      const expertId = req.params.id;
      const slotId = req.params.slotId;
      const access = await expertAccess.resolveExpertAccess(req, expertId);
      if (!access) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const writeClient = expertAccess.getWriteClientForExpert(access);
      const { error } = await writeClient
        .from('expert_availability_slots')
        .delete()
        .eq('id', slotId)
        .eq('expert_id', expertId);

      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error('DELETE availability error:', err);
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerExpertAvailabilityRoutes, dayBoundsUtc };
