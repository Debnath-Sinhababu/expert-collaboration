const { createClient } = require('redis');
const { Redis } = require('@upstash/redis');
const sgMail = require('@sendgrid/mail');
const { sendBrevoEmail } = require('./financeEmailService');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function expertProjectLink(projectId) {
  return process.env.FRONTEND_URL && projectId
    ? `<p><a href="${escapeHtml(`${process.env.FRONTEND_URL}/expert/project/${projectId}`)}">View project details</a></p>`
    : '';
}

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
    if (!this.initializeRedis()) {
      console.warn('Notification queue unavailable; sending notification directly:', notification.type);
      await this.sendNotification(notification);
      return;
    }

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
      await this.sendNotification(notification);
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

      const notification = typeof notificationData === 'string'
        ? JSON.parse(notificationData)
        : notificationData;

      console.log('Parsed notification:', notification);
      await this.sendNotification(notification);
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }

  buildEmailContent(type, data) {
    const projectTitle = escapeHtml(data.project_title || 'your project');
    const expertName = escapeHtml(data.expert_name || 'An expert');

    switch (type) {
      case 'expert_applied':
        return `<h2>New Expert Application</h2>
          <p>${expertName} has applied to your project: <strong>${projectTitle}</strong>.</p>
          <p>Application Date: ${new Date().toLocaleDateString()}</p>`;
      case 'application_accepted':
        return `<h2>Application Accepted</h2>
          <p>Your application for <strong>${projectTitle}</strong> has been accepted.</p>
          <p>The engagement and payment flow will be managed through CalxMap. Please check your dashboard for booking and attendance details.</p>
          ${expertProjectLink(data.project_id)}`;
      case 'application_rejected':
        return `<h2>Application Status Update</h2>
          <p>Your application for <strong>${projectTitle}</strong> was not selected for this engagement.</p>
          <p>You can continue applying to other matching opportunities from your CalxMap dashboard.</p>
          ${expertProjectLink(data.project_id)}`;
      case 'booking_created':
        return `<h2>Booking Confirmed</h2>
          <p>A booking has been confirmed for your project: <strong>${projectTitle}</strong>.</p>
          <p>This engagement is managed through CalxMap. Client details remain private until shared through an approved workflow.</p>
          ${expertProjectLink(data.project_id)}`;
      case 'booking_updated':
        return `<h2>Booking Updated</h2>
          <p>Your booking has been updated for project: <strong>${projectTitle}</strong>.</p>
          <p>Amount: Rs. ${Number(data.amount || 0).toFixed(2)}</p>`;
      case 'expert_selected_with_booking':
        return `<h2>You Have Been Selected</h2>
          <p>You have been selected for <strong>${projectTitle}</strong>.</p>
          <p>Your booking is confirmed. Attendance, project updates, and payout processing will be managed through CalxMap.</p>
          <p>Please check your dashboard for the next steps.</p>
          ${expertProjectLink(data.project_id)}`;
      case 'expert_interest_shown':
        return `<h2>New Matching Requirement</h2>
          <p>A verified client requirement on CalxMap matches your profile: <strong>${projectTitle}</strong>.</p>
          <p>Please review the project and apply if you are interested. Client identity is kept private in this stage.</p>
          ${expertProjectLink(data.project_id)}`;
      case 'moved_to_interview':
        return `<h2>Interview Stage</h2>
          <p>Your application for <strong>${projectTitle}</strong> has moved to the interview stage.</p>
          <p>Please check your dashboard for interview details and next steps. Client identity remains protected through CalxMap.</p>
          ${expertProjectLink(data.project_id)}`;
      default:
        return `<h2>Notification</h2><p>You have a new notification from CalxMap.</p>`;
    }
  }

  async sendNotification(notification) {
    try {
      console.log('sending notification', notification);
      const { type, data } = notification;
      const emailContent = this.buildEmailContent(type, data || {});
      const subject = `CalxMap - ${String(type || 'notification').replace(/_/g, ' ').toUpperCase()}`;
      const text = emailContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (process.env.BREVO_API_KEY) {
        await sendBrevoEmail({
          to: data.email,
          subject,
          text,
          html: emailContent,
        });
      } else {
        await this.sgMail.send({
          from: {
            email: process.env.SENDGRID_FROM_EMAIL || 'noreply@calxmap.in',
            name: 'CalxMap Team',
          },
          to: data.email,
          subject,
          html: emailContent,
        });
      }

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
      data: {
        email: institutionEmail,
        project_title: projectTitle,
        expert_name: expertName,
        expert_domain: expertDomain,
        expert_rate: expertRate,
      },
    });
  }

  async sendApplicationStatusNotification(expertEmail, projectTitle, institutionName, status, projectId = null) {
    const type = status === 'accepted' ? 'application_accepted' : 'application_rejected';
    await this.addToQueue({
      type,
      data: {
        email: expertEmail,
        project_title: projectTitle,
        status,
        project_id: projectId,
      },
    });
  }

  async sendBookingNotification(expertEmail, projectTitle, institutionName, bookingData, isCreation = false) {
    console.log('bookingData', bookingData, isCreation);
    await this.addToQueue({
      type: isCreation ? 'booking_created' : 'booking_updated',
      data: {
        email: expertEmail,
        project_title: projectTitle,
        project_id: bookingData.project_id,
        amount: bookingData.amount,
        start_date: new Date(bookingData.start_date).toLocaleDateString(),
        end_date: new Date(bookingData.end_date).toLocaleDateString(),
      },
    });
  }

  async sendMovedToInterviewNotification(expertEmail, projectTitle, projectId) {
    console.log('moved to interview reached', expertEmail, projectTitle, projectId);
    await this.addToQueue({
      type: 'moved_to_interview',
      data: {
        email: expertEmail,
        project_title: projectTitle,
        project_id: projectId,
      },
    });
  }

  async sendExpertSelectedWithBookingNotification(expertEmail, projectTitle, institutionName, projectId = null) {
    await this.addToQueue({
      type: 'expert_selected_with_booking',
      data: {
        email: expertEmail,
        project_title: projectTitle,
        project_id: projectId,
      },
    });
  }

  async sendExpertInterestShownNotification(expertEmail, projectTitle, institutionName, projectId) {
    await this.addToQueue({
      type: 'expert_interest_shown',
      data: {
        email: expertEmail,
        project_title: projectTitle,
        project_id: projectId,
      },
    });
  }
}

module.exports = new NotificationService();
