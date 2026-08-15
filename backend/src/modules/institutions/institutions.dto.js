function parseListQuery(query = {}) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.max(1, parseInt(query.limit || '10', 10) || 10);
  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search: String(query.search || '').trim(),
    type: String(query.type || '').trim(),
    exclude_type: String(query.exclude_type || '').trim(),
  };
}

function parsePreferredEngagements(value) {
  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const val = value.trim();
    if (!val) return null;
    if (val.startsWith('[')) {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed)
          ? parsed.map((s) => String(s).trim()).filter(Boolean)
          : null;
      } catch {
        return val.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return null;
}

function parseBooleanish(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === '1' || value === 'yes';
}

function buildCreatePayload(body = {}, { authenticatedUserId, logoUrl }) {
  const institutionEmail = String(body.contact_email || body.email || '').trim();
  return {
    institutionEmail,
    institutionData: {
      user_id: authenticatedUserId,
      name: body.name,
      email: institutionEmail,
      type: body.type,
      description: body.description,
      logo_url: logoUrl,
      website_url: body.website_url,
      address: body.address,
      city: body.city,
      state: body.state,
      country: body.country || 'India',
      is_verified: true,
      rating: body.rating || 0.0,
      total_ratings: body.total_projects || 0,
      phone: body.contact_phone || body.phone,
      contact_person: body.contact_person,
      pincode: body.pincode || null,
      student_count: body.student_count || null,
      established_year: body.established_year || null,
      accreditation: body.accreditation || null,
      gstin: body.gstin || null,
      pan: body.pan || null,
      cin: body.cin || null,
      industry: body.industry || null,
      company_size: body.company_size || null,
      requires_po: parseBooleanish(body.requires_po, false),
      nda_required: parseBooleanish(body.nda_required, false),
      preferred_engagements: parsePreferredEngagements(body.preferred_engagements),
      work_mode_preference: body.work_mode_preference || null,
    },
  };
}

function normalizeUpdateBody(body = {}) {
  const updateData = { ...body };
  if (updateData.company_size === '') {
    updateData.company_size = null;
  }
  if (typeof updateData.preferred_engagements === 'string') {
    updateData.preferred_engagements = parsePreferredEngagements(updateData.preferred_engagements);
  }
  return updateData;
}

module.exports = {
  parseListQuery,
  parsePreferredEngagements,
  buildCreatePayload,
  normalizeUpdateBody,
};
