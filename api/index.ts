import express from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import admin from 'firebase-admin';
import axios from 'axios';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// Initialize Firebase Admin (Lazy)
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
    }
    console.log("Firebase Admin initialized");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
  }
}

/**
 * Validates MercadoPago Webhook x-signature header.
 *
 * Header format: ts=<timestamp>,v1=<hash>
 * Manifest format: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 */
export function verifyMercadoPagoSignature(req: express.Request): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET || process.env.MP_SECRET_KEY;
  if (!secret) {
    console.warn("MP_WEBHOOK_SECRET is not configured. Skipping webhook signature validation in unconfigured environment.");
    return true;
  }

  const xSignature = req.headers["x-signature"] as string | undefined;
  const xRequestId = req.headers["x-request-id"] as string | undefined;

  if (!xSignature) {
    console.error("Webhook request missing x-signature header");
    return false;
  }

  const parts = xSignature.split(",");
  let ts: string | null = null;
  let hashV1: string | null = null;

  for (const part of parts) {
    const [key, val] = part.trim().split("=");
    if (key === "ts") ts = val;
    if (key === "v1") hashV1 = val;
  }

  if (!ts || !hashV1) {
    console.error("Invalid x-signature header format");
    return false;
  }

  const dataId = (req.query["data.id"] as string) || (req.query.id as string) || req.body?.data?.id || req.body?.id || "";

  const manifest = `id:${dataId};request-id:${xRequestId || ""};ts:${ts};`;

  const computedHash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    const computedBuffer = Buffer.from(computedHash, "hex");
    const v1Buffer = Buffer.from(hashV1, "hex");

    if (computedBuffer.length !== v1Buffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuffer, v1Buffer);
  } catch (error) {
    console.error("Error comparing signature hashes:", error);
    return false;
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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: "vercel" });
});

app.post("/api/create_preference", async (req, res) => {
  const client = await getMpClient();

  if (!client) {
    return res.status(500).json({ error: "Mercado Pago not configured." });
  }

  try {
    const { title, price, quantity, userEmail, redirectUrl, metadata } = req.body;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = redirectUrl || `${protocol}://${host}`;
    const notificationUrl = `${baseUrl}/api/webhook`;
    
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
    if (!verifyMercadoPagoSignature(req)) {
      console.error("Unauthorized webhook request: invalid or missing signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const { type, data } = req.body;
    const topic = req.body.topic || type;
    const id = data?.id || req.body.data?.id || (req.query["data.id"] as string) || (req.query.id as string);

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

export default app;
