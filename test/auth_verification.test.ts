import test from 'node:test';
import assert from 'node:assert/strict';

interface MockRequest {
  headers: Record<string, string | undefined>;
}

function verifyAuthHeaderFormat(req: MockRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.split('Bearer ')[1];
  if (!token || !token.trim()) return false;
  return true;
}

test('verifyAuthHeaderFormat rejects missing or malformed Authorization header', () => {
  assert.equal(verifyAuthHeaderFormat({ headers: {} }), false);
  assert.equal(verifyAuthHeaderFormat({ headers: { authorization: 'Basic 1234' } }), false);
  assert.equal(verifyAuthHeaderFormat({ headers: { authorization: 'Bearer ' } }), false);
  assert.equal(verifyAuthHeaderFormat({ headers: { authorization: 'Bearer   ' } }), false);
});

test('verifyAuthHeaderFormat accepts valid Bearer token string', () => {
  assert.equal(verifyAuthHeaderFormat({ headers: { authorization: 'Bearer valid_id_token' } }), true);
});
