// services/contactService.js
const { createClient } = require('@supabase/supabase-js');

class ContactService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  // Submit contact form
  async submitContact(firstName, lastName, email, phone, message) {
    try {
      const { data, error } = await this.supabase
        .from('contact_submissions')
        .insert([{
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          message,
          status: 'new'
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, submission: data };
    } catch (error) {
      console.error('Submit contact error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get analytics (only for authorized user)
  async getAnalytics(page = 1, limit = 10) {
    try {
      // Get total submissions count
      const { count: total, error: countError } = await this.supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // Get status breakdown
      const { data: statusData, error: statusError } = await this.supabase
        .from('contact_submissions')
        .select('status');

      if (statusError) throw statusError;

      const statusCounts = {
        new: 0,
        in_progress: 0,
        resolved: 0,
        spam: 0
      };

      statusData.forEach(item => {
        if (statusCounts.hasOwnProperty(item.status)) {
          statusCounts[item.status]++;
        }
      });

      // Calculate percentages
      const statusPercentages = {};
      Object.keys(statusCounts).forEach(status => {
        statusPercentages[status] = total > 0 
          ? ((statusCounts[status] / total) * 100).toFixed(1)
          : '0.0';
      });

      // Get recent submissions with pagination
      const offset = (page - 1) * limit;
      const { data: recentSubmissions, error: recentError, count } = await this.supabase
        .from('contact_submissions')
        .select('*', { count: 'exact' })
        .order('submitted_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (recentError) throw recentError;

      // Get submissions per day for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentData, error: trendError } = await this.supabase
        .from('contact_submissions')
        .select('submitted_at')
        .gte('submitted_at', thirtyDaysAgo.toISOString());

      if (trendError) throw trendError;

      // Group by date
      const submissionsByDate = {};
      recentData.forEach(item => {
        const date = new Date(item.submitted_at).toISOString().split('T')[0];
        submissionsByDate[date] = (submissionsByDate[date] || 0) + 1;
      });

      return {
        success: true,
        analytics: {
          totalSubmissions: total,
          statusCounts,
          statusPercentages,
          submissionsByDate,
          recentSubmissions,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil((count || 0) / limit),
            totalItems: count || 0,
            itemsPerPage: limit,
            hasNextPage: page < Math.ceil((count || 0) / limit),
            hasPrevPage: page > 1
          }
        }
      };
    } catch (error) {
      console.error('Get analytics error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update submission status
  async updateStatus(submissionId, status, notes = null) {
    try {
      const updateData = { status };
      if (notes !== null) {
        updateData.notes = notes;
      }

      const { data, error } = await this.supabase
        .from('contact_submissions')
        .update(updateData)
        .eq('id', submissionId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, submission: data };
    } catch (error) {
      console.error('Update status error:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete submission (mark as spam or delete permanently)
  async deleteSubmission(submissionId) {
    try {
      const { error } = await this.supabase
        .from('contact_submissions')
        .delete()
        .eq('id', submissionId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Delete submission error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ContactService();

