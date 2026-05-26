/**
 * Cross-party privacy: mask institution names for experts/students/public,
 * and mask expert names for institutions/students. Super admin sees full data.
 */

const DISPLAY_INSTITUTION_ANON = 'Verified institution';

function shouldMaskInstitutionName(viewerRole) {
  if (viewerRole === 'super_admin') return false;
  return !viewerRole || viewerRole === 'expert' || viewerRole === 'student';
}

function shouldMaskExpertName(viewerRole) {
  if (viewerRole === 'super_admin') return false;
  return viewerRole === 'institution' || viewerRole === 'student';
}

function expertDisplayLabel(expertId) {
  if (!expertId) return 'Expert';
  const suffix = String(expertId).replace(/-/g, '').slice(-4).toUpperCase();
  return `Expert · ${suffix}`;
}

function maskExpertObject(ex, viewerRole) {
  if (!ex || typeof ex !== 'object') return ex;
  if (!shouldMaskExpertName(viewerRole)) return ex;
  const label = expertDisplayLabel(ex.id);
  return {
    ...ex,
    name: label,
    display_name: label,
    real_name_hidden: true,
  };
}

function maskInstitutionObject(inst, viewerRole) {
  if (!inst || typeof inst !== 'object') return inst;
  if (!shouldMaskInstitutionName(viewerRole)) return inst;
  return {
    ...inst,
    name: DISPLAY_INSTITUTION_ANON,
    display_name: DISPLAY_INSTITUTION_ANON,
    real_name_hidden: true,
  };
}

function maskProjectRow(project, viewerRole) {
  if (!project || typeof project !== 'object') return project;
  const out = { ...project };
  if (out.institutions) {
    out.institutions = maskInstitutionObject(out.institutions, viewerRole);
  }
  return out;
}

function maskProjectsList(rows, viewerRole) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((r) => maskProjectRow(r, viewerRole));
}

function maskExpertsInApplicationsPayload(payload, viewerRole) {
  if (!shouldMaskExpertName(viewerRole)) return payload;
  if (Array.isArray(payload)) {
    return payload.map((row) => {
      if (!row || typeof row !== 'object') return row;
      const next = { ...row };
      if (next.experts) next.experts = maskExpertObject(next.experts, viewerRole);
      return next;
    });
  }
  if (payload && typeof payload === 'object' && Array.isArray(payload.data)) {
    return {
      ...payload,
      data: payload.data.map((row) => {
        const next = { ...row };
        if (next.experts) next.experts = maskExpertObject(next.experts, viewerRole);
        return next;
      }),
    };
  }
  return payload;
}

function maskBookingsPayload(payload, viewerRole, mode) {
  if (!payload || typeof payload !== 'object') return payload;
  const rows = Array.isArray(payload) ? payload : payload.data;
  if (!Array.isArray(rows)) return payload;

  const mapped = rows.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const next = { ...row };
    if (mode === 'institution' && next.experts) {
      next.experts = maskExpertObject(next.experts, viewerRole);
    }
    if (mode === 'expert' && next.institutions) {
      next.institutions = maskInstitutionObject(next.institutions, viewerRole);
    }
    return next;
  });

  if (Array.isArray(payload)) return mapped;
  return { ...payload, data: mapped };
}

function maskApplicationRow(row, viewerRole) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  if (out.experts) out.experts = maskExpertObject(out.experts, viewerRole);
  if (out.projects) out.projects = maskProjectRow(out.projects, viewerRole);
  return out;
}

function maskApplicationsList(rows, viewerRole) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((r) => maskApplicationRow(r, viewerRole));
}

module.exports = {
  DISPLAY_INSTITUTION_ANON,
  shouldMaskInstitutionName,
  shouldMaskExpertName,
  expertDisplayLabel,
  maskExpertObject,
  maskInstitutionObject,
  maskProjectRow,
  maskProjectsList,
  maskExpertsInApplicationsPayload,
  maskBookingsPayload,
  maskApplicationRow,
  maskApplicationsList,
};
