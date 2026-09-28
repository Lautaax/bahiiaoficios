import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLocalSearchHistory,
  saveLocalSearchQuery,
  removeLocalSearchQuery,
  clearLocalSearchHistory,
} from './localSearchHistory';
import { safeLocalStorage } from './storage';

const STORAGE_KEY = 'bahia_local_search_history';

describe('localSearchHistory', () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(STORAGE_KEY);
    vi.restoreAllMocks();
  });

  describe('getLocalSearchHistory', () => {
    it('returns an empty array when storage is empty or null', () => {
      expect(getLocalSearchHistory()).toEqual([]);
    });

    it('returns an empty array when storage item is an empty string', () => {
      safeLocalStorage.setItem(STORAGE_KEY, '');
      expect(getLocalSearchHistory()).toEqual([]);
    });

    it('returns valid string array from storage', () => {
      const history = ['plomero', 'electricista', 'pintor'];
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(history));

      expect(getLocalSearchHistory()).toEqual(history);
    });

    it('filters out non-string items, empty strings, and whitespace-only strings', () => {
      const invalidData = [
        'plomero',
        '',
        '   ',
        123,
        null,
        undefined,
        { name: 'test' },
        'gasista',
      ];
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(invalidData));

      expect(getLocalSearchHistory()).toEqual(['plomero', 'gasista']);
    });

    it('returns an empty array when parsed JSON is not an array', () => {
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify({ key: 'value' }));
      expect(getLocalSearchHistory()).toEqual([]);

      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify('just a string'));
      expect(getLocalSearchHistory()).toEqual([]);

      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(100));
      expect(getLocalSearchHistory()).toEqual([]);
    });

    it('returns an empty array and logs warning when JSON is invalid', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      safeLocalStorage.setItem(STORAGE_KEY, '{invalid json syntax}');

      expect(getLocalSearchHistory()).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        '[localSearchHistory] Error reading history:',
        expect.any(Error)
      );
    });

    it('returns an empty array when storage access throws an exception', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(safeLocalStorage, 'getItem').mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      expect(getLocalSearchHistory()).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        '[localSearchHistory] Error reading history:',
        expect.any(Error)
      );
    });
  });

  describe('saveLocalSearchQuery', () => {
    it('ignores queries with less than 2 characters or whitespace only', () => {
      expect(saveLocalSearchQuery('')).toEqual([]);
      expect(saveLocalSearchQuery(' ')).toEqual([]);
      expect(saveLocalSearchQuery('a')).toEqual([]);

      // Ensure storage remains unchanged
      expect(getLocalSearchHistory()).toEqual([]);
    });

    it('saves valid query to empty history', () => {
      const result = saveLocalSearchQuery('plomero');
      expect(result).toEqual(['plomero']);
      expect(getLocalSearchHistory()).toEqual(['plomero']);
    });

    it('prepends new queries to history', () => {
      saveLocalSearchQuery('plomero');
      const result = saveLocalSearchQuery('electricista');

      expect(result).toEqual(['electricista', 'plomero']);
      expect(getLocalSearchHistory()).toEqual(['electricista', 'plomero']);
    });

    it('deduplicates queries case-insensitively and moves newest query to top', () => {
      saveLocalSearchQuery('Plomero');
      saveLocalSearchQuery('electricista');
      const result = saveLocalSearchQuery('PLOMERO');

      expect(result).toEqual(['PLOMERO', 'electricista']);
      expect(getLocalSearchHistory()).toEqual(['PLOMERO', 'electricista']);
    });

    it('limits search history to MAX_HISTORY_ITEMS (8 items)', () => {
      for (let i = 1; i <= 10; i++) {
        saveLocalSearchQuery(`item${i}`);
      }

      const history = getLocalSearchHistory();
      expect(history.length).toBe(8);
      expect(history).toEqual([
        'item10',
        'item9',
        'item8',
        'item7',
        'item6',
        'item5',
        'item4',
        'item3',
      ]);
    });

    it('handles exception gracefully during save and returns current history', () => {
      saveLocalSearchQuery('plomero');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(safeLocalStorage, 'setItem').mockImplementationOnce(() => {
        throw new Error('Storage write error');
      });

      const result = saveLocalSearchQuery('electricista');
      expect(result).toEqual(['plomero']);
      expect(warnSpy).toHaveBeenCalledWith(
        '[localSearchHistory] Error saving query:',
        expect.any(Error)
      );
    });
  });

  describe('removeLocalSearchQuery', () => {
    it('removes specific query from history case-insensitively', () => {
      saveLocalSearchQuery('plomero');
      saveLocalSearchQuery('electricista');
      saveLocalSearchQuery('pintor');

      const result = removeLocalSearchQuery('ELECTRICISTA');
      expect(result).toEqual(['pintor', 'plomero']);
      expect(getLocalSearchHistory()).toEqual(['pintor', 'plomero']);
    });

    it('returns same history if query to remove is not found', () => {
      saveLocalSearchQuery('plomero');
      const result = removeLocalSearchQuery('carpintero');

      expect(result).toEqual(['plomero']);
    });

    it('handles exception gracefully during removal', () => {
      saveLocalSearchQuery('plomero');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(safeLocalStorage, 'setItem').mockImplementationOnce(() => {
        throw new Error('Storage remove error');
      });

      const result = removeLocalSearchQuery('plomero');
      expect(result).toEqual(['plomero']);
      expect(warnSpy).toHaveBeenCalledWith(
        '[localSearchHistory] Error removing query:',
        expect.any(Error)
      );
    });
  });

  describe('clearLocalSearchHistory', () => {
    it('clears all items from history', () => {
      saveLocalSearchQuery('plomero');
      saveLocalSearchQuery('electricista');

      clearLocalSearchHistory();
      expect(getLocalSearchHistory()).toEqual([]);
    });

    it('handles exception gracefully during clear', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(safeLocalStorage, 'removeItem').mockImplementationOnce(() => {
        throw new Error('Storage clear error');
      });

      clearLocalSearchHistory();
      expect(warnSpy).toHaveBeenCalledWith(
        '[localSearchHistory] Error clearing history:',
        expect.any(Error)
      );
    });
  });
});
