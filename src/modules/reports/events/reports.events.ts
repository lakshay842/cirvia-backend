import { getLogger } from '@logger/index.js';

const logger = getLogger();

export type ReportDomainEvent =
  | 'report.submitted'
  | 'report.assigned'
  | 'report.resolved'
  | 'report.rejected'
  | 'report.closed'
  | 'report.note_added';

export function emitReportDomainEvent(event: ReportDomainEvent, payload: Record<string, unknown>): void {
  logger.info({ event, ...payload }, 'Report domain event');
}

export async function bridgeReportEventToNotifications(
  trigger: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const { notificationsService } = await import('../../notifications/service/notifications.service.js');
    await notificationsService.enqueueTrigger(trigger, payload);
  } catch (error) {
    logger.warn({ trigger, err: error }, 'Failed to enqueue report notification');
  }
}
