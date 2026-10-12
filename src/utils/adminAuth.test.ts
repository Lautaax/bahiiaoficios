import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAdminAuth } from '../../server';

test('verifyAdminAuth returns false when authorization header is missing', async () => {
  const req = { headers: {} } as any;
  const isAuth = await verifyAdminAuth(req);
  assert.equal(isAuth, false);
});

test('verifyAdminAuth returns false when authorization header does not start with Bearer', async () => {
  const req = { headers: { authorization: 'Basic 12345' } } as any;
  const isAuth = await verifyAdminAuth(req);
  assert.equal(isAuth, false);
});

test('verifyAdminAuth returns false when Bearer token is empty', async () => {
  const req = { headers: { authorization: 'Bearer ' } } as any;
  const isAuth = await verifyAdminAuth(req);
  assert.equal(isAuth, false);
});

test('verifyAdminAuth returns false when token is invalid or unverified', async () => {
  const req = { headers: { authorization: 'Bearer invalid.token.value' } } as any;
  const isAuth = await verifyAdminAuth(req);
  assert.equal(isAuth, false);
});
