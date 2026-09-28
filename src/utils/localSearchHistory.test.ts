import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocalSearchHistory,
  saveLocalSearchQuery,
  removeLocalSearchQuery,
  clearLocalSearchHistory
} from './localSearchHistory';
import { safeLocalStorage } from './storage';

describe('localSearchHistory', () => {
  beforeEach(() => {
    clearLocalSearchHistory();
  });

  describe('getLocalSearchHistory', () => {
    it('returns empty array when no history exists', () => {
      expect(getLocalSearchHistory()).toEqual([]);
    });

    it('returns valid search history items from storage', () => {
      safeLocalStorage.setItem('bahia_local_search_history', JSON.stringify(['Plomero', 'Electricista']));
      expect(getLocalSearchHistory()).toEqual(['Plomero', 'Electricista']);
    });

    it('filters out non-string or whitespace-only items', () => {
      safeLocalStorage.setItem(
        'bahia_local_search_history',
        JSON.stringify(['Plomero', 123, '   ', null, 'Pintor'])
      );
      expect(getLocalSearchHistory()).toEqual(['Plomero', 'Pintor']);
    });

    it('handles corrupted JSON gracefully', () => {
      safeLocalStorage.setItem('bahia_local_search_history', '{invalid json');
      expect(getLocalSearchHistory()).toEqual([]);
    });
  });

  describe('saveLocalSearchQuery', () => {
    it('saves a valid search query', () => {
      const result = saveLocalSearchQuery('Plomero');
      expect(result).toEqual(['Plomero']);
      expect(getLocalSearchHistory()).toEqual(['Plomero']);
    });

    it('ignores empty queries or queries shorter than 2 chars', () => {
      saveLocalSearchQuery('Plomero');
      expect(saveLocalSearchQuery('')).toEqual(['Plomero']);
      expect(saveLocalSearchQuery(' ')).toEqual(['Plomero']);
      expect(saveLocalSearchQuery('a')).toEqual(['Plomero']);
    });

    it('prepends new queries and removes case-insensitive duplicates', () => {
      saveLocalSearchQuery('Plomero');
      saveLocalSearchQuery('Electricista');
      const updated = saveLocalSearchQuery('plomero');

      expect(updated).toEqual(['plomero', 'Electricista']);
      expect(getLocalSearchHistory()).toEqual(['plomero', 'Electricista']);
    });

    it('respects MAX_HISTORY_ITEMS limit (8)', () => {
      for (let i = 1; i <= 10; i++) {
        saveLocalSearchQuery(`Query ${i}`);
      }
      const history = getLocalSearchHistory();
      expect(history.length).toBe(8);
      expect(history[0]).toBe('Query 10');
      expect(history.includes('Query 1')).toBe(false);
      expect(history.includes('Query 3')).toBe(true);
    });
  });

  describe('removeLocalSearchQuery', () => {
    it('removes an existing query (case-insensitive and trimmed)', () => {
      saveLocalSearchQuery('Plomero');
      saveLocalSearchQuery('Electricista');

      const result = removeLocalSearchQuery('  plomero  ');
      expect(result).toEqual(['Electricista']);
      expect(getLocalSearchHistory()).toEqual(['Electricista']);
    });

    it('returns identical array when query does not exist in history', () => {
      saveLocalSearchQuery('Plomero');
      saveLocalSearchQuery('Electricista');

      const currentBefore = getLocalSearchHistory();
      const result = removeLocalSearchQuery('Carpintero');

      expect(result).toEqual(currentBefore);
      expect(result).toEqual(['Electricista', 'Plomero']);
      expect(getLocalSearchHistory()).toEqual(['Electricista', 'Plomero']);
    });

    it('handles removing query from empty history', () => {
      const result = removeLocalSearchQuery('Plomero');
      expect(result).toEqual([]);
      expect(getLocalSearchHistory()).toEqual([]);
    });
  });

  describe('clearLocalSearchHistory', () => {
    it('removes all items from history', () => {
      saveLocalSearchQuery('Plomero');
      saveLocalSearchQuery('Electricista');
      expect(getLocalSearchHistory().length).toBe(2);

      clearLocalSearchHistory();
      expect(getLocalSearchHistory()).toEqual([]);
    });
  });
});
