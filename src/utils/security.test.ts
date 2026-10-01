import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeFilename } from './security';

describe('sanitizeFilename', () => {
  it('should preserve safe filenames', () => {
    assert.strictEqual(sanitizeFilename('profile_123.jpg'), 'profile_123.jpg');
    assert.strictEqual(sanitizeFilename('user-avatar.png'), 'user-avatar.png');
  });

  it('should strip path traversal sequences (../ and ..\\)', () => {
    assert.strictEqual(sanitizeFilename('../../etc/passwd'), 'passwd');
    assert.strictEqual(sanitizeFilename('..\\..\\windows\\system32'), 'system32');
    assert.strictEqual(sanitizeFilename('../../../.github/workflows/deploy.yml'), 'deploy.yml');
  });

  it('should replace special and unsafe characters', () => {
    assert.strictEqual(sanitizeFilename('file with spaces.png'), 'file_with_spaces.png');
    assert.strictEqual(sanitizeFilename('image<script>.png'), 'image_script_.png');
  });

  it('should return empty string for invalid inputs', () => {
    assert.strictEqual(sanitizeFilename(''), '');
    assert.strictEqual(sanitizeFilename('..'), '');
    assert.strictEqual(sanitizeFilename('.'), '');
  });
});
