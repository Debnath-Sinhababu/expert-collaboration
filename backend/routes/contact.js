// routes/contact.js
// Contact form submission and analytics routes

const contactService = require('../services/contactService');

// ========================================
// CONTACT FORM ROUTES
// ========================================

// Submit contact form (public)
function setupContactRoutes(app) {
  app.post('/api/contact', async (req, res) => {
    try {
      const { firstName, lastName, email, phone, message } = req.body;
      
      if (!firstName || !lastName || !email || !phone || !message) {
        return res.status(400).json({ 
          success: false, 
          error: 'All fields are required' 
        });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }

      // Basic phone validation (10 digits)
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must be 10 digits'
        });
      }

      const result = await contactService.submitContact(
        firstName,
        lastName,
        email,
        phone,
        message
      );
      
      res.json(result);
    } catch (error) {
      console.error('Submit contact error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get contact analytics (admin only)
  app.get('/api/admin/contact-analytics', async (req, res) => {
    try {
      // Check if user is authorized (hardcoded email check)
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authorization required' });
      }

      const token = authHeader.substring(7);
      
      // Verify the token contains the authorized email
      if (!token.includes('debnathsinhababu2017@gmail.com')) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      // Get pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await contactService.getAnalytics(page, limit);
      res.json(result);
    } catch (error) {
      console.error('Get contact analytics error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Update submission status (admin only)
  app.patch('/api/admin/contact-submissions/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authorization required' });
      }

      const token = authHeader.substring(7);
      if (!token.includes('debnathsinhababu2017@gmail.com')) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const { id } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }

      const validStatuses = ['new', 'in_progress', 'resolved', 'spam'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      const result = await contactService.updateStatus(id, status, notes);
      res.json(result);
    } catch (error) {
      console.error('Update submission status error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Delete submission (admin only)
  app.delete('/api/admin/contact-submissions/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authorization required' });
      }

      const token = authHeader.substring(7);
      if (!token.includes('debnathsinhababu2017@gmail.com')) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const { id } = req.params;
      const result = await contactService.deleteSubmission(id);
      res.json(result);
    } catch (error) {
      console.error('Delete submission error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
}

module.exports = { setupContactRoutes };

