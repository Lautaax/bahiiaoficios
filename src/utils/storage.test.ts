import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage, safeLocalStorage, safeSessionStorage } from './storage';

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  describe('key(index)', () => {
    it('returns null when storage is empty', () => {
      expect(storage.key(0)).toBeNull();
      expect(storage.key(-1)).toBeNull();
      expect(storage.key(1)).toBeNull();
    });

    it('returns the key name at the specified index', () => {
      storage.setItem('firstKey', 'value1');
      storage.setItem('secondKey', 'value2');
      storage.setItem('thirdKey', 'value3');

      expect(storage.key(0)).toBe('firstKey');
      expect(storage.key(1)).toBe('secondKey');
      expect(storage.key(2)).toBe('thirdKey');
    });

    it('returns null for negative indices', () => {
      storage.setItem('a', '1');
      expect(storage.key(-1)).toBeNull();
      expect(storage.key(-100)).toBeNull();
    });

    it('returns null for indices >= length', () => {
      storage.setItem('a', '1');
      storage.setItem('b', '2');
      expect(storage.key(2)).toBeNull();
      expect(storage.key(10)).toBeNull();
    });

    it('returns null for non-integer or NaN indices', () => {
      storage.setItem('a', '1');
      expect(storage.key(0.5)).toBeNull();
      expect(storage.key(NaN)).toBeNull();
    });

    it('correctly handles an empty string as a key name', () => {
      storage.setItem('', 'emptyKeyValue');
      expect(storage.length).toBe(1);
      expect(storage.key(0)).toBe('');
      expect(storage.getItem('')).toBe('emptyKeyValue');
    });
  });

  describe('Storage interface standard methods', () => {
    it('getItem returns null for non-existent keys', () => {
      expect(storage.getItem('missing')).toBeNull();
    });

    it('setItem converts values to string and stores them', () => {
      storage.setItem('number', 123 as any);
      expect(storage.getItem('number')).toBe('123');
    });

    it('removeItem deletes stored key-value pair', () => {
      storage.setItem('key', 'val');
      expect(storage.getItem('key')).toBe('val');
      storage.removeItem('key');
      expect(storage.getItem('key')).toBeNull();
      expect(storage.length).toBe(0);
    });

    it('clear removes all entries', () => {
      storage.setItem('a', '1');
      storage.setItem('b', '2');
      expect(storage.length).toBe(2);
      storage.clear();
      expect(storage.length).toBe(0);
      expect(storage.getItem('a')).toBeNull();
    });
  });
});

describe('safeLocalStorage & safeSessionStorage', () => {
  it('allows set, get, and remove on safeLocalStorage', () => {
    safeLocalStorage.setItem('testKey', 'testVal');
    expect(safeLocalStorage.getItem('testKey')).toBe('testVal');
    safeLocalStorage.removeItem('testKey');
    expect(safeLocalStorage.getItem('testKey')).toBeNull();
  });

  it('allows set, get, and remove on safeSessionStorage', () => {
    safeSessionStorage.setItem('testKeySess', 'testValSess');
    expect(safeSessionStorage.getItem('testKeySess')).toBe('testValSess');
    safeSessionStorage.removeItem('testKeySess');
    expect(safeSessionStorage.getItem('testKeySess')).toBeNull();
  });
});
