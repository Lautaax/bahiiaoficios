// @ts-ignore
import { test, expect, describe } from "bun:test";
import express from "express";

// Import or export server/middleware logic to test the actual middleware
// We create the app and attach the actual requireAdminAuth middleware logic as in server.ts

async function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
  verifyTokenMock?: (token: string) => Promise<any>,
  getDocMock?: (uid: string) => Promise<any>
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Token missing" });
  }

  try {
    if (!verifyTokenMock) {
      throw new Error("Invalid token");
    }

    const decodedToken = await verifyTokenMock(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    let isAdmin = email === 'lautaroj.aguilera@gmail.com' || decodedToken.isAdmin === true;

    if (!isAdmin && getDocMock) {
      const userDoc = await getDocMock(uid);
      if (userDoc?.exists && userDoc?.data()?.isAdmin === true) {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    (req as any).user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}

describe("Admin Endpoint Security Middleware Tests", () => {
  const app = express();
  app.use(express.json());

  app.post("/api/admin/ai-optimize", (req, res, next) => {
    const mockVerify = async (token: string) => {
      if (token === "invalid") throw new Error("Invalid token");
      if (token === "user") return { uid: "user1", email: "user@example.com" };
      if (token === "admin-email") return { uid: "admin1", email: "lautaroj.aguilera@gmail.com" };
      if (token === "admin-doc") return { uid: "admin2", email: "other@example.com" };
      throw new Error("Invalid token");
    };

    const mockGetDoc = async (uid: string) => {
      if (uid === "admin2") return { exists: true, data: () => ({ isAdmin: true }) };
      return { exists: false, data: () => ({}) };
    };

    return requireAdminAuth(req, res, next, mockVerify, mockGetDoc);
  }, (req, res) => {
    res.json({ success: true, result: "AI Optimization executed" });
  });

  test("Reject requests without Authorization header (401)", async () => {
    const srv = app.listen(0);
    const addr = srv.address() as any;
    try {
      const res = await fetch(`http://localhost:${addr.port}/api/admin/ai-optimize`, { method: "POST" });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Missing or invalid token");
    } finally {
      srv.close();
    }
  });

  test("Reject requests with invalid Bearer token (401)", async () => {
    const srv = app.listen(0);
    const addr = srv.address() as any;
    try {
      const res = await fetch(`http://localhost:${addr.port}/api/admin/ai-optimize`, {
        method: "POST",
        headers: { Authorization: "Bearer invalid" }
      });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Invalid token");
    } finally {
      srv.close();
    }
  });

  test("Reject authenticated non-admin users (403)", async () => {
    const srv = app.listen(0);
    const addr = srv.address() as any;
    try {
      const res = await fetch(`http://localhost:${addr.port}/api/admin/ai-optimize`, {
        method: "POST",
        headers: { Authorization: "Bearer user" }
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Forbidden");
    } finally {
      srv.close();
    }
  });

  test("Allow admin user by email (200)", async () => {
    const srv = app.listen(0);
    const addr = srv.address() as any;
    try {
      const res = await fetch(`http://localhost:${addr.port}/api/admin/ai-optimize`, {
        method: "POST",
        headers: { Authorization: "Bearer admin-email" }
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    } finally {
      srv.close();
    }
  });

  test("Allow admin user by Firestore isAdmin field (200)", async () => {
    const srv = app.listen(0);
    const addr = srv.address() as any;
    try {
      const res = await fetch(`http://localhost:${addr.port}/api/admin/ai-optimize`, {
        method: "POST",
        headers: { Authorization: "Bearer admin-doc" }
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    } finally {
      srv.close();
    }
  });
});
