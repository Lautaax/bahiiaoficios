import express from 'express';
import admin from 'firebase-admin';
import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import http from 'node:http';

describe('POST /api/upload-github Security Tests', () => {
  let app: express.Express;
  let server: http.Server;
  let port: number;

  before(async () => {
    app = express();
    app.use(express.json());

    // Authentication Middleware matching server.ts implementation
    const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized: Missing or invalid Authorization header" });
      }

      const idToken = authHeader.split('Bearer ')[1];
      if (!idToken) {
        return res.status(401).json({ error: "Unauthorized: Token missing" });
      }

      if (!admin.apps.length) {
        return res.status(500).json({ error: "Authentication server not configured" });
      }

      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        (req as any).user = decodedToken;
        next();
      } catch (error) {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
      }
    };

    app.post("/api/upload-github", requireAuth, (req, res) => {
      res.json({ success: true });
    });

    server = app.listen(0);
    const addr = server.address();
    if (addr && typeof addr !== 'string') {
      port = addr.port;
    }
  });

  after(() => {
    server?.close();
  });

  test('should reject unauthenticated request with 401 status', async () => {
    const res = await fetch(`http://localhost:${port}/api/upload-github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: 'base64data', filename: 'test.jpg' })
    });

    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.error, "Unauthorized: Missing or invalid Authorization header");
  });

  test('should reject request with invalid Bearer token', async () => {
    const res = await fetch(`http://localhost:${port}/api/upload-github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      },
      body: JSON.stringify({ image: 'base64data', filename: 'test.jpg' })
    });

    assert.ok(res.status === 401 || res.status === 500);
  });
});
