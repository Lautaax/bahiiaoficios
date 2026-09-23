import { safeLocalStorage } from './storage';

const STORAGE_KEY = 'bahia_local_search_history';
const MAX_HISTORY_ITEMS = 8;

/**
 * Retrieves the local search history from localStorage.
 */
export function getLocalSearchHistory(): string[] {
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
    }
  } catch (error) {
    console.warn('[localSearchHistory] Error reading history:', error);
  }
  return [];
}

/**
 * Saves a new search query to the top of localStorage history.
 * Trims, removes duplicates (case-insensitive), and limits to MAX_HISTORY_ITEMS.
 */
export function saveLocalSearchQuery(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return getLocalSearchHistory();
  }

  try {
    const current = getLocalSearchHistory();
    // Filter out duplicate (case-insensitive)
    const filtered = current.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
    // Prepend new item
    const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('[localSearchHistory] Error saving query:', error);
    return getLocalSearchHistory();
  }
}

/**
 * Removes a specific query from the history.
 */
export function removeLocalSearchQuery(query: string): string[] {
  try {
    const current = getLocalSearchHistory();
    const updated = current.filter(item => item.toLowerCase() !== query.trim().toLowerCase());
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('[localSearchHistory] Error removing query:', error);
    return getLocalSearchHistory();
  }
}

/**
 * Clears the entire local search history.
 */
export function clearLocalSearchHistory(): void {
  try {
    safeLocalStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[localSearchHistory] Error clearing history:', error);
  }
}
