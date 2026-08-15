/**
 * Leftover superadmin profile hard-delete + custom-domains routes from server.js.
 */
const superAdminAuth = require('../../../auth/superAdminAuth');

function formatHardDeleteError(err) {
  const code = err?.code || '';
  const msg = err?.message || 'Delete failed';
  if (code === '23503') {
    return 'Cannot delete: this profile is still referenced by other records (projects, applications, etc.). Remove those first.';
  }
  if (code === 'AUTH_DELETE_FAILED') {
    return msg;
  }
  return msg;
}

async function deleteExpert(req, res) {
  try {
    const auth = await superAdminAuth.requireSuperAdminPermission(req, res, 'profiles:write');
    if (!auth) return;
    const serviceClient = superAdminAuth.getServiceClient();
    const deleted = await superAdminAuth.hardDeleteProfileRow(serviceClient, 'experts', req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Expert not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Super-admin delete expert error:', err);
    res.status(500).json({ error: formatHardDeleteError(err) });
  }
}

async function deleteInstitution(req, res) {
  try {
    const auth = await superAdminAuth.requireSuperAdminPermission(req, res, 'profiles:write');
    if (!auth) return;
    const serviceClient = superAdminAuth.getServiceClient();
    const deleted = await superAdminAuth.hardDeleteProfileRow(serviceClient, 'institutions', req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Institution not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Super-admin delete institution error:', err);
    res.status(500).json({ error: formatHardDeleteError(err) });
  }
}

async function deleteStudent(req, res) {
  try {
    const auth = await superAdminAuth.requireSuperAdminPermission(req, res, 'profiles:write');
    if (!auth) return;
    const serviceClient = superAdminAuth.getServiceClient();
    const deleted = await superAdminAuth.hardDeleteProfileRow(serviceClient, 'site_students', req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Super-admin delete student error:', err);
    res.status(500).json({ error: formatHardDeleteError(err) });
  }
}

async function listCustomDomains(req, res) {
  try {
    const auth = await superAdminAuth.requireSuperAdminPermission(req, res, 'profiles:write');
    if (!auth) return;
    const serviceClient = superAdminAuth.getServiceClient();
    const { data, error } = await serviceClient
      .from('custom_domains')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Super-admin get custom domains error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  deleteExpert,
  deleteInstitution,
  deleteStudent,
  listCustomDomains,
};
