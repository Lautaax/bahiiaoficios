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

  app.get("/api/mp/auth-url", (req, res) => {
    const { userId, redirectUrl } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    
    let baseUrl = redirectUrl as string || process.env.APP_URL || 'http://localhost:3000';
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // The redirect URI must match exactly what is configured in the MP Developer Dashboard
    const callbackUri = `${process.env.SHARED_APP_URL || baseUrl}/api/mp/callback`;
    const clientId = process.env.MP_CLIENT_ID;
    
    if (!clientId) {
      return res.status(500).json({ error: "MP_CLIENT_ID not configured" });
    }

    const authUrl = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${userId}&redirect_uri=${callbackUri}`;
    res.json({ url: authUrl });
  });

  app.get("/api/mp/callback", async (req, res) => {
    const { code, state } = req.query;
    const userId = state as string;
    
    if (!code || !userId) {
      return res.status(400).send("Missing code or state");
    }

    try {
      const clientId = process.env.MP_CLIENT_ID;
      const clientSecret = process.env.MP_CLIENT_SECRET;
      
      // We need to reconstruct the exact same redirect_uri used in the authorization step
      // Since this is a GET request, we don't have the original redirectUrl from the client,
      // so we rely on SHARED_APP_URL or APP_URL.
      let baseUrl = process.env.SHARED_APP_URL || process.env.APP_URL || 'http://localhost:3000';
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      const callbackUri = `${baseUrl}/api/mp/callback`;

      const response = await axios.post("https://api.mercadopago.com/oauth/token", 
        new URLSearchParams({
          client_id: clientId || '',
          client_secret: clientSecret || '',
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: callbackUri
        }), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        }
      });

      if (response.data && response.data.access_token) {
        const db = admin.firestore();
        await db.collection('usuarios').doc(userId).update({
          mpConnect: {
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token,
            public_key: response.data.public_key,
            user_id: response.data.user_id,
            linkedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        });
        
        // Redirect back to profile with success
        res.redirect(`${baseUrl}/profile?mp_connected=true`);
      } else {
        console.error("Failed to exchange code for token:", response.data);
        res.redirect(`${baseUrl}/profile?mp_connected=false`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error exchanging MP code:", error.response?.data || error.message);
      } else {
        console.error("Error exchanging MP code:", error);
      }
      
      let baseUrl = process.env.SHARED_APP_URL || process.env.APP_URL || 'http://localhost:3000';
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      res.redirect(`${baseUrl}/profile?mp_connected=false`);
    }
  });

  app.post("/api/create_preference", async (req, res) => {
    let client = await getMpClient();

    if (!client) {
      return res.status(500).json({ error: "Mercado Pago not configured" });
    }

    try {
      const { title, price, quantity, userEmail, redirectUrl, metadata, type } = req.body;
      
      // Clean up baseUrl
      let baseUrl = redirectUrl || process.env.APP_URL || 'http://localhost:3000';
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      
      // Ensure notification URL is absolute and accessible
      const notificationUrl = `${process.env.SHARED_APP_URL || baseUrl}/api/webhook`;
      
      const isDeposit = type === 'deposit';
      const unitPrice = Number(price) || (isDeposit ? 10000 : 5000);
      
      // If it's a deposit, we need to use the professional's access token
      if (isDeposit && metadata?.profesional_id) {
        const db = admin.firestore();
        const profDoc = await db.collection('usuarios').doc(metadata.profesional_id).get();
        if (profDoc.exists) {
          const profData = profDoc.data();
          if (profData?.mpConnect?.access_token) {
            client = new MercadoPagoConfig({ accessToken: profData.mpConnect.access_token });
          } else {
            console.warn(`Professional ${metadata.profesional_id} does not have MP Connect linked. Using platform token.`);
          }
        }
      }

      const preference = new Preference(client);
      
      const preferenceData: any = {
        body: {
          items: [
            {
              id: isDeposit ? "deposit-payment" : "vip-subscription",
              title: title || (isDeposit ? "Seña de Reparación" : "Membresía VIP"),
              unit_price: unitPrice,
              quantity: Number(quantity) || 1,
              currency_id: "ARS",
            },
          ],
          payer: {
            email: userEmail || "test_user@test.com"
          },
          back_urls: {
            success: isDeposit ? `${baseUrl}/dashboard?payment=success` : `${baseUrl}/profile?status=success`,
            failure: isDeposit ? `${baseUrl}/dashboard?payment=failure` : `${baseUrl}/profile?status=failure`,
            pending: isDeposit ? `${baseUrl}/dashboard?payment=pending` : `${baseUrl}/profile?status=pending`,
          },
          auto_return: "approved",
          notification_url: notificationUrl,
          metadata: metadata || {},
        }
      };

      // If it's a deposit, we charge a 10% fee for the integrator
      if (isDeposit) {
        preferenceData.body.marketplace_fee = unitPrice * 0.10; // 10% fee
      }

      const result = await preference.create(preferenceData);

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
          
          const { user_id, months, type, request_id, profesional_id } = payment.metadata;
          
          if (type === 'deposit' && request_id && profesional_id) {
            try {
              const db = admin.firestore();
              const requestRef = db.collection('quoteRequests').doc(request_id);
              
              // We need to update the specific response inside the array
              // Since we can't easily update a specific array element in Firestore without reading it first,
              // we read, modify, and write back.
              const docSnap = await requestRef.get();
              if (docSnap.exists) {
                const data = docSnap.data();
                if (data && data.respuestas) {
                  const updatedRespuestas = data.respuestas.map((resp: any) => {
                    if (resp.profesionalId === profesional_id) {
                      return { ...resp, depositPaid: true, paymentId: id };
                    }
                    return resp;
                  });
                  
                  await requestRef.update({
                    respuestas: updatedRespuestas,
                    estado: 'seña_pagada',
                    profesionalSeleccionado: profesional_id
                  });
                  console.log(`Deposit paid for request ${request_id} to professional ${profesional_id}`);
                }
              }
            } catch (dbError) {
              console.error("Error updating Firestore for deposit:", dbError);
            }
          } else if (user_id && months) {
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
            console.warn("Missing required metadata for payment processing");
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

  app.post("/api/upload-github", async (req, res) => {
    const { image, filename } = req.body;
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

    if (!token || !repo) {
      return res.status(500).json({ error: "GitHub storage not configured (missing GITHUB_TOKEN or GITHUB_REPO)" });
    }

    if (!image || !filename) {
      return res.status(400).json({ error: "Missing image or filename" });
    }

    try {
      // Remove base64 prefix if present
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      
      // GitHub API URL: https://api.github.com/repos/{owner}/{repo}/contents/{path}
      const url = `https://api.github.com/repos/${repo}/contents/profile_images/${filename}`;
      
      const response = await axios.put(url, {
        message: `Upload profile image: ${filename}`,
        content: base64Data,
        branch: branch
      }, {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json"
        }
      });

      // Construct the raw URL (or jsdelivr for better CDN)
      // Raw: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/profile_images/{filename}
      const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/profile_images/${filename}`;
      
      res.json({ url: rawUrl });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("GitHub upload error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.message || "Failed to upload to GitHub" });
      } else {
        console.error("GitHub upload error:", error);
        res.status(500).json({ error: "Failed to upload to GitHub" });
      }
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
