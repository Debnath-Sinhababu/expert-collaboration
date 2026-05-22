const ImageUploadService = require('./imageUploadService');
const { createClient } = require('@supabase/supabase-js');
const { ensureAuthUserForProfile } = require('../auth/profileAuthService');
const https = require('https');
const http = require('http');

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function normalizeKey(k) {
  return (k || '').trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/_+/g, '_');
}

function findValueInRow(row, keys, targetNormalized) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') {
      return row[key];
    }
  }
  if (targetNormalized) {
    for (const rowKey of Object.keys(row)) {
      if (rowKey === '_rowNumber') continue;
      if (normalizeKey(rowKey) === targetNormalized && row[rowKey] !== undefined && row[rowKey] !== '') {
        return row[rowKey];
      }
    }
  }
  return null;
}

class BulkImportService {
  /**
   * Download image from URL and return buffer
   * @param {string} url - Image URL
   * @returns {Promise<Buffer>} Image buffer
   */
  static async downloadImage(url) {
    return new Promise((resolve, reject) => {
      if (!url || !url.startsWith('http')) {
        reject(new Error('Invalid URL'));
        return;
      }

      const client = url.startsWith('https') ? https : http;
      
      client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * Download PDF from URL and return buffer
   * @param {string} url - PDF URL
   * @returns {Promise<Buffer>} PDF buffer
   */
  static async downloadPDF(url) {
    return new Promise((resolve, reject) => {
      if (!url || !url.startsWith('http')) {
        reject(new Error('Invalid URL'));
        return;
      }

      const client = url.startsWith('https') ? https : http;
      
      client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download PDF: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * Map Google Sheet row to expert data structure
   * @param {Object} row - Row from Google Sheet
   * @returns {Object} Expert data object
   */
  static mapRowToExpertData(row) {
    // Map common column names to expert fields
    const map = {
      name: ['name', 'expert_name', 'full_name'],
      email: ['email', 'email_address'],
      phone: ['phone', 'phone_number', 'mobile', 'contact'],
      bio: ['bio', 'biography', 'about', 'description'],
      domain_expertise: ['domain', 'domain_expertise', 'expertise_domain', 'field'],
      subskills: ['subskills', 'skills', 'specializations', 'specializations/skills'],
      hourly_rate: ['hourly_rate', 'rate', 'hourly_rate_(inr)', 'price'],
      experience_years: ['experience', 'experience_years', 'years_of_experience', 'yoe'],
      qualifications: ['qualifications', 'education', 'degree', 'qualification'],
      linkedin_url: ['linkedin', 'linkedin_url', 'linkedin_profile'],
      last_working_company: ['last_working_company', 'company', 'last_company', 'current_company', 'organization'],
      current_designation: ['current_designation', 'designation', 'job_title', 'role', 'current_role', 'position'],
      expert_types: ['expert_types', 'type', 'expert_type'],
      available_on_demand: ['available_on_demand', 'on_demand', 'available'],
      profile_photo_url: ['profile_photo_url', 'photo', 'photo_url', 'profile_photo', 'image', 'profile_image', 'photo_url_(google_drive_link)'],
      resume_url: ['resume_url', 'resume', 'cv', 'cv_url', 'resume_pdf'],
      qualifications_url: ['qualifications_url', 'qualifications_pdf', 'certificates']
    };

    const expertData = {};

    expertData.name = findValueInRow(row, map.name, 'name');
    expertData.email = findValueInRow(row, map.email, 'email');
    expertData.phone = findValueInRow(row, map.phone, 'phone');
    expertData.bio = findValueInRow(row, map.bio, 'bio') || '';
    expertData.domain_expertise = findValueInRow(row, map.domain_expertise, 'domain_expertise');
    expertData.subskills = findValueInRow(row, map.subskills, 'subskills');
    expertData.hourly_rate = findValueInRow(row, map.hourly_rate, 'hourly_rate');
    expertData.experience_years = findValueInRow(row, map.experience_years, 'experience_years');
    expertData.qualifications = findValueInRow(row, map.qualifications, 'qualifications') || '';
    expertData.linkedin_url = findValueInRow(row, map.linkedin_url, 'linkedin_url') || '';
    expertData.last_working_company = findValueInRow(row, map.last_working_company, 'last_working_company');
    expertData.current_designation = findValueInRow(row, map.current_designation, 'current_designation');
    expertData.expert_types = findValueInRow(row, map.expert_types, 'expert_types');
    expertData.available_on_demand = findValueInRow(row, map.available_on_demand, 'available_on_demand');
    expertData.profile_photo_url = findValueInRow(row, map.profile_photo_url, 'profile_photo_url');
    expertData.resume_url = findValueInRow(row, map.resume_url, 'resume_url');
    expertData.qualifications_url = findValueInRow(row, map.qualifications_url, 'qualifications_url');

    // Parse arrays (comma-separated values)
    if (expertData.subskills && typeof expertData.subskills === 'string') {
      expertData.subskills = expertData.subskills.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (expertData.expert_types && typeof expertData.expert_types === 'string') {
      expertData.expert_types = expertData.expert_types.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Parse numbers
    if (expertData.hourly_rate) {
      expertData.hourly_rate = parseFloat(expertData.hourly_rate.toString().replace(/[^0-9.]/g, '')) || null;
    }
    if (expertData.experience_years) {
      expertData.experience_years = parseInt(expertData.experience_years.toString().replace(/[^0-9]/g, '')) || null;
    }

    // Parse boolean
    if (expertData.available_on_demand) {
      const val = expertData.available_on_demand.toString().toLowerCase();
      expertData.available_on_demand = val === 'true' || val === 'yes' || val === '1';
    } else {
      expertData.available_on_demand = false;
    }

    return expertData;
  }

  /**
   * Process and create expert from row data
   * @param {Object} row - Row data from Google Sheet
   * @param {Object} options - Options for processing
   * @returns {Promise<Object>} Result object with success status and data/error
   */
  static async processExpertRow(row, options = {}) {
    const result = {
      success: false,
      rowNumber: row._rowNumber || 'unknown',
      expert: null,
      errors: []
    };

    try {
      // Map row to expert data
      const expertData = this.mapRowToExpertData(row);

      // Validate required fields
      if (!expertData.name) {
        result.errors.push('Name is required');
      }
      if (!expertData.email) {
        result.errors.push('Email is required');
      }
      if (!expertData.phone) {
        result.errors.push('Phone is required');
      }
      if (!expertData.domain_expertise) {
        result.errors.push('Domain expertise is required');
      }

      if (result.errors.length > 0) {
        return result;
      }

      // Download and upload profile photo (optional for bulk import)
      let photoData = null;
      if (expertData.profile_photo_url) {
        try {
          const imageBuffer = await this.downloadImage(expertData.profile_photo_url);
          photoData = await ImageUploadService.uploadImage(imageBuffer, 'expert-profiles');
          if (!photoData.success) {
            result.errors.push(`Photo upload failed: ${photoData.error}`);
          }
        } catch (error) {
          result.errors.push(`Photo download/upload failed: ${error.message}`);
        }
      }

      // Download and upload resume (optional)
      let resumeData = null;
      if (expertData.resume_url) {
        try {
          const pdfBuffer = await this.downloadPDF(expertData.resume_url);
          resumeData = await ImageUploadService.uploadPDF(pdfBuffer, 'expert-documents');
          if (!resumeData.success) {
            result.errors.push(`Resume upload failed: ${resumeData.error}`);
          }
        } catch (error) {
          result.errors.push(`Resume download/upload failed: ${error.message}`);
        }
      }

      // Download and upload qualifications (optional)
      let qualificationsData = null;
      if (expertData.qualifications_url) {
        try {
          const pdfBuffer = await this.downloadPDF(expertData.qualifications_url);
          qualificationsData = await ImageUploadService.uploadPDF(pdfBuffer, 'expert-documents');
          if (!qualificationsData.success) {
            result.errors.push(`Qualifications upload failed: ${qualificationsData.error}`);
          }
        } catch (error) {
          result.errors.push(`Qualifications download/upload failed: ${error.message}`);
        }
      }

      // Check if domain is custom
      const STANDARD_DOMAINS = [
        "Computer Science & IT", "Engineering", "Business & Management", 
        "Finance & Economics", "Healthcare & Medicine", "Education & Training",
        "Research & Development", "Marketing & Sales", "Data Science & Analytics",
        "Design & Creative", "Law & Legal", "Other"
      ];
      const isCustomDomain = expertData.domain_expertise && !STANDARD_DOMAINS.includes(expertData.domain_expertise);

      const serviceClient = getServiceClient();

      const { data: existingExpert } = await serviceClient
        .from('experts')
        .select('id')
        .eq('email', String(expertData.email).trim())
        .limit(1);
      if (existingExpert?.length) {
        result.errors.push('An expert with this email already exists');
        return result;
      }

      let userId;
      try {
        const authResult = await ensureAuthUserForProfile(serviceClient, {
          email: expertData.email,
          role: 'expert',
          password: options.defaultPassword,
        });
        userId = authResult.userId;
      } catch (authErr) {
        result.errors.push(`Auth user: ${authErr.message || authErr}`);
        return result;
      }

      // Handle custom domain
      if (isCustomDomain && expertData.domain_expertise) {
        const subskillsArray = Array.isArray(expertData.subskills) ? expertData.subskills : [];
        
        const { data: existingDomain } = await serviceClient
          .from('custom_domains')
          .select('*')
          .eq('name', expertData.domain_expertise)
          .single();
        
        if (!existingDomain) {
          await serviceClient
            .from('custom_domains')
            .insert([{
              name: expertData.domain_expertise,
              subskills: subskillsArray
            }]);
        } else {
          const existingSubskills = existingDomain.subskills || [];
          const mergedSubskills = [...new Set([...existingSubskills, ...subskillsArray])];
          
          await serviceClient
            .from('custom_domains')
            .update({ 
              subskills: mergedSubskills,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingDomain.id);
        }
      }

      // Prepare expert data for database
      const dbExpertData = {
        user_id: userId,
        name: expertData.name,
        email: expertData.email,
        phone: expertData.phone,
        bio: expertData.bio || '',
        photo_url: photoData?.url || null,
        profile_photo_public_id: photoData?.publicId || null,
        profile_photo_thumbnail_url: photoData?.thumbnailUrl || null,
        profile_photo_small_url: photoData?.smallUrl || null,
        qualifications: expertData.qualifications || '',
        qualifications_url: qualificationsData?.url || null,
        qualifications_public_id: qualificationsData?.publicId || null,
        domain_expertise: expertData.domain_expertise ? [expertData.domain_expertise] : [],
        subskills: Array.isArray(expertData.subskills) ? expertData.subskills : [],
        hourly_rate: expertData.hourly_rate || null,
        resume_url: resumeData?.url || null,
        resume_public_id: resumeData?.publicId || null,
        availability: [],
        is_verified: true,
        rating: 0.00,
        total_ratings: 0,
        experience_years: expertData.experience_years || null,
        linkedin_url: expertData.linkedin_url || '',
        last_working_company: expertData.last_working_company || null,
        current_designation: expertData.current_designation || null,
        expert_types: Array.isArray(expertData.expert_types) ? expertData.expert_types : [],
        available_on_demand: expertData.available_on_demand || false
      };

      // Insert expert
      const { data, error } = await serviceClient
        .from('experts')
        .insert([dbExpertData])
        .select();

      if (error) {
        result.errors.push(`Database error: ${error.message}`);
        return result;
      }

      result.success = true;
      result.expert = data[0];
      return result;
    } catch (error) {
      result.errors.push(`Processing error: ${error.message}`);
      return result;
    }
  }

  /**
   * Process multiple expert rows
   * @param {Array} rows - Array of row data
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Summary of import results
   */
  static async processBulkImport(rows, options = {}) {
    const results = {
      total: rows.length,
      successful: 0,
      failed: 0,
      details: []
    };

    // Process rows sequentially to avoid overwhelming the system
    for (const row of rows) {
      const result = await this.processExpertRow(row, options);
      results.details.push(result);
      
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }

      // Small delay to avoid rate limiting
      if (options.delayBetweenRows) {
        await new Promise(resolve => setTimeout(resolve, options.delayBetweenRows));
      }
    }

    return results;
  }

  /**
   * Map Google Sheet row to student data structure
   */
  static mapRowToStudentData(row) {
    const map = {
      name: ['name', 'student_name', 'full_name'],
      email: ['email', 'email_address'],
      phone: ['phone', 'phone_number', 'mobile', 'contact'],
      degree: ['degree', 'course', 'program'],
      year: ['year', 'academic_year', 'study_year'],
      specialization: ['specialization', 'major', 'branch'],
      city: ['city'],
      state: ['state'],
      institution_id: ['institution_id', 'institution_uuid'],
      institution_email: ['institution_email', 'college_email', 'institution_contact_email'],
      institution_name: ['institution_name', 'college', 'university', 'institution'],
      skills: ['skills', 'skill_list'],
      linkedin_url: ['linkedin', 'linkedin_url'],
      github_url: ['github', 'github_url'],
      portfolio_url: ['portfolio', 'portfolio_url'],
      resume_url: ['resume_url', 'resume', 'cv', 'cv_url'],
      profile_photo_url: ['profile_photo_url', 'photo', 'photo_url', 'profile_photo'],
    };

    const studentData = {};
    studentData.name = findValueInRow(row, map.name, 'name');
    studentData.email = findValueInRow(row, map.email, 'email');
    studentData.phone = findValueInRow(row, map.phone, 'phone');
    studentData.degree = findValueInRow(row, map.degree, 'degree');
    studentData.year = findValueInRow(row, map.year, 'year');
    studentData.specialization = findValueInRow(row, map.specialization, 'specialization');
    studentData.city = findValueInRow(row, map.city, 'city');
    studentData.state = findValueInRow(row, map.state, 'state');
    studentData.institution_id = findValueInRow(row, map.institution_id, 'institution_id');
    studentData.institution_email = findValueInRow(row, map.institution_email, 'institution_email');
    studentData.institution_name = findValueInRow(row, map.institution_name, 'institution_name');
    studentData.skills = findValueInRow(row, map.skills, 'skills');
    studentData.linkedin_url = findValueInRow(row, map.linkedin_url, 'linkedin_url') || '';
    studentData.github_url = findValueInRow(row, map.github_url, 'github_url') || '';
    studentData.portfolio_url = findValueInRow(row, map.portfolio_url, 'portfolio_url') || '';
    studentData.resume_url = findValueInRow(row, map.resume_url, 'resume_url');
    studentData.profile_photo_url = findValueInRow(row, map.profile_photo_url, 'profile_photo_url');

    if (studentData.skills && typeof studentData.skills === 'string') {
      studentData.skills = studentData.skills.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      studentData.skills = [];
    }

    return studentData;
  }

  static async resolveInstitutionId(serviceClient, studentData) {
    if (studentData.institution_id) {
      const id = String(studentData.institution_id).trim();
      const { data } = await serviceClient.from('institutions').select('id').eq('id', id).maybeSingle();
      if (data?.id) return data.id;
    }
    if (studentData.institution_email) {
      const email = String(studentData.institution_email).trim();
      const { data } = await serviceClient
        .from('institutions')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (data?.id) return data.id;
    }
    if (studentData.institution_name) {
      const name = String(studentData.institution_name).trim();
      const { data: instRows } = await serviceClient
        .from('institutions')
        .select('id')
        .ilike('name', name)
        .limit(1);
      if (instRows?.[0]?.id) return instRows[0].id;
    }
    return null;
  }

  static async processStudentRow(row, options = {}) {
    const result = {
      success: false,
      rowNumber: row._rowNumber || 'unknown',
      student: null,
      errors: [],
    };

    try {
      const studentData = this.mapRowToStudentData(row);

      if (!studentData.name) result.errors.push('Name is required');
      if (!studentData.email) result.errors.push('Email is required');
      if (result.errors.length > 0) return result;

      const serviceClient = getServiceClient();

      const { data: existingStudent } = await serviceClient
        .from('site_students')
        .select('id')
        .eq('email', String(studentData.email).trim())
        .limit(1);
      if (existingStudent?.length) {
        result.errors.push('A student with this email already exists');
        return result;
      }

      let userId;
      try {
        const authResult = await ensureAuthUserForProfile(serviceClient, {
          email: studentData.email,
          role: 'student',
          password: options.defaultPassword,
        });
        userId = authResult.userId;
      } catch (authErr) {
        result.errors.push(`Auth user: ${authErr.message || authErr}`);
        return result;
      }

      let photoData = null;
      if (studentData.profile_photo_url) {
        try {
          const imageBuffer = await this.downloadImage(studentData.profile_photo_url);
          photoData = await ImageUploadService.uploadImage(imageBuffer, 'student-profiles');
          if (!photoData.success) {
            result.errors.push(`Photo upload failed: ${photoData.error}`);
          }
        } catch (error) {
          result.errors.push(`Photo download/upload failed: ${error.message}`);
        }
      }

      let resumeData = null;
      if (studentData.resume_url) {
        try {
          const pdfBuffer = await this.downloadPDF(studentData.resume_url);
          resumeData = await ImageUploadService.uploadPDF(pdfBuffer, 'student-resumes');
          if (!resumeData.success) {
            result.errors.push(`Resume upload failed: ${resumeData.error}`);
          }
        } catch (error) {
          result.errors.push(`Resume download/upload failed: ${error.message}`);
        }
      }

      const institutionId = await this.resolveInstitutionId(serviceClient, studentData);

      const dbStudentData = {
        user_id: userId,
        name: studentData.name,
        email: String(studentData.email).trim(),
        phone: studentData.phone || null,
        institution_id: institutionId,
        degree: studentData.degree || null,
        year: studentData.year || null,
        specialization: studentData.specialization || null,
        city: studentData.city || null,
        state: studentData.state || null,
        skills: studentData.skills,
        linkedin_url: studentData.linkedin_url || null,
        github_url: studentData.github_url || null,
        portfolio_url: studentData.portfolio_url || null,
        resume_url: resumeData?.url || null,
        resume_public_id: resumeData?.publicId || null,
        photo_url: photoData?.url || null,
        profile_photo_public_id: photoData?.publicId || null,
        profile_photo_thumbnail_url: photoData?.thumbnailUrl || null,
        profile_photo_small_url: photoData?.smallUrl || null,
      };

      const { data, error } = await serviceClient
        .from('site_students')
        .insert([dbStudentData])
        .select();

      if (error) {
        result.errors.push(`Database error: ${error.message}`);
        return result;
      }

      result.success = true;
      result.student = data[0];
      return result;
    } catch (error) {
      result.errors.push(`Processing error: ${error.message}`);
      return result;
    }
  }

  static async processStudentBulkImport(rows, options = {}) {
    const results = {
      total: rows.length,
      successful: 0,
      failed: 0,
      details: [],
    };

    for (const row of rows) {
      const result = await this.processStudentRow(row, options);
      results.details.push(result);
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }
      if (options.delayBetweenRows) {
        await new Promise((resolve) => setTimeout(resolve, options.delayBetweenRows));
      }
    }

    return results;
  }
}

module.exports = BulkImportService;
