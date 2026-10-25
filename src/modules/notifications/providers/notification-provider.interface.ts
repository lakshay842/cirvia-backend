export interface EmailNotificationPayload {
  to: string;
  subject: string;
  html: string;
  userId: string;
  notificationId?: string;
}

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  deviceTokens: string[];
}

export interface NotificationChannelProvider<TPayload> {
  readonly name: string;
  send(payload: TPayload): Promise<void>;
}
