import { getLogger } from '@logger/index.js';

const logger = getLogger();

export function emitUserDomainEvent(event: string, payload: Record<string, unknown>): void {
  logger.info({ event, ...payload }, 'User domain event');
}
