const ImageUploadService = require('./imageUploadService');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

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
      last_working_company: ['company', 'last_company', 'current_company', 'organization'],
      current_designation: ['current_designation', 'designation', 'job_title', 'role', 'current_role', 'position'],
      expert_types: ['expert_types', 'type', 'expert_type'],
      available_on_demand: ['available_on_demand', 'on_demand', 'available'],
      profile_photo_url: ['photo', 'photo_url', 'profile_photo', 'image', 'profile_image', 'photo_url_(google_drive_link)'],
      resume_url: ['resume', 'resume_url', 'cv', 'cv_url', 'resume_pdf'],
      qualifications_url: ['qualifications_url', 'qualifications_pdf', 'certificates']
    };

    const expertData = {};

    // Helper to find value by multiple possible keys
    const findValue = (keys) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== '') {
          return row[key];
        }
      }
      return null;
    };

    expertData.name = findValue(map.name);
    expertData.email = findValue(map.email);
    expertData.phone = findValue(map.phone);
    expertData.bio = findValue(map.bio) || '';
    expertData.domain_expertise = findValue(map.domain_expertise);
    expertData.subskills = findValue(map.subskills);
    expertData.hourly_rate = findValue(map.hourly_rate);
    expertData.experience_years = findValue(map.experience_years);
    expertData.qualifications = findValue(map.qualifications) || '';
    expertData.linkedin_url = findValue(map.linkedin_url) || '';
    expertData.last_working_company = findValue(map.last_working_company);
    expertData.expert_types = findValue(map.expert_types);
    expertData.available_on_demand = findValue(map.available_on_demand);
    expertData.profile_photo_url = findValue(map.profile_photo_url);
    expertData.resume_url = findValue(map.resume_url);
    expertData.qualifications_url = findValue(map.qualifications_url);

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

      // Use service role client (has auth admin access)
      const serviceClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Create or get Supabase auth user (email verified, default password)
      const defaultPassword = options.defaultPassword || 'ExpertCollaboration@123';
      let userId = null;

      const { data: createUserData, error: createUserError } = await serviceClient.auth.admin.createUser({
        email: expertData.email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { role: 'expert' }
      });

      if (createUserError) {
        // User may already exist - try to get existing user by listing
        if (createUserError.message?.includes('already') || createUserError.message?.includes('registered')) {
          const { data: listData } = await serviceClient.auth.admin.listUsers({ perPage: 1000, page: 1 });
          const existingUser = listData?.users?.find(u => u.email?.toLowerCase() === expertData.email?.toLowerCase());
          if (existingUser) {
            userId = existingUser.id;
            // Ensure role is set for existing users (frontend reads user_metadata.role)
            if (existingUser.user_metadata?.role !== 'expert') {
              await serviceClient.auth.admin.updateUserById(userId, {
                user_metadata: { ...(existingUser.user_metadata || {}), role: 'expert' }
              });
            }
          } else {
            result.errors.push(`Email already registered and could not link to existing account`);
            return result;
          }
        } else {
          result.errors.push(`Auth user creation failed: ${createUserError.message}`);
          return result;
        }
      } else if (createUserData?.user?.id) {
        userId = createUserData.user.id;
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
}

module.exports = BulkImportService;
