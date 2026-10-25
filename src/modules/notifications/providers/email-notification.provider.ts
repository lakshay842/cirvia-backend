import { getLogger } from '@logger/index.js';
import { emailService } from '../../../services/email.service.js';
import type {
  EmailNotificationPayload,
  NotificationChannelProvider,
} from './notification-provider.interface.js';

const logger = getLogger();

export class SmtpEmailNotificationProvider implements NotificationChannelProvider<EmailNotificationPayload> {
  readonly name = 'smtp';

  async send(payload: EmailNotificationPayload): Promise<void> {
    const transporterAvailable = Boolean(process.env.SMTP_HOST);
    if (!transporterAvailable) {
      logger.info(
        { to: payload.to, subject: payload.subject, userId: payload.userId },
        'Notification email logged (SMTP not configured)',
      );
      return;
    }

    await emailService.sendNotificationEmail(payload.to, payload.subject, payload.html);
    logger.info({ userId: payload.userId, notificationId: payload.notificationId }, 'Notification email sent');
  }
}

export const smtpEmailNotificationProvider = new SmtpEmailNotificationProvider();
