const { createClient } = require('redis');
const { Redis } = require('@upstash/redis');
const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid initialized with API key');
} else {
  console.warn('SENDGRID_API_KEY not found in environment variables');
}

class NotificationService {
  constructor() {
    this.sgMail = sgMail;
    this.redis = null;
    this.isProd = process.env.NODE_ENV === 'production';
  }

  initializeRedis() {
    if (!this.redis) {
      console.log('Initializing Redis client...');

      if (this.isProd) {
        console.log('Redis URL:', process.env.REDIS_URL);
        if (!process.env.REDIS_URL) {
          console.error('REDIS_URL not available');
          return false;
        }

        this.redis = createClient({ url: process.env.REDIS_URL });
        this.redis.on('error', (err) => console.error('Redis error', err));
        this.redis.connect().catch((err) => console.error('Redis connection error', err));
      } else {
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
      }
    }
    return true;
  }

  async addToQueue(notification) {
    if (!this.initializeRedis()) return;

    try {
      const dedupeKey = `notif_${notification.type}_${notification.data.email}_${Date.now()}`;
      const existingKey = this.isProd
        ? await this.redis.get(`dedupe_${dedupeKey.slice(0, 50)}`)
        : await this.redis.get(`dedupe_${dedupeKey.slice(0, 50)}`);

      if (existingKey) {
        console.log('Duplicate notification prevented:', notification.type);
        return;
      }

      if (this.isProd) {
        await this.redis.setEx(`dedupe_${dedupeKey.slice(0, 50)}`, 300, '1');
        await this.redis.lPush('notifications', JSON.stringify(notification));
      } else {
        await this.redis.setex(`dedupe_${dedupeKey.slice(0, 50)}`, 300, '1');
        await this.redis.lpush('notifications', JSON.stringify(notification));
      }

      console.log('Notification added to queue:', notification.type);
    } catch (error) {
      console.error('Error adding notification to queue:', error);
    }
  }

