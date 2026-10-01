/**
 * Sanitizes a filename to prevent path traversal vulnerabilities (CWE-22).
 * Removes path separators (/ and \) and restricts characters to alphanumeric, underscores, hyphens, and dots.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }
  // Normalize Windows path separators to POSIX
  const posixPath = filename.replace(/\\/g, '/');
  // Extract basename without relying on Node's 'path' module
  const baseName = posixPath.split('/').pop() || '';
  // Restrict to safe characters (alphanumeric, underscore, hyphen, dot)
  const safeName = baseName.replace(/[^a-zA-Z0-9_.-]/g, '_');
  if (safeName === '.' || safeName === '..') {
    return '';
  }
  return safeName;
}
