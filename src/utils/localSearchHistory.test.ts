import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
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
    test('returns empty array when nothing stored', () => {
      assert.deepEqual(getLocalSearchHistory(), []);
    });

    test('returns items stored in localStorage', () => {
      safeLocalStorage.setItem('bahia_local_search_history', JSON.stringify(['Plomero', 'Electricista']));
      assert.deepEqual(getLocalSearchHistory(), ['Plomero', 'Electricista']);
    });

    test('filters out invalid and empty entries', () => {
      safeLocalStorage.setItem(
        'bahia_local_search_history',
        JSON.stringify(['Plomero', '', '   ', null, 123, 'Electricista'])
      );
      assert.deepEqual(getLocalSearchHistory(), ['Plomero', 'Electricista']);
    });

    test('deduplicates existing duplicates in localStorage (case-insensitive)', () => {
      safeLocalStorage.setItem(
        'bahia_local_search_history',
        JSON.stringify(['Plomero', 'plomero', 'PLOMERO', 'Electricista', 'electricista'])
      );
      assert.deepEqual(getLocalSearchHistory(), ['Plomero', 'Electricista']);
    });

    test('handles JSON parse error gracefully', () => {
      safeLocalStorage.setItem('bahia_local_search_history', 'invalid-json');
      assert.deepEqual(getLocalSearchHistory(), []);
    });
  });

  describe('saveLocalSearchQuery', () => {
    test('saves new search query and prepends to history', () => {
      const history1 = saveLocalSearchQuery('Plomero');
      assert.deepEqual(history1, ['Plomero']);

      const history2 = saveLocalSearchQuery('Electricista');
      assert.deepEqual(history2, ['Electricista', 'Plomero']);
    });

    test('trims whitespace before saving query', () => {
      const history = saveLocalSearchQuery('   Gasista   ');
      assert.deepEqual(history, ['Gasista']);
    });

    test('ignores query with length less than 2 or whitespace only', () => {
      saveLocalSearchQuery('Plomero');
      const historyShort = saveLocalSearchQuery('a');
      assert.deepEqual(historyShort, ['Plomero']);

      const historyEmpty = saveLocalSearchQuery('   ');
      assert.deepEqual(historyEmpty, ['Plomero']);
    });

    test('deduplicates existing item (case-insensitive) and moves it to top', () => {
      saveLocalSearchQuery('Plomero');
      saveLocalSearchQuery('Electricista');
      saveLocalSearchQuery('Gasista');

      // Now save 'plomero' (different casing of existing 'Plomero')
      const updated = saveLocalSearchQuery('plomero');
      assert.deepEqual(updated, ['plomero', 'Gasista', 'Electricista']);
    });

    test('deduplicates when pre-existing localStorage contains duplicates', () => {
      safeLocalStorage.setItem(
        'bahia_local_search_history',
        JSON.stringify(['Plomero', 'plomero', 'Gasista', 'gasista'])
      );

      const updated = saveLocalSearchQuery('Pintor');
      assert.deepEqual(updated, ['Pintor', 'Plomero', 'Gasista']);
    });

    test('caps search history at 8 items (MAX_HISTORY_ITEMS)', () => {
      for (let i = 1; i <= 10; i++) {
        saveLocalSearchQuery(`Query ${i}`);
      }
      const history = getLocalSearchHistory();
      assert.equal(history.length, 8);
      assert.deepEqual(history, [
        'Query 10',
        'Query 9',
        'Query 8',
        'Query 7',
        'Query 6',
        'Query 5',
        'Query 4',
        'Query 3'
      ]);
    });
  });

  describe('removeLocalSearchQuery', () => {
    test('removes item case-insensitively', () => {
      saveLocalSearchQuery('Plomero');
      saveLocalSearchQuery('Electricista');

      const updated = removeLocalSearchQuery('plomero');
      assert.deepEqual(updated, ['Electricista']);
      assert.deepEqual(getLocalSearchHistory(), ['Electricista']);
    });

    test('trims query before removing', () => {
      saveLocalSearchQuery('Plomero');
      const updated = removeLocalSearchQuery('   Plomero   ');
      assert.deepEqual(updated, []);
    });
  });

  describe('clearLocalSearchHistory', () => {
    test('clears history completely', () => {
      saveLocalSearchQuery('Plomero');
      saveLocalSearchQuery('Electricista');

      clearLocalSearchHistory();
      assert.deepEqual(getLocalSearchHistory(), []);
    });
  });
});
