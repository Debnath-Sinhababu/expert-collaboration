const { createClient } = require('@supabase/supabase-js');
const institutionAccess = require('../auth/institutionAccess');
const { computeAutoProjectStatus } = require('../src/shared/projectStatus');

const PROJECT_SNAPSHOT_FIELDS = [
  'title', 'description', 'type', 'start_date', 'end_date',
  'compensation_unit', 'unit_quantity', 'duration_hours', 'duration_per_unit', 'hours_per_day',
  'institution_gross_per_unit', 'institution_gross_total', 'total_budget', 'hourly_rate',
  'opening_count', 'domain_expertise', 'required_expertise', 'subskills',
  'job_location', 'workplace_type', 'employment_type', 'interview_period_interval',
  'schedule_notes', 'screening_questions', 'requirement_pdf_url',
];

function pickProjectSnapshot(row = {}) {
  return PROJECT_SNAPSHOT_FIELDS.reduce((acc, key) => {
    if (row[key] !== undefined) acc[key] = row[key];
    return acc;
  }, {});
}

function getServiceClient() {
  return institutionAccess.getServiceClient();
}

/** Only institution owners go through edit approval; superadmin always bypasses. */
function shouldRequireInstitutionEditApproval(access) {
  return Boolean(access && access.mode === 'owner');
}

async function projectHasBookings(projectId, client = getServiceClient()) {
  const { count, error } = await client
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .neq('status', 'cancelled');
  if (error) throw error;
  if ((count || 0) > 0) return true;

  // Legacy: expert accepted but booking row not created yet
  const { count: acceptedCount, error: appError } = await client
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'accepted');
  if (appError) throw appError;
  return (acceptedCount || 0) > 0;
}

async function getPendingEditRequest(projectId, client = getServiceClient()) {
  const { data, error } = await client
    .from('project_edit_requests')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'pending')
    .maybeSingle();
  if (error) {
    if (error.code === '42P01') return null;
    throw error;
  }
  return data || null;
}

async function listEditRequestsForProject(projectId, { status = 'pending' } = {}, client = getServiceClient()) {
  let query = client
    .from('project_edit_requests')
    .select('*, super_admin_users:reviewed_by_admin_id(id,name,email)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return data || [];
}

async function queueInstitutionProjectEdit({
  projectId,
  institutionId,
  proposedPayload,
  previousSnapshot,
  client = getServiceClient(),
}) {
  const existing = await getPendingEditRequest(projectId, client);
  const row = {
    project_id: projectId,
    institution_id: institutionId,
    status: 'pending',
    proposed_payload: proposedPayload,
    previous_snapshot: previousSnapshot,
    review_note: null,
    reviewed_by_admin_id: null,
    reviewed_at: null,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await client
      .from('project_edit_requests')
      .update(row)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await client
    .from('project_edit_requests')
    .insert([row])
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function applyProjectUpdatePayload(projectId, payload, client = getServiceClient()) {
  const { data: existing, error: fetchError } = await client
    .from('projects')
    .select('id, status, start_date, end_date')
    .eq('id', projectId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const patch = { ...payload, updated_at: new Date().toISOString() };
  delete patch.institution_id;
  delete patch.id;

  const nextStart = patch.start_date !== undefined ? patch.start_date : existing.start_date;
  const nextEnd = patch.end_date !== undefined ? patch.end_date : existing.end_date;
  if (patch.status === undefined) {
    patch.status = computeAutoProjectStatus({
      status: existing.status,
      start_date: nextStart,
      end_date: nextEnd,
    });
  }

  const { data, error } = await client
    .from('projects')
    .update(patch)
    .eq('id', projectId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function reviewEditRequest({
  requestId,
  action,
  reviewNote = '',
  adminRecordId = null,
  client = getServiceClient(),
}) {
  const { data: request, error: fetchError } = await client
    .from('project_edit_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!request) {
    const err = new Error('Edit request not found');
    err.statusCode = 404;
    throw err;
  }
  if (request.status !== 'pending') {
    const err = new Error('This edit request was already reviewed');
    err.statusCode = 400;
    throw err;
  }

  if (action === 'reject') {
    const { data, error } = await client
      .from('project_edit_requests')
      .update({
        status: 'rejected',
        review_note: reviewNote || null,
        reviewed_by_admin_id: adminRecordId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select('*')
      .single();
    if (error) throw error;
    return { request: data, project: null };
  }

  if (action !== 'approve') {
    const err = new Error('Invalid review action');
    err.statusCode = 400;
    throw err;
  }

  const project = await applyProjectUpdatePayload(
    request.project_id,
    request.proposed_payload || {},
    client,
  );

  const { data, error } = await client
    .from('project_edit_requests')
    .update({
      status: 'approved',
      review_note: reviewNote || null,
      reviewed_by_admin_id: adminRecordId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select('*')
    .single();
  if (error) throw error;
  return { request: data, project };
}

module.exports = {
  PROJECT_SNAPSHOT_FIELDS,
  pickProjectSnapshot,
  shouldRequireInstitutionEditApproval,
  projectHasBookings,
  getPendingEditRequest,
  listEditRequestsForProject,
  queueInstitutionProjectEdit,
  applyProjectUpdatePayload,
  reviewEditRequest,
};
