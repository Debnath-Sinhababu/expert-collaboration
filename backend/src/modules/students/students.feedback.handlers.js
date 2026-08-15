/**
 * Student feedback-system handlers extracted from server.js.
 */
const { createClient } = require('@supabase/supabase-js');
const studentFeedbackService = require('../../../services/studentFeedbackService');

async function login(req, res) {
  try {
    console.log('Student login request received:', req.body);
    
    const { universityName, rollNumber, studentName, email, batch, mobile, course, branch } = req.body;
 
    // Strict 10-digit numeric mobile validation
    const mobileValid = typeof mobile === 'string' && /^\d{10}$/.test(mobile);

    // batch is optional: batch-based programs (e.g. Fostima) send it, while
    // one-time course programs (e.g. Salesforce) do not.
    if (!universityName || !rollNumber || !studentName || !mobileValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input. University, roll number, student name, and a valid 10-digit mobile are required.' 
      });
    }

    const result = await studentFeedbackService.studentLogin(universityName, rollNumber, studentName, email, batch || null, mobile, course || null, branch || null);
    console.log('Student login result:', result);
    
    if (result.success) {
      // Return student data directly (frontend will handle session management)
      res.json({
        success: true,
        student: result.student,
        university: result.university
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function sessions(req, res) {
  try {
    const result = await studentFeedbackService.getFeedbackSessions();
    res.json(result);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function feedbackStatus(req, res) {
  try {
    const { studentId } = req.query;
    
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID is required' });
    }

    const result = await studentFeedbackService.getStudentFeedbackStatus(studentId);
    res.json(result);
  } catch (error) {
    console.error('Get feedback status error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function submitFeedback(req, res) {
  try {
    const { studentId, sessionId, rating, pros, cons, additionalComments } = req.body;
    
    if (!studentId || !sessionId || !rating) {
      return res.status(400).json({ 
        success: false, 
        error: 'Student ID, session ID, and rating are required' 
      });
    }

    const result = await studentFeedbackService.submitFeedback(
      studentId, 
      sessionId, 
      rating, 
      pros, 
      cons, 
      additionalComments
    );
    
    res.json(result);
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function feedbackByExpert(req, res) {
  try {
    const { expertName, limit = 50 } = req.query;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ success: false, error: 'Service role key not configured' });
    }

    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Build select clause dynamically to avoid inner join when not filtering by expertName
    let selectClause = `pros,rating,students:students(student_name)`;
    const hasExpertName = typeof expertName === 'string' && expertName.trim() !== '';
    if (hasExpertName) {
      selectClause += `,feedback_sessions!inner(expert_name)`;
    }

    let query = serviceClient
      .from('student_feedback')
      .select(selectClause)
      .in('rating', ['VERY_GOOD', 'GOOD'])
      .limit(parseInt(limit));

    if (hasExpertName) {
      query = query.eq('feedback_sessions.expert_name', expertName);
    }

    const { data, error } = await query;

    if (error) throw error;

    const mapped = Array.isArray(data) ? data.map((row) => ({
      student_name: row?.students?.student_name || 'Student',
      pros: row?.pros || '',
      rating: row?.rating || 'GOOD'
    })).filter(item => item.pros && item.pros.trim() !== '') : [];

    res.json({ success: true, feedback: mapped });
  } catch (error) {
    console.error('Get feedback by expert error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  login,
  sessions,
  feedbackStatus,
  submitFeedback,
  feedbackByExpert,
};
