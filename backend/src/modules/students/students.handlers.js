/**
 * Portal student (site_students) handlers extracted from server.js.
 */
const { createClient } = require('@supabase/supabase-js');
const ImageUploadService = require('../../../services/imageUploadService');
const superAdminAuth = require('../../../auth/superAdminAuth');
const { ensureAuthUserForProfile, authLoginMeta } = require('../../../auth/profileAuthService');

const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

async function me(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabaseClient
      .from('site_students')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Student profile not found' });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Create student profile
async function create(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const bearerToken = authHeader.substring(7);

    const { user: studentUser, role: studentRole } = await superAdminAuth.getUserRoleFromRequest(req);

    let supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${bearerToken}` } } },
    );

    let userId;
    let studentAuthMeta = null;
    if (studentRole === 'super_admin' && studentUser) {
      supabaseClient = superAdminAuth.getServiceClient();
      const rawUid = req.body.user_id;
      userId = (typeof rawUid === 'string' && rawUid.trim() !== '')
        ? rawUid.trim()
        : (rawUid && String(rawUid).trim() !== '' ? String(rawUid).trim() : null);
    } else {
      const { data: userData } = await supabaseClient.auth.getUser();
      userId = userData?.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body || {};

    if (studentRole === 'super_admin' && studentUser && !userId) {
      const studentEmail = String(body.email || '').trim();
      if (!studentEmail) {
        return res.status(400).json({ error: 'Student email is required.' });
      }
      const { data: existingStudent } = await supabaseClient
        .from('site_students')
        .select('id')
        .eq('email', studentEmail)
        .limit(1);
      if (existingStudent?.length) {
        return res.status(409).json({ error: 'A student with this email already exists.' });
      }
      try {
        const authResult = await ensureAuthUserForProfile(supabaseClient, {
          email: studentEmail,
          role: 'student',
          password: body.initial_password,
        });
        userId = authResult.userId;
        studentAuthMeta = authLoginMeta(authResult, studentEmail);
      } catch (authErr) {
        return res.status(400).json({
          error: authErr.message || 'Failed to create login account',
        });
      }
    }

    // If multipart, files will be present; handle resume upload
    let resumeUrl = null;
    let resumePublicId = null;
    let photoData = null;
    if (req.files?.resume?.[0]) {
      const resumeData = await ImageUploadService.uploadPDF(
        req.files.resume[0].buffer,
        'student-resumes'
      );
      if (!resumeData.success) {
        return res.status(500).json({ error: `Resume upload failed: ${resumeData.error}` });
      }
      resumeUrl = resumeData.url;
      resumePublicId = resumeData.publicId;
    }

    // Handle optional profile photo upload
    if (req.files?.profile_photo?.[0]) {
      photoData = await ImageUploadService.uploadImage(
        req.files.profile_photo[0].buffer,
        'student-profiles'
      );
      if (!photoData.success) {
        return res.status(500).json({ error: `Photo upload failed: ${photoData.error}` });
      }
    }

    // Handle optional documents upload
    let documentsUrl = null;
    let documentsPublicId = null;
    if (req.files?.documents?.[0]) {
      const documentsData = await ImageUploadService.uploadPDF(
        req.files.documents[0].buffer,
        'student-documents'
      );
      if (!documentsData.success) {
        return res.status(500).json({ error: `Documents upload failed: ${documentsData.error}` });
      }
      documentsUrl = documentsData.url;
      documentsPublicId = documentsData.publicId;
    }

    const payload = {
      user_id: userId,
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      institution_id: body.institution_id || null,
      degree: body.degree || null,
      year: body.year || null,
      specialization: body.specialization || null,
      date_of_birth: body.date_of_birth || null,
      gender: body.gender || null,
      city: body.city || null,
      state: body.state || null,
      address: body.address || null,
      about: body.about || null,
      availability: body.availability || null,
      preferred_engagement: body.preferred_engagement || null,
      preferred_work_mode: body.preferred_work_mode || null,
      education_start_date: body.education_start_date || null,
      education_end_date: (body.currently_studying === 'true' || body.currently_studying === true) ? null : (body.education_end_date || null),
      currently_studying: (body.currently_studying === 'true' || body.currently_studying === true),
      skills: Array.isArray(body.skills)
        ? body.skills
        : (typeof body.skills === 'string' && body.skills.trim().length > 0
            ? body.skills.split(',').map((s) => s.trim()).filter(Boolean)
            : []),
      resume_url: resumeUrl || body.resume_url || null,
      resume_public_id: resumePublicId || null,
      linkedin_url: body.linkedin_url || null,
      github_url: body.github_url || null,
      portfolio_url: body.portfolio_url || null,
      photo_url: photoData?.url || null,
      profile_photo_public_id: photoData?.publicId || null,
      profile_photo_thumbnail_url: photoData?.thumbnailUrl || null,
      profile_photo_small_url: photoData?.smallUrl || null,
      class_10th_percentage: body.class_10th_percentage ? parseFloat(body.class_10th_percentage) : null,
      class_12th_percentage: body.class_12th_percentage ? parseFloat(body.class_12th_percentage) : null,
      cgpa_percentage: body.cgpa_percentage ? parseFloat(body.cgpa_percentage) : null,
      documents_url: documentsUrl || null,
      documents_public_id: documentsPublicId || null,
    };

    const { data, error } = await supabaseClient
      .from('site_students')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(studentAuthMeta ? { ...data, auth: studentAuthMeta } : data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update student profile
async function update(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body || {};

    // Fetch current profile to manage resume replacement if needed
    const { data: currentProfile, error: currentErr } = await supabaseClient
      .from('site_students')
      .select('id, user_id, resume_public_id, profile_photo_public_id, photo_url, documents_public_id')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (currentErr) throw currentErr;
    if (!currentProfile) return res.status(404).json({ error: 'Student profile not found' });

    let resumeUrl = (typeof body.resume_url !== 'undefined' && body.resume_url !== null && body.resume_url !== '')
      ? body.resume_url
      : currentProfile.resume_url || null;
    let resumePublicId = body.resume_public_id || currentProfile.resume_public_id || null;
    let photoUrl = currentProfile.photo_url || null;
    let photoPublicId = currentProfile.profile_photo_public_id || null;
    let documentsUrl = (typeof body.documents_url !== 'undefined' && body.documents_url !== null && body.documents_url !== '')
      ? body.documents_url
      : currentProfile.documents_url || null;
    let documentsPublicId = body.documents_public_id || currentProfile.documents_public_id || null;
    // If new resume file uploaded, replace existing
    if (req.files?.resume?.[0]) {
      if (currentProfile.resume_public_id) {
        try { await ImageUploadService.deleteImage(currentProfile.resume_public_id); } catch (_) {}
      }
      const resumeData = await ImageUploadService.uploadPDF(
        req.files.resume[0].buffer,
        'student-resumes'
      );
      if (!resumeData.success) {
        return res.status(500).json({ error: `Resume upload failed: ${resumeData.error}` });
      }
      resumeUrl = resumeData.url;
      resumePublicId = resumeData.publicId;
    }

    // If new profile photo uploaded, replace existing
    if (req.files?.profile_photo?.[0]) {
      if (currentProfile.profile_photo_public_id) {
        try { await ImageUploadService.deleteImage(currentProfile.profile_photo_public_id); } catch (_) {}
      }
      const uploaded = await ImageUploadService.uploadImage(
        req.files.profile_photo[0].buffer,
        'student-profiles'
      );
      if (!uploaded.success) {
        return res.status(500).json({ error: `Photo upload failed: ${uploaded.error}` });
      }
      photoUrl = uploaded.url;
      photoPublicId = uploaded.publicId;
      var photoThumb = uploaded.thumbnailUrl;
      var photoSmall = uploaded.smallUrl;
    }

    // If new documents file uploaded, replace existing
    if (req.files?.documents?.[0]) {
      if (currentProfile.documents_public_id) {
        try { await ImageUploadService.deleteImage(currentProfile.documents_public_id); } catch (_) {}
      }
      const documentsData = await ImageUploadService.uploadPDF(
        req.files.documents[0].buffer,
        'student-documents'
      );
      if (!documentsData.success) {
        return res.status(500).json({ error: `Documents upload failed: ${documentsData.error}` });
      }
      documentsUrl = documentsData.url;
      documentsPublicId = documentsData.publicId;
    }

    const updates = {
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      institution_id: body.institution_id || null,
      degree: body.degree || null,
      year: body.year || null,
      specialization: body.specialization || null,
      date_of_birth: body.date_of_birth || null,
      gender: body.gender || null,
      city: body.city || null,
      state: body.state || null,
      address: body.address || null,
      about: body.about || null,
      availability: body.availability || null,
      preferred_engagement: body.preferred_engagement || null,
      preferred_work_mode: body.preferred_work_mode || null,
      education_start_date: body.education_start_date || null,
      education_end_date: (body.currently_studying === 'true' || body.currently_studying === true) ? null : (body.education_end_date || null),
      currently_studying: (body.currently_studying === 'true' || body.currently_studying === true),
      skills: Array.isArray(body.skills)
        ? body.skills
        : (typeof body.skills === 'string' && body.skills.trim().length > 0
            ? body.skills.split(',').map((s) => s.trim()).filter(Boolean)
            : []),
      resume_url: resumeUrl || null,
      resume_public_id: resumePublicId || null,
      linkedin_url: body.linkedin_url || null,
      github_url: body.github_url || null,
      portfolio_url: body.portfolio_url || null,
      photo_url: photoUrl,
      profile_photo_public_id: photoPublicId,
      profile_photo_thumbnail_url: typeof photoThumb !== 'undefined' ? photoThumb : currentProfile.profile_photo_thumbnail_url,
      profile_photo_small_url: typeof photoSmall !== 'undefined' ? photoSmall : currentProfile.profile_photo_small_url,
      class_10th_percentage: body.class_10th_percentage ? parseFloat(body.class_10th_percentage) : null,
      class_12th_percentage: body.class_12th_percentage ? parseFloat(body.class_12th_percentage) : null,
      cgpa_percentage: body.cgpa_percentage ? parseFloat(body.cgpa_percentage) : null,
      documents_url: documentsUrl,
      documents_public_id: documentsPublicId,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
      .from('site_students')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get featured/public students for showcase (no auth required)
async function listFeatured(req, res) {
  try {
    const { limit = 8 } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 8, 20);

    const { data, error } = await supabase
      .from('site_students')
      .select(`
        id,
        name,
        degree,
        specialization,
        skills,
        photo_url,
        profile_photo_small_url,
        city,
        state,
        institution_id,
        institutions:institution_id (
          id,
          name,
          city,
          state
        )
      `)
      .not('photo_url', 'is', null)
      .not('name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limitNum);

    if (error) throw error;
    res.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Featured students error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Super-admin: paginated directory of site_students (not under /api/superadmin)
async function list(req, res) {
  try {
    const auth = await superAdminAuth.requireSuperAdmin(req, res);
    if (!auth) return;

    const serviceClient = superAdminAuth.getServiceClient();
    const { page = 1, limit = 12, search = '' } = req.query;
    const offset = (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10);
    const limitNum = parseInt(String(limit), 10) || 12;

    let query = serviceClient
      .from('site_students')
      .select(`
        *,
        institutions:institution_id (
          id,
          name,
          city,
          state
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,degree.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('GET /api/students list error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  me,
  create,
  update,
  listFeatured,
  list,
};
