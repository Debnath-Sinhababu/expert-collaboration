/**
 * Super-admin expert create + bulk import (/api/superadmin/*).
 * Mirrors /api/admin/experts and /api/admin/experts/bulk-import behavior; admin routes are not modified here.
 */

const superAdminAuth = require('../auth/superAdminAuth');
const { ensureAuthUserForProfile, authLoginMeta } = require('../auth/profileAuthService');
const ImageUploadService = require('../services/imageUploadService');

const STANDARD_DOMAINS = [
  'Computer Science & IT',
  'Engineering',
  'Business & Management',
  'Finance & Economics',
  'Healthcare & Medicine',
  'Education & Training',
  'Research & Development',
  'Marketing & Sales',
  'Data Science & Analytics',
  'Design & Creative',
  'Law & Legal',
  'Other',
];

function registerSuperAdminExpertMutations(app, { upload, normalizePan, isValidPan }) {
  app.post('/api/superadmin/experts', upload.fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
    { name: 'qualifications', maxCount: 1 },
    { name: 'profile_video', maxCount: 1 },
    { name: 'course_video', maxCount: 1 },
  ]), async (req, res) => {
    try {
      const auth = await superAdminAuth.requireSuperAdmin(req, res);
      if (!auth) return;

      if (!req.body.name || !req.body.email || !req.body.phone) {
        return res.status(400).json({
          error: 'Name, email, and phone are required fields',
        });
      }

      if (!req.files?.profile_photo?.[0]) {
        return res.status(400).json({ error: 'Profile photo is required' });
      }

      const serviceClient = superAdminAuth.getServiceClient();

      let photoData = null;
      let resumeData = null;
      let qualificationsData = null;
      let profileVideoData = null;
      let courseVideoData = null;

      if (req.files?.profile_photo?.[0]) {
        photoData = await ImageUploadService.uploadImage(
          req.files.profile_photo[0].buffer,
          'expert-profiles',
        );
        if (!photoData.success) {
          return res.status(500).json({ error: `Photo upload failed: ${photoData.error}` });
        }
      }

      if (req.files?.resume?.[0]) {
        resumeData = await ImageUploadService.uploadPDF(
          req.files.resume[0].buffer,
          'expert-documents',
        );
        if (!resumeData.success) {
          return res.status(500).json({ error: `Resume upload failed: ${resumeData.error}` });
        }
      }

      if (req.files?.qualifications?.[0]) {
        qualificationsData = await ImageUploadService.uploadPDF(
          req.files.qualifications[0].buffer,
          'expert-documents',
        );
        if (!qualificationsData.success) {
          return res.status(500).json({
            error: `Qualifications upload failed: ${qualificationsData.error}`,
          });
        }
      }

      if (req.files?.profile_video?.[0]) {
        profileVideoData = await ImageUploadService.uploadVideo(
          req.files.profile_video[0].buffer,
          'expert-profile-videos',
          null,
          req.files.profile_video[0].mimetype,
        );
        if (!profileVideoData.success) {
          return res.status(500).json({
            error: `Profile video upload failed: ${profileVideoData.error}`,
          });
        }
      }

      if (req.files?.course_video?.[0]) {
        courseVideoData = await ImageUploadService.uploadVideo(
          req.files.course_video[0].buffer,
          'expert-course-videos',
          null,
          req.files.course_video[0].mimetype,
        );
        if (!courseVideoData.success) {
          return res.status(500).json({
            error: `Course video upload failed: ${courseVideoData.error}`,
          });
        }
      }

      const adminPan = req.body.pan_number;
      let adminPanNormalized = null;
      if (adminPan !== undefined && adminPan !== null && String(adminPan).trim() !== '') {
        adminPanNormalized = normalizePan(adminPan);
        if (!isValidPan(adminPanNormalized)) {
          return res.status(400).json({
            error:
              'Invalid PAN format. Use 10 characters: five letters, four digits, one letter (e.g. ABCDE1234F).',
          });
        }
      }

      const domainName = req.body.domain_expertise;
      const isCustomDomain = domainName && !STANDARD_DOMAINS.includes(domainName);

      if (isCustomDomain && domainName) {
        const subskillsArray = Array.isArray(req.body.subskills)
          ? req.body.subskills
          : (req.body.subskills ? JSON.parse(req.body.subskills) : []);

        const { data: existingDomain } = await serviceClient
          .from('custom_domains')
          .select('*')
          .eq('name', domainName)
          .single();

        if (!existingDomain) {
          await serviceClient
            .from('custom_domains')
            .insert([{ name: domainName, subskills: subskillsArray }]);
        } else {
          const existingSubskills = existingDomain.subskills || [];
          const mergedSubskills = [...new Set([...existingSubskills, ...subskillsArray])];

          await serviceClient
            .from('custom_domains')
            .update({
              subskills: mergedSubskills,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingDomain.id);
        }
      }

      const expertEmail = String(req.body.email).trim();
      const { data: existingByEmail } = await serviceClient
        .from('experts')
        .select('id')
        .eq('email', expertEmail)
        .limit(1);
      if (existingByEmail?.length) {
        return res.status(409).json({
          error: 'An expert with this email already exists.',
        });
      }

      let authResult;
      try {
        authResult = await ensureAuthUserForProfile(serviceClient, {
          email: expertEmail,
          role: 'expert',
          password: req.body.initial_password,
        });
      } catch (authErr) {
        return res.status(400).json({
          error: authErr.message || 'Failed to create login account',
        });
      }

      const expertData = {
        user_id: authResult.userId,
        name: req.body.name,
        email: expertEmail,
        phone: req.body.phone,
        bio: req.body.bio || '',
        photo_url: photoData?.url || null,
        profile_photo_public_id: photoData?.publicId || null,
        profile_photo_thumbnail_url: photoData?.thumbnailUrl || null,
        profile_photo_small_url: photoData?.smallUrl || null,
        qualifications: req.body.qualifications || '',
        qualifications_url: qualificationsData?.url || null,
        qualifications_public_id: qualificationsData?.publicId || null,
        domain_expertise: req.body.domain_expertise ? [req.body.domain_expertise] : [],
        subskills: Array.isArray(req.body.subskills)
          ? req.body.subskills
          : (req.body.subskills ? JSON.parse(req.body.subskills) : []),
        hourly_rate: req.body.hourly_rate ? parseFloat(req.body.hourly_rate) : null,
        resume_url: resumeData?.url || null,
        resume_public_id: resumeData?.publicId || null,
        availability: req.body.availability
          ? (Array.isArray(req.body.availability)
            ? req.body.availability
            : JSON.parse(req.body.availability))
          : [],
        is_verified: true,
        rating: 0.00,
        total_ratings: 0,
        experience_years: req.body.experience_years
          ? parseInt(req.body.experience_years, 10)
          : null,
        linkedin_url: req.body.linkedin_url || '',
        last_working_company: req.body.last_working_company || null,
        current_designation: req.body.current_designation || null,
        expert_types: Array.isArray(req.body.expert_types)
          ? req.body.expert_types
          : (req.body.expert_types ? JSON.parse(req.body.expert_types) : []),
        expert_services: Array.isArray(req.body.expert_services)
          ? req.body.expert_services
          : (req.body.expert_services ? JSON.parse(req.body.expert_services) : []),
        available_on_demand:
          req.body.available_on_demand === 'true' || req.body.available_on_demand === true,
        city: req.body.city || null,
        state: req.body.state || null,
        address:
          req.body.address != null && String(req.body.address).trim() !== ''
            ? String(req.body.address).trim()
            : null,
        pan_number: adminPanNormalized,
        profile_video_url: profileVideoData?.url || null,
        profile_video_public_id: profileVideoData?.publicId || null,
        interested_in_services:
          req.body.interested_in_services === 'true' || req.body.interested_in_services === true,
        course_video_url: courseVideoData?.url || null,
        course_video_public_id: courseVideoData?.publicId || null,
        service_price: req.body.service_price
          ? parseFloat(String(req.body.service_price))
          : null,
      };

      const { data, error } = await serviceClient
        .from('experts')
        .insert([expertData])
        .select();

      if (error) throw error;
      res.status(201).json({
        ...data[0],
        auth: authLoginMeta(authResult, expertEmail),
      });
    } catch (error) {
      console.error('Super-admin create expert error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/superadmin/experts/bulk-import', async (req, res) => {
    try {
      const auth = await superAdminAuth.requireSuperAdmin(req, res);
      if (!auth) return;

      const { spreadsheetId, range, gid, usePublicAccess = false, delayBetweenRows = 500, defaultPassword } = req.body;

      if (!spreadsheetId) {
        return res.status(400).json({ error: 'spreadsheetId is required' });
      }

      const GoogleSheetsService = require('../services/googleSheetsService');
      const BulkImportService = require('../services/bulkImportService');

      let rows;
      try {
        if (usePublicAccess) {
          rows = await GoogleSheetsService.readPublicSheet(spreadsheetId, range, gid);
        } else {
          rows = await GoogleSheetsService.readSheet(spreadsheetId, range);
        }
      } catch (error) {
        return res.status(400).json({
          error: `Failed to read Google Sheet: ${error.message}`,
        });
      }

      if (!rows || rows.length === 0) {
        return res.status(400).json({ error: 'No data found in the sheet' });
      }

      const results = await BulkImportService.processBulkImport(rows, {
        delayBetweenRows: parseInt(delayBetweenRows, 10) || 500,
        defaultPassword,
      });

      res.json({
        success: true,
        summary: {
          total: results.total,
          successful: results.successful,
          failed: results.failed,
        },
        details: results.details.map(detail => ({
          rowNumber: detail.rowNumber,
          success: detail.success,
          expertId: detail.expert?.id || null,
          expertName: detail.expert?.name || null,
          errors: detail.errors,
        })),
      });
    } catch (error) {
      console.error('Super-admin bulk import error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/superadmin/students/bulk-import', async (req, res) => {
    try {
      const auth = await superAdminAuth.requireSuperAdmin(req, res);
      if (!auth) return;

      const { spreadsheetId, range, gid, usePublicAccess = false, delayBetweenRows = 500, defaultPassword } = req.body;

      if (!spreadsheetId) {
        return res.status(400).json({ error: 'spreadsheetId is required' });
      }

      const GoogleSheetsService = require('../services/googleSheetsService');
      const BulkImportService = require('../services/bulkImportService');

      let rows;
      try {
        if (usePublicAccess) {
          rows = await GoogleSheetsService.readPublicSheet(spreadsheetId, range, gid);
        } else {
          rows = await GoogleSheetsService.readSheet(spreadsheetId, range);
        }
      } catch (error) {
        return res.status(400).json({
          error: `Failed to read Google Sheet: ${error.message}`,
        });
      }

      if (!rows || rows.length === 0) {
        return res.status(400).json({ error: 'No data found in the sheet' });
      }

      const results = await BulkImportService.processStudentBulkImport(rows, {
        delayBetweenRows: parseInt(delayBetweenRows, 10) || 500,
        defaultPassword,
      });

      res.json({
        success: true,
        summary: {
          total: results.total,
          successful: results.successful,
          failed: results.failed,
        },
        details: results.details.map((detail) => ({
          rowNumber: detail.rowNumber,
          success: detail.success,
          studentId: detail.student?.id || null,
          studentName: detail.student?.name || null,
          errors: detail.errors,
        })),
      });
    } catch (error) {
      console.error('Super-admin student bulk import error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = { registerSuperAdminExpertMutations };
