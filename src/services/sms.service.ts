import { getLogger } from '@logger/index.js';
import { getConfig } from '@config/index.js';

const logger = getLogger();

export class SmsService {
  async sendOtp(phone: string, otp: string): Promise<void> {
    const config = getConfig();
    if (config.NODE_ENV === 'production' && !process.env.SMS_PROVIDER_URL) {
      logger.warn({ phone }, 'SMS provider not configured in production');
      return;
    }
    logger.info({ phone }, 'SMS OTP sent (dev log — configure SMS_PROVIDER_URL for production)');
    logger.debug({ otp }, 'SMS OTP content');
  }
}

export const smsService = new SmsService();
