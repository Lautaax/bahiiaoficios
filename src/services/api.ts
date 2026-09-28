import { Category } from '../types';
import { PROFESSIONS } from '../constants';
import { analyticsService } from './analyticsService';

export const api = {
  getCategories: async (): Promise<Category[]> => {
    return PROFESSIONS.map((p, index) => ({
      id: (index + 1).toString(),
      name: p.name,
      slug: p.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }));
  },
  
  trackSearch: async (rubro: string) => {
    if (!rubro) return;
    try {
      await analyticsService.trackSearch(rubro);
    } catch (error) {
      console.error("Error tracking search in api:", error);
    }
  }
};
