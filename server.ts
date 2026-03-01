import express from "express";
import { createServer as createViteServer } from "vite";
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import admin from 'firebase-admin';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
  }
}

// Mercado Pago Client Management
let mpClient: MercadoPagoConfig | null = null;
let mpAccessToken: string | null = null;
let tokenExpiration: number | null = null;

async function getMpClient(): Promise<MercadoPagoConfig | null> {
    // If we have a client and a static token from env, return it
    if (mpClient && process.env.MP_ACCESS_TOKEN) {
        return mpClient;
    }

    // If we have a dynamic token and it's not expired (with 5 min buffer), return client
    if (mpClient && mpAccessToken && tokenExpiration && Date.now() < tokenExpiration - 300000) {
        return mpClient;
    }

    // Try to get token from Env
    let token = process.env.MP_ACCESS_TOKEN;

    // If no env token, try to fetch using Client Credentials
    if (!token && process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET) {
        try {
            console.log("Fetching MP Access Token...");
            const response = await axios.post("https://api.mercadopago.com/oauth/token", 
                new URLSearchParams({
                    client_id: process.env.MP_CLIENT_ID,
                    client_secret: process.env.MP_CLIENT_SECRET,
                    grant_type: "client_credentials"
                }), {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                }
            });

            if (response.data && response.data.access_token) {
                token = response.data.access_token;
                mpAccessToken = token;
                // Set expiration (default is usually 6 hours, use response.data.expires_in if available)
                const expiresIn = response.data.expires_in || 21600; 
                tokenExpiration = Date.now() + (expiresIn * 1000);
                console.log("MP Access Token fetched successfully");
            } else {
                console.error("Failed to fetch MP Access Token:", response.data);
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Error fetching MP Access Token:", error.response?.data || error.message);
            } else {
                console.error("Error fetching MP Access Token:", error);
            }
        }
    }

    if (token) {
        mpClient = new MercadoPagoConfig({ accessToken: token });
        return mpClient;
    }

    console.warn("Could not initialize Mercado Pago Client. Missing credentials.");
    return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/create_preference", async (req, res) => {
    const client = await getMpClient();

    if (!client) {
      return res.status(500).json({ error: "Mercado Pago not configured" });
    }

    try {
      const { title, price, quantity, userEmail, redirectUrl, metadata } = req.body;
      
      // Clean up baseUrl
      let baseUrl = redirectUrl || process.env.APP_URL || 'http://localhost:3000';
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      
      // Ensure notification URL is absolute and accessible
      // In local dev, webhooks won't work without a tunnel (ngrok), but we set it anyway
      const notificationUrl = `${process.env.SHARED_APP_URL || baseUrl}/api/webhook`;
      
      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          items: [
            {
              id: "vip-subscription",
              title: title || "Membresía VIP",
              unit_price: Number(price) || 5000,
              quantity: Number(quantity) || 1,
              currency_id: "ARS",
            },
          ],
          payer: {
            email: userEmail || "test_user@test.com"
          },
          back_urls: {
            success: `${baseUrl}/profile?status=success`,
            failure: `${baseUrl}/profile?status=failure`,
            pending: `${baseUrl}/profile?status=pending`,
          },
          auto_return: "approved",
          notification_url: notificationUrl,
          metadata: metadata || {},
        }
      });

      res.json({ id: result.id, init_point: result.init_point });
    } catch (error) {
      console.error("Error creating preference:", error);
      res.status(500).json({ error: "Failed to create preference" });
    }
  });

  app.post("/api/webhook", async (req, res) => {
    const { type, data } = req.body;
    const topic = req.body.topic || type; // MP sometimes sends 'topic' instead of 'type'
    const id = data?.id || req.body.data?.id;

    try {
      if (topic === "payment" && id) {
        const client = await getMpClient();

        if (!client) {
            console.error("MP Client not initialized");
            return res.status(500).send("MP Client not initialized");
        }
        
        console.log(`Processing payment webhook for ID: ${id}`);
        const payment = await new Payment(client).get({ id: id });
        
        if (payment.status === 'approved') {
          console.log(`Payment ${id} approved. Metadata:`, payment.metadata);
          
          const { user_id, months } = payment.metadata;
          
          if (user_id && months) {
            try {
              const db = admin.firestore();
              const userRef = db.collection('usuarios').doc(user_id);
              
              // Calculate new expiration date
              const now = new Date();
              const expirationDate = new Date(now.setMonth(now.getMonth() + Number(months)));
              
              await userRef.update({
                'profesionalInfo.isVip': true,
                'profesionalInfo.vipExpiration': admin.firestore.Timestamp.fromDate(expirationDate),
                'updatedAt': admin.firestore.FieldValue.serverTimestamp()
              });
              
              console.log(`User ${user_id} upgraded to VIP until ${expirationDate}`);
            } catch (dbError) {
              console.error("Error updating Firestore:", dbError);
              // We don't return 500 here because we want to acknowledge the webhook
              // even if our internal DB update failed (we should log it for manual fix)
            }
          } else {
            console.warn("Missing userId or months in payment metadata");
          }
        } else {
            console.log(`Payment ${id} status: ${payment.status}`);
        }
      }
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("Error");
    }
  });

  // Vite middleware for development and production (in this environment)
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  // Specific handler for /profile to ensure it works after redirect
  app.get('/profile', async (req, res) => {
    try {
      const url = req.originalUrl;
      const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      const html = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e: any) {
      console.error("Error serving index.html for /profile:", e);
      res.status(500).end(e.message);
    }
  });

  // Fallback handler for SPA
  // If Vite middleware doesn't handle the request (e.g. it's not a static file),
  // we manually serve index.html transformed by Vite.
  app.use('*', async (req, res) => {
    try {
      console.log(`Fallback handler hit for: ${req.originalUrl}`);
      const url = req.originalUrl;
      const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      const html = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e: any) {
      console.error("Error serving index.html:", e);
      res.status(500).end(e.message);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
