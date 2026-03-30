import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;
  private readonly logger = new Logger(EmailService.name);
  private readonly enabled: boolean;

  constructor() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM;

    // Email is enabled if all SMTP configuration is provided
    this.enabled = !!(smtpHost && smtpPort && smtpUser && smtpPass && smtpFrom);

    if (this.enabled) {
      const port = parseInt(smtpPort!, 10);
      this.transporter = nodemailer.createTransport({
        host: smtpHost!,
        port: port,
        secure: port === 465, // true for 465 (SSL), false for other ports
        requireTLS: port === 587, // true for 587 (STARTTLS)
        auth: {
          user: smtpUser!,
          pass: smtpPass!,
        },
      });
      this.logger.log('Email service initialized with SMTP configuration');
    } else {
      this.logger.warn('Email service disabled - SMTP configuration not provided');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      this.logger.warn(`Email sending skipped (not configured): ${subject} to ${to}`);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        text,
        html: html || text,
      });
      this.logger.log(`Email sent: ${info.messageId} to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, name: string, password: string): Promise<boolean> {
    const subject = 'Welcome to Ticketing System - Your Account Details';
    const text = `Hello ${name},\n\nYour account has been created in the Ticketing System.\n\nEmail: ${email}\nTemporary Password: ${password}\n\nPlease log in and change your password immediately.\n\nBest regards,\nTicketing System`;
    const html = `
      <h2>Welcome to Ticketing System</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your account has been created in the Ticketing System.</p>
      <p><strong>Email:</strong> ${email}<br>
      <strong>Temporary Password:</strong> ${password}</p>
      <p>Please log in and change your password immediately for security purposes.</p>
      <p>Best regards,<br>Ticketing System</p>
    `;
    return this.sendEmail(email, subject, text, html);
  }

  async sendTicketNotification(
    email: string,
    name: string,
    type: string,
    ticketId: string,
    description: string,
    details?: string
  ): Promise<boolean> {
    const subjectMap: Record<string, string> = {
      TICKET_CREATED: `New Ticket Created: ${ticketId}`,
      TICKET_UPDATED: `Ticket Updated: ${ticketId}`,
      TICKET_ASSIGNED: `Ticket Assigned to You: ${ticketId}`,
      TICKET_COMMENTED: `New Comment on Ticket: ${ticketId}`,
      TICKET_RESOLVED: `Ticket Resolved: ${ticketId}`,
    };

    const subject = subjectMap[type] || `Ticket Notification: ${ticketId}`;
    const text = `Hello ${name},\n\n${description}\n\n${details || ''}\n\nTicket ID: ${ticketId}\n\nBest regards,\nTicketing System`;
    const html = `
      <h2>${subject}</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>${description}</p>
      ${details ? `<p>${details}</p>` : ''}
      <p><strong>Ticket ID:</strong> ${ticketId}</p>
      <p>Best regards,<br>Ticketing System</p>
    `;
    return this.sendEmail(email, subject, text, html);
  }
}
