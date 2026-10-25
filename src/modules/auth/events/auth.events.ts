import { getLogger } from '@logger/index.js';

const logger = getLogger();

export function emitAuthDomainEvent(event: string, payload: Record<string, unknown>): void {
  logger.info({ event, ...payload }, 'Auth domain event');
}
