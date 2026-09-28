// @ts-ignore
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import express from "express";
import admin from "firebase-admin";

// Set environment variable for testing admin secret key authentication
process.env.ADMIN_SECRET_KEY = "test-admin-secret-key-98765";

// Helper logic mirroring server.ts verifyAdminAuth
async function verifyAdminAuth(req: express.Request): Promise<{ authorized: boolean; status: number; message: string }> {
  const adminKeyHeader = req.headers['x-admin-key'] || req.headers['x-api-key'];
  const expectedAdminKey = process.env.ADMIN_SECRET_KEY || process.env.CRON_SECRET;
  if (expectedAdminKey && adminKeyHeader === expectedAdminKey) {
    return { authorized: true, status: 200, message: "Authorized by admin secret key" };
  }

  const authHeader = req.headers.authorization;
  let idToken: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    idToken = authHeader.split('Bearer ')[1];
  } else if (req.body && req.body.idToken) {
    idToken = req.body.idToken;
  }

  if (!idToken) {
    return { authorized: false, status: 401, message: "Autenticación requerida. Token de autorización no provisto." };
  }

  try {
    if (!admin.apps.length) {
      return { authorized: false, status: 401, message: "Servicio de autenticación no inicializado en el servidor." };
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const isSuperAdmin = decodedToken.email === 'lautaroj.aguilera@gmail.com';
    const hasAdminClaim = decodedToken.admin === true || decodedToken.isAdmin === true;

    if (isSuperAdmin || hasAdminClaim) {
      return { authorized: true, status: 200, message: "Authorized admin user" };
    }

    return { authorized: false, status: 403, message: "Acceso denegado. Se requieren permisos de administrador." };
  } catch (error: any) {
    return { authorized: false, status: 401, message: "Token de autenticación inválido o expirado." };
  }
}

describe("POST /api/sync-vips authentication & authorization tests", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  beforeAll((done) => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "test-project" });
    }

    app = express();
    app.use(express.json());

    app.post("/api/sync-vips", async (req, res) => {
      const authResult = await verifyAdminAuth(req);
      if (!authResult.authorized) {
        return res.status(authResult.status).json({ error: authResult.message });
      }

      res.json({ success: true, expiredCount: 0, message: "Client-side VIP sync enabled" });
    });

    server = app.listen(0, () => {
      const port = (server.address() as any).port;
      baseUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  it("should reject unauthenticated requests with 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/sync-vips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Autenticación requerida");
  });

  it("should reject requests with invalid Bearer token with 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/sync-vips`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer invalid-token-xyz"
      }
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("should accept requests with valid admin secret key header", async () => {
    const res = await fetch(`${baseUrl}/api/sync-vips`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": "test-admin-secret-key-98765"
      }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
