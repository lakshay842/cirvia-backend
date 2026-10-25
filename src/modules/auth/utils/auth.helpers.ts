import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { DevicePlatform } from '@prisma/client';
import type { DeviceContext } from '../types/auth.types.js';

export function getDeviceContext(req: Request): DeviceContext {
  const userAgent = req.headers['user-agent'] ?? '';
  const platformHeader = req.headers['x-device-platform'];
  const deviceIdHeader = req.headers['x-device-id'];

  let deviceType: DevicePlatform = DevicePlatform.WEB;
  if (typeof platformHeader === 'string') {
    const normalized = platformHeader.toUpperCase();
    if (normalized === 'ANDROID') deviceType = DevicePlatform.ANDROID;
    if (normalized === 'IOS') deviceType = DevicePlatform.IOS;
  } else if (/android/i.test(userAgent)) {
    deviceType = DevicePlatform.ANDROID;
  } else if (/iphone|ipad/i.test(userAgent)) {
    deviceType = DevicePlatform.IOS;
  }

  const context: DeviceContext = { deviceType };

  if (typeof req.headers['x-device-name'] === 'string') {
    context.deviceName = req.headers['x-device-name'];
  }
  if (userAgent) {
    context.browser = userAgent;
    context.operatingSystem = userAgent;
  }
  if (req.ip) {
    context.ipAddress = req.ip;
  }
  if (typeof deviceIdHeader === 'string' && deviceIdHeader.length > 0) {
    context.deviceId = deviceIdHeader;
  } else if (userAgent) {
    context.deviceId = createHash('sha256').update(userAgent).digest('hex').slice(0, 32);
  }

  return context;
}
