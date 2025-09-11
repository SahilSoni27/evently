"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const handlebars_1 = __importDefault(require("handlebars"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
// @ts-ignore - html-to-text types not available
const html_to_text_1 = require("html-to-text");
class EmailService {
    constructor() {
        this.isConfigured = false;
        this.templateCache = new Map();
        this.registerHelpers();
        // Configure transporter asynchronously
        this.configureTransporter().catch(error => {
            console.error('❌ Email service initialization failed:', error);
            this.isConfigured = false;
        });
    }
    registerHelpers() {
        // Register Handlebars helpers for templates
        handlebars_1.default.registerHelper('eq', (a, b) => a === b);
        handlebars_1.default.registerHelper('lt', (a, b) => a < b);
        handlebars_1.default.registerHelper('lte', (a, b) => a <= b);
        handlebars_1.default.registerHelper('gt', (a, b) => a > b);
        handlebars_1.default.registerHelper('gte', (a, b) => a >= b);
    }
    async configureTransporter() {
        try {
            // Support multiple email providers
            let config;
            if (process.env.EMAIL_SERVICE === 'ethereal') {
                // Use Ethereal Email for development testing
                const testAccount = await nodemailer_1.default.createTestAccount();
                config = {
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                };
                console.log('📧 Using Ethereal Email for testing');
                console.log('📧 Preview emails at: https://ethereal.email');
            }
            else if (process.env.EMAIL_SERVICE === 'gmail') {
                config = {
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_APP_PASSWORD // Use App Password for Gmail
                    }
                };
            }
            else if (process.env.EMAIL_SERVICE === 'outlook') {
                config = {
                    service: 'hotmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD
                    }
                };
            }
            else if (process.env.EMAIL_SERVICE === 'sendgrid') {
                config = {
                    host: 'smtp.sendgrid.net',
                    port: 587,
                    secure: false,
                    auth: {
                        user: 'apikey',
                        pass: process.env.SENDGRID_API_KEY
                    }
                };
            }
            else if (process.env.EMAIL_SERVICE === 'mailgun') {
                config = {
                    host: 'smtp.mailgun.org',
                    port: 587,
                    secure: false,
                    auth: {
                        user: process.env.MAILGUN_SMTP_LOGIN,
                        pass: process.env.MAILGUN_SMTP_PASSWORD
                    }
                };
            }
            else {
                // Custom SMTP configuration
                config = {
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASSWORD
                    }
                };
            }
            this.transporter = nodemailer_1.default.createTransport(config);
            this.isConfigured = true;
            // Verify connection in development
            if (process.env.NODE_ENV === 'development') {
                this.verifyConnection();
            }
        }
        catch (error) {
            console.error('❌ Email service configuration failed:', error);
            this.isConfigured = false;
        }
    }
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email service connected successfully');
        }
        catch (error) {
            console.error('❌ Email service connection failed:', error);
            this.isConfigured = false;
        }
    }
    /**
     * Load and compile email template
     */
    async loadTemplate(templateName) {
        // Check cache first
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName);
        }
        try {
            const templatePath = path_1.default.join(__dirname, '../templates/emails', `${templateName}.hbs`);
            const templateContent = await promises_1.default.readFile(templatePath, 'utf-8');
            const template = handlebars_1.default.compile(templateContent);
            // Cache the compiled template
            this.templateCache.set(templateName, template);
            return template;
        }
        catch (error) {
            console.error(`❌ Failed to load email template: ${templateName}`, error);
            throw new Error(`Email template not found: ${templateName}`);
        }
    }
    /**
     * Send email using template
     */
    async sendEmailWithTemplate(templateName, context, to, subject) {
        try {
            const template = await this.loadTemplate(templateName);
            const html = template(context);
            const text = (0, html_to_text_1.htmlToText)(html);
            const emailData = {
                to,
                subject,
                html,
                text
            };
            return await this.sendEmail(emailData);
        }
        catch (error) {
            console.error(`❌ Failed to send templated email:`, error);
            return false;
        }
    }
    async sendEmail(emailData) {
        if (!this.isConfigured) {
            console.log('📧 Email service not configured - simulating email send');
            console.log(`To: ${emailData.to}`);
            console.log(`Subject: ${emailData.subject}`);
            console.log('Email would be sent in production');
            return true;
        }
        try {
            // Generate text version if not provided
            const text = emailData.text || (0, html_to_text_1.htmlToText)(emailData.html, {
                wordwrap: 130,
                selectors: [
                    { selector: 'a', options: { ignoreHref: false } },
                    { selector: 'img', format: 'skip' }
                ]
            });
            const mailOptions = {
                from: {
                    name: process.env.EMAIL_FROM_NAME || 'Evently',
                    address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
                },
                to: emailData.to,
                subject: emailData.subject,
                html: emailData.html,
                text: text
            };
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent successfully to ${emailData.to}:`, result.messageId);
            return true;
        }
        catch (error) {
            console.error(`❌ Failed to send email to ${emailData.to}:`, error);
            return false;
        }
    }
    // Test email functionality
    async sendTestEmail(to) {
        const testEmailData = {
            to,
            subject: '🎉 Evently Email Service Test',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Email Service Working!</h2>
          <p>Congratulations! Your Evently email service is properly configured.</p>
          <p>This test email confirms that:</p>
          <ul>
            <li>✅ SMTP connection is working</li>
            <li>✅ Email templates are rendering</li>
            <li>✅ Nodemailer is configured correctly</li>
          </ul>
          <p>You're all set to send booking confirmations, event reminders, and more!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Sent by Evently Event Management System</p>
        </div>
      `
        };
        return await this.sendEmail(testEmailData);
    }
    /**
     * Send booking confirmation email
     */
    async sendBookingConfirmation(data) {
        // If QR code data is not provided, generate it
        if (!data.qrCodeData) {
            try {
                const { TicketService } = await Promise.resolve().then(() => __importStar(require('./ticketService')));
                data.qrCodeData = await TicketService.generateQRCode(data.bookingId);
            }
            catch (error) {
                console.error('Failed to generate QR code for email:', error);
                data.qrCodeData = ''; // Fallback to empty string
            }
        }
        // Generate proper ticket number if not provided
        if (!data.ticketNumber) {
            data.ticketNumber = `EVT-${data.bookingId.substring(0, 8).toUpperCase()}`;
        }
        return this.sendEmailWithTemplate('booking-confirmation', data, data.to, `🎫 Booking Confirmed: ${data.eventName}`);
    }
    /**
     * Send event reminder email
     */
    async sendEventReminder(data) {
        const subject = data.hoursUntilEvent <= 24
            ? `Reminder: ${data.eventName} starts in ${data.hoursUntilEvent}h`
            : `Upcoming: ${data.eventName}`;
        return this.sendEmailWithTemplate('event-reminder', data, data.to, subject);
    }
    /**
     * Send waitlist confirmation email
     */
    async sendWaitlistConfirmation(data) {
        return this.sendEmailWithTemplate('waitlist-confirmation', data, data.to, `You're on the waitlist: ${data.eventName}`);
    }
    /**
     * Send waitlist promotion email
     */
    async sendWaitlistPromotion(data) {
        return this.sendEmailWithTemplate('waitlist-promotion', data, data.to, `🎉 Ticket Available: ${data.eventName}`);
    }
    // Batch email sending with rate limiting
    async sendBatchEmails(emails, batchSize = 10, delayMs = 1000) {
        console.log(`📧 Sending ${emails.length} emails in batches of ${batchSize}`);
        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            const promises = batch.map(email => this.sendEmail(email));
            await Promise.all(promises);
            // Add delay between batches to avoid rate limiting
            if (i + batchSize < emails.length) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        console.log(`✅ Batch email sending completed`);
    }
}
// Export singleton instance
exports.default = new EmailService();
