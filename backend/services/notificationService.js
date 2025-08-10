const { Redis } = require('@upstash/redis');
const nodemailer = require('nodemailer');

let redis = null; // Will be initialized lazily

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

class NotificationService {
  constructor() {
    this.transporter = transporter;
    this.redis = null; // Will be initialized when needed
  }

  initializeRedis() {
    if (!this.redis) {
      console.log('Initializing Redis client...');
      console.log('Redis URL:', process.env.UPSTASH_REDIS_REST_URL);
      console.log('Redis Token:', process.env.UPSTASH_REDIS_REST_TOKEN ? '***' : 'undefined');
      
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.error('Redis environment variables not available yet');
        return false;
      }
      
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return true;
    }
    return true;
  }

  async addToQueue(notification) {
    if (!this.initializeRedis()) {
      console.log('Redis not initialized, skipping notification queue');
      return;
    }

    try {
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
        const notification = JSON.parse(notificationData);
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
        default:
          emailContent = `
            <h2>Notification</h2>
            <p>You have a new notification of type: ${type}</p>
          `;
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: data.email,
        subject: `Expert Collaboration - ${type.replace('_', ' ').toUpperCase()}`,
        html: emailContent,
      };

      await this.transporter.sendMail(mailOptions);
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

    setInterval(() => {
      this.processQueue();
    }, 5000); // Process every 5 seconds
  }
}

module.exports = new NotificationService();
