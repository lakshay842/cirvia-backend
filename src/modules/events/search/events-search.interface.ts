import type { EventSearchFilters } from '../types/events.types.js';

export interface EventSearchResultItem {
  slug: string;
  title: string;
  city: string | null;
  price: number;
  eventStart: Date;
}

/**
 * Search architecture placeholder — full Meilisearch/Elasticsearch deferred.
 */
export interface EventSearchService {
  search(
    filters: EventSearchFilters,
    page: number,
    limit: number,
  ): Promise<{ items: EventSearchResultItem[]; total: number }>;
}

export class EventSearchStub implements EventSearchService {
  async search(_filters: EventSearchFilters, _page: number, _limit: number) {
    return { items: [], total: 0 };
  }
}

export const eventSearchStub = new EventSearchStub();
