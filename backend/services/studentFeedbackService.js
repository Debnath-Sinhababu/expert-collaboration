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
  async studentLogin(universityName, rollNumber, studentName, email = null, batch = null) {
    try {
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

      if (studentError && studentError.code === 'PGRST116') {
        // Student doesn't exist, create new student
        const { data: newStudent, error: createStudentError } = await this.supabase
          .from('students')
          .insert([{
            university_id: university.id,
            roll_number: rollNumber,
            student_name: studentName,
            email: email,
            batch: batch
          }])
          .select()
          .single();

        if (createStudentError) throw createStudentError;
        student = newStudent;
      } else if (studentError) {
        throw studentError;
      } else if (student) {
        // Student exists: update batch if provided and different
        if (batch && student.batch !== batch) {
          const { error: updateErr } = await this.supabase
            .from('students')
            .update({ batch })
            .eq('id', student.id);
          if (!updateErr) {
            student.batch = batch;
          }
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
  async getAnalytics(page = 1, limit = 10) {
    try {
      // Get overall statistics
      const { data: overallStats, error: statsError } = await this.supabase
        .from('student_feedback')
        .select('rating');

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
      const { data: sessionStats, error: sessionError } = await this.supabase
        .from('student_feedback')
        .select(`
          rating,
          feedback_sessions!inner(session_type)
        `);

      if (sessionError) throw sessionError;

      const sessionTypeStats = {
        ET: { total: 0, ratings: { VERY_GOOD: 0, GOOD: 0, AVERAGE: 0, BAD: 0 } },
        PROMPT_ENGINEERING: { total: 0, ratings: { VERY_GOOD: 0,GOOD: 0, AVERAGE: 0, BAD: 0 } }
      };

      sessionStats.forEach(feedback => {
        const sessionType = feedback.feedback_sessions.session_type;
        sessionTypeStats[sessionType].total++;
        sessionTypeStats[sessionType].ratings[feedback.rating]++;
      });

      // Get paginated feedback with student details
      const offset = (page - 1) * limit;
      const { data: recentFeedback, error: recentError, count } = await this.supabase
        .from('student_feedback')
        .select(`
          *,
          students(student_name, roll_number, universities(name)),
          feedback_sessions(session_type, topic, expert_name)
        `, { count: 'exact' })
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
