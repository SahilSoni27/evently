import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';

// Template data interfaces
export interface BookingConfirmationData {
  userName: string;
  eventName: string;
  venue: string;
  eventDate: string;
  eventTime: string;
  ticketQuantity: number;
  totalPrice: number;
  bookingId: string;
  qrCodeUrl?: string;
}

export interface EventReminderData {
  userName: string;
  eventName: string;
  venue: string;
  eventDate: string;
  eventTime: string;
  address?: string;
  specialInstructions?: string;
}

export interface WaitlistNotificationData {
  userName: string;
  eventName: string;
  position: number;
  estimatedWaitTime?: string;
}

export interface PromotionNotificationData {
  userName: string;
  eventName: string;
  venue: string;
  eventDate: string;
  eventTime: string;
  timeToRespond?: string; // e.g., "24 hours"
  confirmationLink: string;
}

class EmailTemplateService {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private baseTemplate: HandlebarsTemplateDelegate;

  constructor() {
    this.initializeTemplates();
    this.baseTemplate = this.createBaseTemplate();
  }

  private createBaseTemplate(): HandlebarsTemplateDelegate {
    const baseHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8fafc;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 40px 30px; 
            text-align: center;
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 300;
        }
        .content { 
            padding: 40px 30px;
        }
        .event-card {
            background: #f8fafc;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #667eea;
        }
        .event-details {
            display: grid;
            gap: 12px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #4a5568;
        }
        .detail-value {
            color: #1a202c;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }
        .footer { 
            background: #f1f5f9;
            padding: 30px; 
            text-align: center; 
            color: #64748b;
            font-size: 14px;
        }
        .highlight {
            background: #fef3cd;
            padding: 16px;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
            margin: 20px 0;
        }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .content, .header { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Evently</h1>
            <p>{{headerMessage}}</p>
        </div>
        <div class="content">
            {{{content}}}
        </div>
        <div class="footer">
            <p>Thank you for using Evently!</p>
            <p>Questions? Reply to this email or visit our support center.</p>
            <p style="margin-top: 20px;">
                <small>© 2025 Evently. All rights reserved.</small>
            </p>
        </div>
    </div>
</body>
</html>`;

    return Handlebars.compile(baseHtml);
  }

  private initializeTemplates() {
    // Booking Confirmation Template
    const bookingConfirmationHtml = `
<h2>🎉 Booking Confirmed!</h2>
<p>Hi {{userName}},</p>
<p>Great news! Your booking has been confirmed. Here are your event details:</p>

<div class="event-card">
    <h3>{{eventName}}</h3>
    <div class="event-details">
        <div class="detail-row">
            <span class="detail-label">📍 Venue:</span>
            <span class="detail-value">{{venue}}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">📅 Date:</span>
            <span class="detail-value">{{eventDate}}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">🕐 Time:</span>
            <span class="detail-value">{{eventTime}}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">🎫 Tickets:</span>
            <span class="detail-value">{{ticketQuantity}}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">💰 Total:</span>
            <span class="detail-value">\${{totalPrice}}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">🔖 Booking ID:</span>
            <span class="detail-value">{{bookingId}}</span>
        </div>
    </div>
</div>

<div class="highlight">
    <strong>📱 Pro Tip:</strong> Save this email or screenshot your booking details. You'll need your Booking ID for entry.
</div>

<p>We'll send you a reminder 24 hours before the event. Can't wait to see you there! 🎊</p>

<p>Best regards,<br>The Evently Team</p>`;

    // Event Reminder Template
    const eventReminderHtml = `
<h2>⏰ Event Reminder</h2>
<p>Hi {{userName}},</p>
<p>This is a friendly reminder that your event is coming up soon!</p>

<div class="event-card">
    <h3>{{eventName}}</h3>
    <div class="event-details">
        <div class="detail-row">
            <span class="detail-label">📍 Venue:</span>
            <span class="detail-value">{{venue}}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">📅 Date:</span>
            <span class="detail-value">{{eventDate}}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">🕐 Time:</span>
            <span class="detail-value">{{eventTime}}</span>
        </div>
        {{#if address}}
        <div class="detail-row">
            <span class="detail-label">🗺️ Address:</span>
            <span class="detail-value">{{address}}</span>
        </div>
        {{/if}}
    </div>
</div>

{{#if specialInstructions}}
<div class="highlight">
    <strong>📋 Special Instructions:</strong><br>
    {{specialInstructions}}
</div>
{{/if}}

<div class="highlight">
    <strong>🎫 Don't forget:</strong>
    <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Bring your booking confirmation (this email)</li>
        <li>Arrive 15-30 minutes early</li>
        <li>Bring a valid ID if required</li>
    </ul>
</div>

<p>Looking forward to seeing you at the event! 🎉</p>

<p>Best regards,<br>The Evently Team</p>`;

    // Waitlist Notification Template
    const waitlistNotificationHtml = `
<h2>📋 You're on the Waitlist!</h2>
<p>Hi {{userName}},</p>
<p>Thank you for your interest in <strong>{{eventName}}</strong>!</p>

<div class="event-card">
    <h3>Waitlist Status</h3>
    <div class="event-details">
        <div class="detail-row">
            <span class="detail-label">🎫 Event:</span>
            <span class="detail-value">{{eventName}}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">📊 Your Position:</span>
            <span class="detail-value">#{{position}}</span>
        </div>
        {{#if estimatedWaitTime}}
        <div class="detail-row">
            <span class="detail-label">⏳ Estimated Wait:</span>
            <span class="detail-value">{{estimatedWaitTime}}</span>
        </div>
        {{/if}}
    </div>
</div>

<div class="highlight">
    <strong>🔔 What happens next?</strong><br>
    We'll automatically notify you if a spot becomes available. If you get promoted from the waitlist, you'll have 24 hours to confirm your booking.
</div>

<p>Keep your fingers crossed! 🤞</p>

<p>Best regards,<br>The Evently Team</p>`;

    // Promotion Notification Template
    const promotionNotificationHtml = `
<h2>🎉 You Got In!</h2>
<p>Hi {{userName}},</p>
<p><strong>Fantastic news!</strong> A spot has opened up for <strong>{{eventName}}</strong> and you've been promoted from the waitlist!</p>

<div class="event-card">
    <h3>{{eventName}}</h3>
    <div class="event-details">
        <div class="detail-row">
            <span class="detail-label">📍 Venue:</span>
            <span class="detail-value">{{venue}}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">📅 Date:</span>
            <span class="detail-value">{{eventDate}}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">🕐 Time:</span>
            <span class="detail-value">{{eventTime}}</span>
        </div>
    </div>
</div>

<div style="text-align: center; margin: 30px 0;">
    <a href="{{confirmationLink}}" class="cta-button">
        🎫 Confirm Your Spot Now
    </a>
</div>

<div class="highlight">
    <strong>⚠️ Important:</strong> You have {{timeToRespond}} to confirm your booking. If you don't confirm within this time, your spot will be offered to the next person on the waitlist.
</div>

<p>Don't miss out - confirm your spot now! 🚀</p>

<p>Best regards,<br>The Evently Team</p>`;

    // Compile all templates
    this.templates.set('booking-confirmation', Handlebars.compile(bookingConfirmationHtml));
    this.templates.set('event-reminder', Handlebars.compile(eventReminderHtml));
    this.templates.set('waitlist-notification', Handlebars.compile(waitlistNotificationHtml));
    this.templates.set('promotion-notification', Handlebars.compile(promotionNotificationHtml));
  }

  generateBookingConfirmation(data: BookingConfirmationData): { subject: string; html: string } {
    const template = this.templates.get('booking-confirmation')!;
    const content = template(data);
    
    const html = this.baseTemplate({
      subject: `🎫 Booking Confirmed: ${data.eventName}`,
      headerMessage: 'Your booking has been confirmed!',
      content
    });

    return {
      subject: `🎫 Booking Confirmed: ${data.eventName}`,
      html
    };
  }

  generateEventReminder(data: EventReminderData): { subject: string; html: string } {
    const template = this.templates.get('event-reminder')!;
    const content = template(data);
    
    const html = this.baseTemplate({
      subject: `⏰ Reminder: ${data.eventName} is tomorrow!`,
      headerMessage: 'Your event is coming up soon!',
      content
    });

    return {
      subject: `⏰ Reminder: ${data.eventName} is tomorrow!`,
      html
    };
  }

  generateWaitlistNotification(data: WaitlistNotificationData): { subject: string; html: string } {
    const template = this.templates.get('waitlist-notification')!;
    const content = template(data);
    
    const html = this.baseTemplate({
      subject: `📋 Waitlist Confirmation: ${data.eventName}`,
      headerMessage: "You're on the waitlist!",
      content
    });

    return {
      subject: `📋 Waitlist Confirmation: ${data.eventName}`,
      html
    };
  }

  generatePromotionNotification(data: PromotionNotificationData): { subject: string; html: string } {
    const template = this.templates.get('promotion-notification')!;
    const content = template(data);
    
    const html = this.baseTemplate({
      subject: `🎉 You're In! Spot Available: ${data.eventName}`,
      headerMessage: 'A spot opened up for you!',
      content
    });

    return {
      subject: `🎉 You're In! Spot Available: ${data.eventName}`,
      html
    };
  }
}

export default new EmailTemplateService();