  async processQueue() {
    if (!this.initializeRedis()) return;

    try {
      const notificationData = this.isProd
        ? await this.redis.rPop('notifications')
        : await this.redis.rpop('notifications');

      if (!notificationData) {
        console.log('No notifications in queue');
        return;
      }

      console.log('Raw notification data from Redis:', notificationData);

      let notification = typeof notificationData === 'string'
        ? JSON.parse(notificationData)
        : notificationData;

      console.log('Parsed notification:', notification);
      await this.sendNotification(notification);
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }

  async sendNotification(notification) {
    try {
      console.log('sending notification', notification)
      const { type, data } = notification;
      let emailContent = '';

      switch (type) {
        case 'expert_applied':
          emailContent = `<h2>New Expert Application</h2>
            <p>An expert has applied to your project: ${data.project_title}</p>
            <p>Expert: ${data.expert_name}</p>
            <p>Application Date: ${new Date().toLocaleDateString()}</p>`;
          break;
        case 'application_accepted':
          emailContent = `<h2>Application Accepted</h2>
            <p>Your application for project "${data.project_title}" has been accepted!</p>
            <p>Institution: ${data.institution_name}</p>`;
          break;
        case 'application_rejected':
          emailContent = `<h2>Application Status Update</h2>
            <p>Your application for project "${data.project_title}" has been rejected.</p>
            <p>Institution: ${data.institution_name}</p>`;
          break;
        case 'booking_created':
          emailContent = `<h2>New Booking Created</h2>
            <p>A new booking has been created for your project: ${data.project_title}</p>
           
            ${process.env.FRONTEND_URL && data.project_id ? `<p><a href="${process.env.FRONTEND_URL}/expert/project/${data.project_id}">View project details</a></p>` : ''}`;
          break;
        case 'booking_updated':
          emailContent = `<h2>Booking Updated</h2>
            <p>Your booking has been completed for project: ${data.project_title}</p>
        
            <p>Amount: ₹${data.amount}</p>`;
          break;
        case 'expert_selected_with_booking':
          emailContent = `<h2>Congratulations! You've Been Selected</h2>
            <p>Great news! You have been selected for the project: ${data.project_title}</p>
            <p>Institution: ${data.institution_name}</p>
            <p>Your booking has been confirmed and you can now start working on this project.</p>
            <p>Please check your dashboard for more details.</p>`;
          break;
        case 'expert_interest_shown':
          emailContent = `<h2>Someone is Interested in Your Profile</h2>
            <p>An institution has shown interest in your profile for their project: ${data.project_title}</p>
            <p>Institution: ${data.institution_name}</p>
            <p>Please apply to this project to confirm your interest and start the collaboration process.</p>
            <p>Visit your dashboard to apply now!</p>`;
          break;
        case 'moved_to_interview':
          emailContent = `<h2>Great news!</h2>
            <p>Your application for ${data.project_title} has been moved to the interview stage.</p>
            ${process.env.FRONTEND_URL && data.project_id ? `<p><a href="${process.env.FRONTEND_URL}/expert/project/${data.project_id}">View project and interview details</a></p>` : ''}`;
          break;
        default:
          emailContent = `<h2>Notification</h2>
            <p>You have a new notification of type: ${type}</p>`;
      }

      await this.sgMail.send({
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@expertcollaboration.com',
          name: 'Calxmap Team'
        },
        to: data.email,
        subject: `Calxmap - ${type.replace('_', ' ').toUpperCase()}`,
        html: emailContent,
      });

      console.log(`Email notification sent for ${type} to ${data.email}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  startQueueProcessor() {
    if (!this.initializeRedis()) return;

    console.log('Starting notification queue processor with 5-second interval');
    setInterval(() => {
      console.log('Processing notification queue...');
      this.processQueue();
    }, 5000);
  }

  async sendExpertApplicationNotification(institutionEmail, projectTitle, expertName, expertDomain, expertRate) {
    await this.addToQueue({
      type: 'expert_applied',
      data: { email: institutionEmail, project_title: projectTitle, expert_name: expertName, expert_domain: expertDomain, expert_rate: expertRate }
    });
  }

  async sendApplicationStatusNotification(expertEmail, projectTitle, institutionName, status) {
    const type = status === 'accepted' ? 'application_accepted' : 'application_rejected';
    await this.addToQueue({
      type,
      data: { email: expertEmail, project_title: projectTitle, institution_name: institutionName, status }
    });
  }

  async sendBookingNotification(expertEmail, projectTitle, institutionName, bookingData,isCreation=false) {
    console.log('bookingData', bookingData,isCreation)
    await this.addToQueue({
      type: isCreation ? 'booking_created' : 'booking_updated',
      data: {
        email: expertEmail,
        project_title: projectTitle,
        project_id: bookingData.project_id,
        amount: bookingData.amount,
        start_date: new Date(bookingData.start_date).toLocaleDateString(),
        end_date: new Date(bookingData.end_date).toLocaleDateString()
      }
    });
  }

  async sendMovedToInterviewNotification(expertEmail, projectTitle, projectId) {
    console.log('moved to interview reached', expertEmail, projectTitle, projectId)
    await this.addToQueue({
      type: 'moved_to_interview',
      data: {
        email: expertEmail,
        project_title: projectTitle,
        project_id: projectId
      }
    });
  }

  async sendExpertSelectedWithBookingNotification(expertEmail, projectTitle, institutionName) {
    await this.addToQueue({
      type: 'expert_selected_with_booking',
      data: {
        email: expertEmail,
        project_title: projectTitle,
        institution_name: institutionName
      }
    });
  }

  async sendExpertInterestShownNotification(expertEmail, projectTitle, institutionName) {
    await this.addToQueue({
      type: 'expert_interest_shown',
      data: {
        email: expertEmail,
        project_title: projectTitle,
        institution_name: institutionName
      }
    });
  }
}

module.exports = new NotificationService();
