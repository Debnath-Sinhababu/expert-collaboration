// services/studentFeedbackService.js
const { createClient } = require('@supabase/supabase-js');

class StudentFeedbackService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  // Student login/registration
  async studentLogin(universityName, rollNumber, studentName, email = null, batch = null, mobile = null, course = null, branch = null, designation = null) {
    try {
      if (email) email = String(email).trim().toLowerCase();

      // First, get or create university
      let { data: university, error: uniError } = await this.supabase
        .from('universities')
        .select('*')
        .eq('name', universityName)
        .single();

      if (uniError && uniError.code === 'PGRST116') {
        // University doesn't exist, create it
        const { data: newUni, error: createUniError } = await this.supabase
          .from('universities')
          .insert([{ name: universityName }])
          .select()
          .single();

        if (createUniError) throw createUniError;
        university = newUni;
      } else if (uniError) {
        throw uniError;
      }

      // Check if student exists
      let { data: student, error: studentError } = await this.supabase
        .from('students')
        .select('*')
        .eq('university_id', university.id)
        .eq('roll_number', rollNumber)
        .single();

      // Participants who submit an email (organization flow) must have a unique
      // email and mobile across all participants; a different person cannot reuse them.
      if (email && (!studentError || studentError.code === 'PGRST116')) {
        const { data: emailOwner } = await this.supabase
          .from('students').select('id').eq('email', email).limit(1);
        if (emailOwner && emailOwner.length > 0 && emailOwner[0].id !== student?.id) {
          return { success: false, error: 'This email is already registered with another participant.' };
        }
        if (mobile) {
          const { data: mobileOwner } = await this.supabase
            .from('students').select('id').eq('mobile', mobile).limit(1);
          if (mobileOwner && mobileOwner.length > 0 && mobileOwner[0].id !== student?.id) {
            return { success: false, error: 'This mobile number is already registered with another participant.' };
          }
        }
      }

      if (studentError && studentError.code === 'PGRST116') {
        // Student doesn't exist, create new student
        const { data: newStudent, error: createStudentError } = await this.supabase
          .from('students')
          .insert([{
            university_id: university.id,
            roll_number: rollNumber,
            student_name: studentName,
            email: email,
            batch: batch,
            mobile: mobile,
            course: course,
            branch: branch,
            designation: designation
          }])
          .select()
          .single();

        if (createStudentError) throw createStudentError;
        student = newStudent;
      } else if (studentError) {
        throw studentError;
      } else if (student) {
        // Student exists: update batch if provided and different
        const updates = {};
        if (batch && student.batch !== batch) updates.batch = batch;
        if (mobile && student.mobile !== mobile) updates.mobile = mobile;
        if (email && student.email !== email) updates.email = email;
        if (course && student.course !== course) updates.course = course;
        if (branch && student.branch !== branch) updates.branch = branch;
        if (designation && student.designation !== designation) updates.designation = designation;
        if (Object.keys(updates).length > 0) {
          const { error: updateErr } = await this.supabase
            .from('students')
            .update(updates)
            .eq('id', student.id);
          if (!updateErr) Object.assign(student, updates);
        }
      }

      return { success: true, student, university };
    } catch (error) {
      console.error('Student login error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get available feedback sessions
  async getFeedbackSessions() {
    try {
      const { data, error } = await this.supabase
        .from('feedback_sessions')
        .select('*')
        .order('session_date', { ascending: false });

      if (error) throw error;
      return { success: true, sessions: data };
    } catch (error) {
      console.error('Get feedback sessions error:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if student has already submitted feedback for a session
  async hasSubmittedFeedback(studentId, sessionId) {
    try {
      const { data, error } = await this.supabase
        .from('student_feedback')
        .select('id')
        .eq('student_id', studentId)
        .eq('session_id', sessionId)
        .single();

      if (error && error.code === 'PGRST116') {
        return false; // No feedback submitted
      } else if (error) {
        throw error;
      }

      return true; // Feedback already submitted
    } catch (error) {
      console.error('Check feedback submission error:', error);
      return false;
    }
  }

  // Submit feedback
  async submitFeedback(studentId, sessionId, rating, pros, cons, additionalComments) {
    try {
      // Check if already submitted
      const hasSubmitted = await this.hasSubmittedFeedback(studentId, sessionId);
      if (hasSubmitted) {
        return { success: false, error: 'Feedback already submitted for this session' };
      }

      const { data, error } = await this.supabase
        .from('student_feedback')
        .insert([{
          student_id: studentId,
          session_id: sessionId,
          rating,
          pros: pros || null,
          cons: cons || null,
          additional_comments: additionalComments || null
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, feedback: data };
    } catch (error) {
      console.error('Submit feedback error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get analytics (only for authorized user)
  async getAnalytics(page = 1, limit = 10, organization = null) {
    try {
      // Optional organization (university) filter applied to stats and the list
      let orgId = null;
      if (organization) {
        const { data: org } = await this.supabase
          .from('universities').select('id').eq('name', organization).maybeSingle();
        orgId = org?.id || '00000000-0000-0000-0000-000000000000';
      }

      // Get overall statistics
      let overallQuery = this.supabase
        .from('student_feedback')
        .select(orgId ? 'rating, students!inner(university_id)' : 'rating');
      if (orgId) overallQuery = overallQuery.eq('students.university_id', orgId);
      const { data: overallStats, error: statsError } = await overallQuery;

      if (statsError) throw statsError;
      console.log(overallStats,'overallstats');
      // Calculate percentages
      const total = overallStats.length;
      const ratingCounts = {
        VERY_GOOD: 0,
        GOOD: 0,
        AVERAGE: 0,
        BAD: 0
      };

      overallStats.forEach(feedback => {
        ratingCounts[feedback.rating]++;
      });

      const percentages = {};
      Object.keys(ratingCounts).forEach(rating => {
        percentages[rating] = total > 0 ? ((ratingCounts[rating] / total) * 100).toFixed(1) : 0;
      });

      // Get feedback by session type
      let sessionQuery = this.supabase
        .from('student_feedback')
        .select(`
          rating,
          feedback_sessions!inner(session_type)${orgId ? ',students!inner(university_id)' : ''}
        `);
      if (orgId) sessionQuery = sessionQuery.eq('students.university_id', orgId);
      const { data: sessionStats, error: sessionError } = await sessionQuery;

      if (sessionError) throw sessionError;

      // Seed the original Fostima batches so they always show, then add any
      // other program types (e.g. SALESFORCE) dynamically as data appears.
      const sessionTypeStats = {
        ET: { total: 0, ratings: { VERY_GOOD: 0, GOOD: 0, AVERAGE: 0, BAD: 0 } },
        PROMPT_ENGINEERING: { total: 0, ratings: { VERY_GOOD: 0,GOOD: 0, AVERAGE: 0, BAD: 0 } }
      };

      sessionStats.forEach(feedback => {
        const sessionType = feedback.feedback_sessions?.session_type;
        if (!sessionType) return;
        if (!sessionTypeStats[sessionType]) {
          sessionTypeStats[sessionType] = { total: 0, ratings: { VERY_GOOD: 0, GOOD: 0, AVERAGE: 0, BAD: 0 } };
        }
        sessionTypeStats[sessionType].total++;
        if (sessionTypeStats[sessionType].ratings[feedback.rating] !== undefined) {
          sessionTypeStats[sessionType].ratings[feedback.rating]++;
        }
      });

      // Get paginated feedback with student details
      const offset = (page - 1) * limit;
      let recentQuery = this.supabase
        .from('student_feedback')
        .select(`
          *,
          students${orgId ? '!inner' : ''}(university_id, student_name, roll_number, email, mobile, designation, universities(name)),
          feedback_sessions(session_type, topic, expert_name)
        `, { count: 'exact' });
      if (orgId) recentQuery = recentQuery.eq('students.university_id', orgId);
      const { data: recentFeedback, error: recentError, count } = await recentQuery
        .order('submitted_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (recentError) throw recentError;

      return {
        success: true,
        analytics: {
          totalSubmissions: total,
          overallPercentages: percentages,
          ratingCounts,
          sessionTypeStats,
          recentFeedback,
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

  // Get student's feedback status
  async getStudentFeedbackStatus(studentId) {
    try {
      const { data, error } = await this.supabase
        .from('student_feedback')
        .select(`
          session_id,
          feedback_sessions(session_type, topic)
        `)
        .eq('student_id', studentId);

      if (error) throw error;

      const submittedSessions = data.map(feedback => feedback.feedback_sessions.session_type);
      return { success: true, submittedSessions };
    } catch (error) {
      console.error('Get student feedback status error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new StudentFeedbackService();
