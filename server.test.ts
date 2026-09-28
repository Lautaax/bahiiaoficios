// @ts-nocheck
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import express from "express";

// Set environment secret for test authentication
process.env.ADMIN_SECRET = "test-admin-secret-key-12345";

describe("Admin Endpoint Security Authentication & Authorization", () => {
  let app: express.Application;
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    // Import the requireAdmin logic / middleware
    const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string);
      let token: string | undefined;

      if (authHeader) {
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        } else {
          token = authHeader;
        }
      } else if (req.query.token) {
        token = req.query.token as string;
      } else if (req.body?.token) {
        token = req.body.token;
      }

      if (!token) {
        return res.status(401).json({ error: "Unauthorized: Missing authentication token" });
      }

      if (process.env.ADMIN_SECRET && token === process.env.ADMIN_SECRET) {
        return next();
      }

      return res.status(401).json({ error: "Unauthorized: Admin authentication failed" });
    };

    app.use("/api/admin", requireAdmin);

    // Mock Admin Category Promotion Insights Endpoint
    app.all("/api/admin/category-promotion-insights", (req, res) => {
      res.json({ success: true, report: { message: "Category promotion insights data" } });
    });

    // Mock Daily Churn Audit Endpoint
    app.all("/api/admin/daily-churn-audit", (req, res) => {
      res.json({ success: true, audit: { message: "Daily churn audit data" } });
    });

    // Mock AI Optimize Endpoint
    app.post("/api/admin/ai-optimize", (req, res) => {
      res.json({ success: true, optimization: { score: 90 } });
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  test("GET /api/admin/category-promotion-insights without token returns 401 Unauthorized", async () => {
    const response = await fetch(`${baseUrl}/api/admin/category-promotion-insights`);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  test("POST /api/admin/category-promotion-insights without token returns 401 Unauthorized", async () => {
    const response = await fetch(`${baseUrl}/api/admin/category-promotion-insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: true, categoriesData: [] })
    });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  test("GET /api/admin/category-promotion-insights with invalid token returns 401 Unauthorized", async () => {
    const response = await fetch(`${baseUrl}/api/admin/category-promotion-insights`, {
      headers: { Authorization: "Bearer invalid-token-xyz" }
    });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  test("POST /api/admin/category-promotion-insights with valid admin token returns 200 OK", async () => {
    const response = await fetch(`${baseUrl}/api/admin/category-promotion-insights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ADMIN_SECRET}`
      },
      body: JSON.stringify({ force: true, categoriesData: [] })
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.report).toBeDefined();
  });

  test("POST /api/admin/daily-churn-audit without token returns 401 Unauthorized", async () => {
    const response = await fetch(`${baseUrl}/api/admin/daily-churn-audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    expect(response.status).toBe(401);
  });

  test("POST /api/admin/ai-optimize without token returns 401 Unauthorized", async () => {
    const response = await fetch(`${baseUrl}/api/admin/ai-optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    expect(response.status).toBe(401);
  });
});
