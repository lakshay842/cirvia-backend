import nodemailer from 'nodemailer';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';
import {
  emailVerificationTemplate,
  passwordResetTemplate,
  securityAlertTemplate,
  simpleNoticeTemplate,
} from './email-templates.js';

const logger = getLogger();

export class EmailService {
  private getTransporter() {
    const config = getConfig();
    if (!config.SMTP_HOST) {
      return null;
    }
    return nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT ?? 587,
      secure: (config.SMTP_PORT ?? 587) === 465,
      auth:
        config.SMTP_USER && config.SMTP_PASSWORD
          ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
          : undefined,
    });
  }

  private getFromAddress(): string {
    const config = getConfig();
    if (config.MAIL_FROM) {
      return config.MAIL_FROM;
    }
    if (config.SMTP_USER) {
      return `Cirvia <${config.SMTP_USER}>`;
    }
    return 'Cirvia <noreply@cirvia.com>';
  }

  private getAppBaseUrl(): string {
    const config = getConfig();
    return config.CORS_ORIGINS.split(',')[0]?.trim() || 'http://localhost:3001';
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const verifyUrl = `${this.getAppBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    const { subject, html } = emailVerificationTemplate(verifyUrl);
    await this.send(email, subject, html);
  }

  async sendPasswordReset(email: string, resetToken: string, otp: string): Promise<void> {
    const { subject, html } = passwordResetTemplate(otp, resetToken);
    await this.send(email, subject, html);
  }

  async sendSecurityAlert(email: string, message: string): Promise<void> {
    const { subject, html } = securityAlertTemplate(message);
    await this.send(email, subject, html);
  }

  async sendVerificationSubmitted(email: string, verificationId: string): Promise<void> {
    const { subject, html } = simpleNoticeTemplate(
      'Cirvia — Verification submitted',
      'Verification submitted',
      [
        'Your identity verification request has been submitted successfully.',
        `Reference: ${verificationId}`,
        'We will notify you once the review is complete.',
      ],
    );
    await this.send(email, subject, html);
  }

  async sendVerificationApproved(email: string): Promise<void> {
    const { subject, html } = simpleNoticeTemplate(
      'Cirvia — Verification approved',
      'Verification approved',
      [
        'Congratulations! Your identity verification has been approved.',
        'You now have full access to verified features on Cirvia.',
      ],
      { label: 'Open Cirvia', url: this.getAppBaseUrl() },
    );
    await this.send(email, subject, html);
  }

  async sendVerificationRejected(email: string, reason: string): Promise<void> {
    const { subject, html } = simpleNoticeTemplate(
      'Cirvia — Verification rejected',
      'Verification not approved',
      [
        'Your identity verification was not approved.',
        `Reason: ${reason}`,
        'You may resubmit your verification from your profile.',
      ],
      { label: 'Go to profile', url: `${this.getAppBaseUrl()}/profile/verification` },
    );
    await this.send(email, subject, html);
  }

  async sendVerificationExpired(email: string): Promise<void> {
    const { subject, html } = simpleNoticeTemplate(
      'Cirvia — Verification expired',
      'Verification expired',
      [
        'Your verification request has expired.',
        'Please submit a new verification request from your profile.',
      ],
      { label: 'Resubmit verification', url: `${this.getAppBaseUrl()}/profile/verification` },
    );
    await this.send(email, subject, html);
  }

  async sendReuploadRequired(email: string, reason: string): Promise<void> {
    const { subject, html } = simpleNoticeTemplate(
      'Cirvia — Re-upload required',
      'Additional documents needed',
      [
        'Additional documents are required for your verification.',
        `Reason: ${reason}`,
        'Please log in and upload the requested documents.',
      ],
      { label: 'Upload documents', url: `${this.getAppBaseUrl()}/profile/verification` },
    );
    await this.send(email, subject, html);
  }

  async sendHostWelcome(email: string, displayName: string): Promise<void> {
    const { subject, html } = simpleNoticeTemplate(
      'Cirvia — Welcome, Host!',
      `Welcome, ${displayName}`,
      [
        'Welcome to Cirvia Hosts! Your application has been submitted and is pending review.',
        'Complete your profile to get approved faster.',
      ],
      { label: 'Open host dashboard', url: `${this.getAppBaseUrl()}/host/dashboard` },
    );
    await this.send(email, subject, html);
  }

  async sendHostApproved(email: string): Promise<void> {
    const { subject, html } = simpleNoticeTemplate(
      'Cirvia — Host application approved',
      'You are approved to host',
      [
        'Congratulations! Your host application has been approved.',
        'You can now start creating events on Cirvia.',
      ],
      { label: 'Create an event', url: `${this.getAppBaseUrl()}/host/events/create` },
    );
    await this.send(email, subject, html);
  }

  async sendHostRejected(email: string, reason: string): Promise<void> {
    const { subject, html } = simpleNoticeTemplate(
      'Cirvia — Host application rejected',
      'Host application not approved',
      [
        'Your host application was not approved.',
        `Reason: ${reason}`,
        'Please contact support if you have questions.',
      ],
    );
    await this.send(email, subject, html);
  }

  async sendHostVerificationReminder(email: string): Promise<void> {
    const { subject, html } = simpleNoticeTemplate(
      'Cirvia — Complete your host verification',
      'Finish host verification',
      [
        'Your host profile is incomplete.',
        'Please upload required documents and complete verification to get approved.',
      ],
      { label: 'Complete verification', url: `${this.getAppBaseUrl()}/become-host` },
    );
    await this.send(email, subject, html);
  }

  async sendNotificationEmail(to: string, subject: string, html: string): Promise<void> {
    await this.send(to, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const transporter = this.getTransporter();

    if (!transporter) {
      logger.info({ to, subject }, 'Email not sent (SMTP not configured) — development log');
      logger.debug({ html }, 'Email content');
      return;
    }

    try {
      const info = await transporter.sendMail({
        from: this.getFromAddress(),
        to,
        subject,
        html,
      });
      logger.info({ to, subject, messageId: info.messageId }, 'Email sent successfully');
    } catch (error) {
      logger.error({ err: error, to, subject }, 'Failed to send email');
      throw error;
    }
  }
}

export const emailService = new EmailService();
