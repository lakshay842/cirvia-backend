import type { HostSearchFilters } from '../types/hosts.types.js';

/**
 * Search architecture placeholder — full implementation deferred to Search Module.
 * Filters: city, rating, verified, language, category (future).
 */
export interface HostSearchResult {
  slug: string;
  displayName: string;
  city: string | null;
  hostRating: number;
  isVerified: boolean;
  languages: string[];
}

export interface HostSearchService {
  searchHosts(filters: HostSearchFilters, page: number, limit: number): Promise<{
    items: HostSearchResult[];
    total: number;
  }>;
}

export class HostSearchStub implements HostSearchService {
  async searchHosts(_filters: HostSearchFilters, _page: number, _limit: number) {
    return { items: [], total: 0 };
  }
}

export const hostSearchStub = new HostSearchStub();
