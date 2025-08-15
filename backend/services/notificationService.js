const { createClient } = require('redis');
const { Redis } = require('@upstash/redis');
const sgMail = require('@sendgrid/mail');


let redis = null; // Will be initialized lazily

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid initialized with API key');
} else {
  console.warn('SENDGRID_API_KEY not found in environment variables');
}

class NotificationService {
  constructor() {
    this.sgMail = sgMail;
    this.redis = null; // Will be initialized when needed
  }

  initializeRedis() {
    if (!this.redis) {
      console.log('Initializing Redis client...');
  
      if (process.env.NODE_ENV === 'production') {
        // Production: Use REDIS_URL for standard Redis connection
        console.log('Redis URL:', process.env.REDIS_URL);
        if (!process.env.REDIS_URL) {
          console.error('REDIS_URL not available');
          return false;
        }
     
        this.redis = createClient({
          url: process.env.REDIS_URL,
        });
        this.redis.on('error', (err) => console.error('Redis error', err));
        this.redis.connect().catch((err) => console.error('Redis connection error', err));
        return true;
      } else {
        // Development: Use Upstash REST API client
        console.log('Upstash REST URL:', process.env.UPSTASH_REDIS_REST_URL);
        console.log('Upstash REST Token:', process.env.UPSTASH_REDIS_REST_TOKEN ? '***' : 'undefined');
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
          console.error('Upstash REST env vars not available');
          return false;
        }
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        return true;
      }
    }
    return true;
  }
  

  async addToQueue(notification) {
    if (!this.initializeRedis()) {
      console.log('Redis not initialized, skipping notification queue');
      return;
    }

    try {
      const dedupeKey = `notif_${notification.type}_${notification.data.email}_${Date.now()}`;
      const existingKey = await this.redis.get(`dedupe_${dedupeKey.slice(0, 50)}`);
      
      if (existingKey) {
        console.log('Duplicate notification prevented:', notification.type);
        return;
      }

      await this.redis.setex(`dedupe_${dedupeKey.slice(0, 50)}`, 300, '1');
      
      await this.redis.lpush('notifications', JSON.stringify(notification));
      console.log('Notification added to queue:', notification.type);
    } catch (error) {
      console.error('Error adding notification to queue:', error);
    }
  }

  async processQueue() {
    if (!this.initializeRedis()) {
      console.log('Redis not initialized, skipping queue processing');
      return;
    }

    try {
      const notificationData = await this.redis.rpop('notifications');
      if (notificationData) {
        console.log('Raw notification data from Redis:', notificationData);
        console.log('Type of notification data:', typeof notificationData);
        
        let notification;
        if (typeof notificationData === 'string') {
          notification = JSON.parse(notificationData);
        } else if (typeof notificationData === 'object') {
          notification = notificationData;
        } else {
          console.error('Unexpected notification data type:', typeof notificationData);
          return;
        }
        
        console.log('Parsed notification:', notification);
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }

  async sendNotification(notification) {
    try {
      const { type, data } = notification;
      let emailContent = '';

      switch (type) {
        case 'expert_applied':
          emailContent = `
            <h2>New Expert Application</h2>
            <p>An expert has applied to your project: ${data.project_title}</p>
            <p>Expert: ${data.expert_name}</p>
            <p>Application Date: ${new Date().toLocaleDateString()}</p>
          `;
          break;
        case 'application_accepted':
          emailContent = `
            <h2>Application Accepted</h2>
            <p>Your application for project "${data.project_title}" has been accepted!</p>
            <p>Institution: ${data.institution_name}</p>
            <p>Status: Accepted</p>
          `;
          break;
        case 'application_rejected':
          emailContent = `
            <h2>Application Status Update</h2>
            <p>Your application for project "${data.project_title}" has been rejected.</p>
            <p>Institution: ${data.institution_name}</p>
            <p>Status: Rejected</p>
          `;
          break;
        case 'booking_created':
          emailContent = `
            <h2>New Booking Created</h2>
            <p>A new booking has been created for your project: ${data.project_title}</p>
            <p>Expert: ${data.expert_name}</p>
            <p>Start Date: ${data.start_date}</p>
            <p>End Date: ${data.end_date}</p>
          `;
          break;
        case 'booking_updated':
          emailContent = `
            <h2>Booking Updated</h2>
            <p>Your booking has been updated for project: ${data.project_title}</p>
            <p>Institution: ${data.institution_name}</p>
            <p>Amount: ₹${data.amount}</p>
            <p>Start Date: ${data.start_date}</p>
            <p>End Date: ${data.end_date}</p>
          `;
          break;
        default:
          emailContent = `
            <h2>Notification</h2>
            <p>You have a new notification of type: ${type}</p>
          `;
      }

      const mailOptions = {
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@expertcollaboration.com',
          name: 'Expert Collaboration Platform'
        },
        to: data.email,
        subject: `Expert Collaboration - ${type.replace('_', ' ').toUpperCase()}`,
        html: emailContent,
      };

      await this.sgMail.send(mailOptions);
      console.log(`Email notification sent for ${type} to ${data.email}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  startQueueProcessor() {
    if (!this.initializeRedis()) {
      console.log('Redis not initialized, queue processor not started');
      return;
    }

    console.log('Starting notification queue processor with 5-second interval');
    setInterval(() => {
      console.log('Processing notification queue...');
      this.processQueue();
    }, 5000); // Process every 5 seconds
  }

  async sendExpertApplicationNotification(institutionEmail, projectTitle, expertName, expertDomain, expertRate) {
    await this.addToQueue({
      type: 'expert_applied',
      data: {
        email: institutionEmail,
        project_title: projectTitle,
        expert_name: expertName,
        expert_domain: expertDomain,
        expert_rate: expertRate
      }
    });
  }

  async sendApplicationStatusNotification(expertEmail, projectTitle, institutionName, status) {
    const notificationType = status === 'accepted' ? 'application_accepted' : 'application_rejected';
    await this.addToQueue({
      type: notificationType,
      data: {
        email: expertEmail,
        project_title: projectTitle,
        institution_name: institutionName,
        status: status
      }
    });
  }

  async sendBookingNotification(expertEmail, projectTitle, institutionName, bookingData) {
    await this.addToQueue({
      type: 'booking_updated',
      data: {
        email: expertEmail,
        project_title: projectTitle,
        institution_name: institutionName,
        amount: bookingData.amount,
        start_date: new Date(bookingData.start_date).toLocaleDateString(),
        end_date: new Date(bookingData.end_date).toLocaleDateString()
      }
    });
  }
}

module.exports = new NotificationService();
