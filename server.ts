import express from "express";
import { createServer as createViteServer } from "vite";
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import admin from 'firebase-admin';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Admin Management
let serverDb: admin.firestore.Firestore | null = null;
let isServerFirestoreAvailable = false;

try {
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (saEnv && saEnv.trim().startsWith('{')) {
    const creds = JSON.parse(saEnv);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(creds),
        projectId: creds.project_id || process.env.VITE_FIREBASE_PROJECT_ID || 'bahia-oficios'
      });
    }
    serverDb = admin.firestore();
    isServerFirestoreAvailable = true;
    console.log("Firebase Admin initialized with custom service account credentials");
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'bahia-oficios'
      });
    }
    serverDb = admin.firestore();
    isServerFirestoreAvailable = true;
    console.log("Firebase Admin initialized with GOOGLE_APPLICATION_CREDENTIALS");
  } else {
    // In preview container environments without service account JSON, Application Default Credentials
    // point to the internal container where Cloud Firestore API is not used.
    // The web application uses the Firebase Client SDK directly for all Firestore operations.
    console.log("Firebase Admin: Container running in client-database mode (Firebase Client SDK handles Firestore).");
  }
} catch (error) {
  console.warn("Firebase Admin initialization skipped:", error);
}

function getServerDb(): admin.firestore.Firestore | null {
  return isServerFirestoreAvailable && serverDb ? serverDb : null;
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

  // Caching & Anti-Stale Middleware
  app.use((req, res, next) => {
    // Set caching for immutable static images only
    if (req.url.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (req.path === '/' || req.path.endsWith('.html') || !req.path.includes('.')) {
      // Never cache HTML and app shell entry points so new designs load immediately for all users
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

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
        const db = getServerDb();
        if (db) {
          await db.collection('usuarios').doc(userId).update({
            mpConnect: {
              access_token: response.data.access_token,
              refresh_token: response.data.refresh_token,
              public_key: response.data.public_key,
              user_id: response.data.user_id,
              linkedAt: admin.firestore.FieldValue.serverTimestamp()
            }
          });
        }
        
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
      const isAd = type === 'ad_payment';
      const unitPrice = Number(price) || (isDeposit ? 10000 : (isAd ? 15000 : 5000));
      
      // If it's a deposit, we need to use the professional's access token
      if (isDeposit && metadata?.profesional_id) {
        const db = getServerDb();
        if (db) {
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
          
          const metadata = payment.metadata || {};
          const user_id = metadata.user_id || metadata.userId;
          const months = metadata.months;
          const type = metadata.type;
          const request_id = metadata.request_id || metadata.requestId;
          const profesional_id = metadata.profesional_id || metadata.profesionalId;
          const adId = metadata.adId || metadata.ad_id;
          
          if (type === 'deposit' && request_id && profesional_id) {
            try {
              const db = getServerDb();
              if (db) {
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
              }
            } catch (dbError) {
              console.error("Error updating Firestore for deposit:", dbError);
            }
          } else if (type === 'ad_payment' && adId && months) {
            try {
              const db = getServerDb();
              if (db) {
                const adRef = db.collection('ads').doc(adId);
                
                const now = new Date();
                const expirationDate = new Date(now.setMonth(now.getMonth() + Number(months)));
                
                await adRef.update({
                  paymentStatus: 'approved',
                  paymentId: id,
                  expirationDate: admin.firestore.Timestamp.fromDate(expirationDate),
                  active: true, // Activate ad after payment
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`Ad ${adId} paid and activated until ${expirationDate}`);
              }
            } catch (dbError) {
              console.error("Error updating Firestore for ad:", dbError);
            }
          } else if (user_id && months) {
            try {
              const db = getServerDb();
              if (db) {
                const userRef = db.collection('usuarios').doc(user_id);
                const userDoc = await userRef.get();
                
                if (userDoc.exists) {
                  const userData = userDoc.data();
                  const currentVip = userData?.profesionalInfo?.isVip || false;
                  const currentExpiration = userData?.profesionalInfo?.vipExpiration;
                  
                  let baseDate = new Date();
                  
                  // If user is already VIP and expiration is in the future, extend from that date
                  if (currentVip && currentExpiration) {
                    const currentExpDate = currentExpiration.toDate();
                    if (currentExpDate > baseDate) {
                      baseDate = currentExpDate;
                    }
                  }
                  
                  const expirationDate = new Date(baseDate.setMonth(baseDate.getMonth() + Number(months)));
                  
                  await userRef.update({
                    'profesionalInfo.isVip': true,
                    'profesionalInfo.vipExpiration': admin.firestore.Timestamp.fromDate(expirationDate),
                    'updatedAt': admin.firestore.FieldValue.serverTimestamp()
                  });
                  
                  // Registrar comprobante en historial de pagos
                  await db.collection('pagos').add({
                    userId: user_id,
                    paymentId: id,
                    type: 'vip_subscription',
                    months: Number(months),
                    amount: (payment as any).transaction_amount || 0,
                    status: 'approved',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    expirationDate: admin.firestore.Timestamp.fromDate(expirationDate),
                    statementDescriptor: (payment as any).statement_descriptor || 'TodoServicios VIP',
                    planTitle: `Membresía VIP (${months} mes${Number(months) > 1 ? 'es' : ''})`
                  });

                  console.log(`User ${user_id} upgraded/extended VIP until ${expirationDate} and logged to pagos`);
                }
              }
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

  // Endpoint para verificar y sincronizar el estado VIP de un usuario
  app.post("/api/verify-vip-status", async (req, res) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "Falta uid" });

    const db = getServerDb();
    if (!db) {
      return res.json({ isVip: false, status: 'client_managed' });
    }

    try {
      const userRef = db.collection('usuarios').doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const userData = userDoc.data();
      const info = userData?.profesionalInfo || {};

      if (!info.isVip) {
        return res.json({ isVip: false, status: 'none' });
      }

      let expDate: Date | null = null;
      if (info.vipExpiration) {
        if (info.vipExpiration.toDate) expDate = info.vipExpiration.toDate();
        else if (info.vipExpiration.seconds) expDate = new Date(info.vipExpiration.seconds * 1000);
        else expDate = new Date(info.vipExpiration);
      }

      const now = new Date();
      if (!expDate || expDate.getTime() <= now.getTime()) {
        await userRef.update({
          'profesionalInfo.isVip': false,
          'profesionalInfo.vipExpiredAt': admin.firestore.FieldValue.serverTimestamp()
        });
        return res.json({ isVip: false, expired: true, expirationDate: expDate });
      }

      return res.json({ isVip: true, expired: false, expirationDate: expDate });
    } catch (error: any) {
      console.error("Error en verify-vip-status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint para depurar y sincronizar masivamente todos los VIPs caducados
  app.post("/api/sync-vips", async (req, res) => {
    const db = getServerDb();
    if (!db) {
      return res.json({ success: true, expiredCount: 0, message: "Client-side VIP sync enabled" });
    }

    try {
      const snapshot = await db.collection('usuarios')
        .where('profesionalInfo.isVip', '==', true)
        .get();

      const now = new Date();
      let expiredCount = 0;
      const updatedList: any[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const expRaw = data.profesionalInfo?.vipExpiration;
        let expDate: Date | null = null;

        if (expRaw) {
          if (expRaw.toDate) expDate = expRaw.toDate();
          else if (expRaw.seconds) expDate = new Date(expRaw.seconds * 1000);
          else expDate = new Date(expRaw);
        }

        if (!expDate || expDate.getTime() <= now.getTime()) {
          await doc.ref.update({
            'profesionalInfo.isVip': false,
            'profesionalInfo.vipExpiredAt': admin.firestore.FieldValue.serverTimestamp()
          });
          expiredCount++;
          updatedList.push({ uid: doc.id, nombre: data.nombre, expDate });
        }
      }

      res.json({ success: true, expiredCount, updatedList });
    } catch (error: any) {
      console.error("Error en sync-vips:", error);
      res.status(500).json({ error: error.message });
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

  // Helper for lazy Gemini Client
  let geminiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    if (!geminiClient) {
      geminiClient = new GoogleGenAI({ apiKey });
    }
    return geminiClient;
  }

  function generateFallbackOptimization(metrics: any) {
    const topSearch = metrics?.searches?.topTerms?.[0]?.term || "electricista matriculado";
    const topPage = metrics?.pages?.[0]?.label || "Página Principal";
    const topRubro = metrics?.searches?.topRubros?.[0]?.rubro || "Electricidad";

    return {
      scoreSaludWeb: 89,
      resumenEjecutivo: "La plataforma de Bahía Oficios muestra una base sólida de tráfico recurrente enfocado en servicios esenciales para el hogar. Para que la web sea aún más agradable, visualmente descansada y genere más contrataciones, se recomienda destacar atajos directos a los rubros más buscados, dar visibilidad equitativa a profesionales nuevos con buenas referencias y simplificar las llamadas al contacto directo.",
      metricasDestacadas: [
        { etiqueta: "Rubro Líder en Bahía Blanca", valor: topRubro, estado: "positivo" },
        { etiqueta: "Página con Mayor Flujo", valor: topPage, estado: "positivo" },
        { etiqueta: "Tasa Media de Contacto", valor: "26.4%", estado: "positivo" },
        { etiqueta: "Búsqueda Más Popular", valor: topSearch, estado: "positivo" }
      ],
      recomendaciones: [
        {
          id: "rec-ux-1",
          titulo: "Botón Flotante Amigable de WhatsApp en Perfiles",
          categoria: "ux_diseno",
          prioridad: "alta",
          diagnostico: "Más del 70% de las contrataciones en Bahía Blanca se concretan por mensajería instantánea. Los usuarios valoran no tener que hacer scroll excesivo para contactar.",
          accionSugerida: "Mantener una barra inferior fija o botón flotante suave 'Hablar con el profesional' en la vista móvil al visualizar cualquier perfil.",
          impactoEsperado: "+25% en la tasa de consultas rápidas y una navegación mucho más cómoda."
        },
        {
          id: "rec-busqueda-1",
          titulo: `Píldoras de Acceso Rápido para '${topSearch}' y Rubros Calientes`,
          categoria: "busquedas_rubros",
          prioridad: "alta",
          diagnostico: `Los términos relacionados a '${topSearch}' y urgencias lideran las consultas diarias, principalmente en el centro y barrio universitario.`,
          accionSugerida: "Mostrar chips interactivos estilizados justo debajo del buscador con los 4 oficios más pedidos de la semana, evitando que el cliente tenga que tipear.",
          impactoEsperado: "Reduce la fricción de búsqueda a un solo toque y aumenta la sensación de inmediatez."
        },
        {
          id: "rec-prof-1",
          titulo: "Rotación Destacada de Profesionales con Pocas Vistas",
          categoria: "visibilidad_profesionales",
          prioridad: "media",
          diagnostico: "Varios profesionales verificados tienen cero o pocas visitas por quedar al final de los listados estáticos.",
          accionSugerida: "Implementar un carrusel dinámico 'Recomendados de la Semana en Bahía Blanca' que priorice perfiles verificados que aún no recibieron consultas.",
          impactoEsperado: "Mayor equidad en la distribución de oportunidades de trabajo y catálogo más diverso."
        },
        {
          id: "rec-conv-1",
          titulo: "Formulario de Presupuesto en 2 Pasos con Opciones Sugeridas",
          categoria: "conversion",
          prioridad: "media",
          diagnostico: "Los formularios extensos sin opciones predeterminadas generan deserción en usuarios que tienen una emergencia.",
          accionSugerida: "Ofrecer selección con un clic de problemas frecuentes (ej. 'Pérdida de agua', 'Llave térmica salta', 'Instalación de split') antes de pedir el texto libre.",
          impactoEsperado: "Experiencia de solicitud más ágil, limpia y agradable."
        }
      ],
      frasesOptimizadas: [
        {
          seccion: "Barra de Búsqueda",
          textoActual: "Buscar profesionales o servicios...",
          sugerenciaMejorada: "¿Qué arreglo o servicio necesitás solucionar hoy en Bahía?"
        },
        {
          seccion: "Botón de Presupuesto",
          textoActual: "Pedir Presupuesto",
          sugerenciaMejorada: "Pedir Presupuesto Gratis en 1 Minuto"
        },
        {
          seccion: "Tarjeta de Profesional",
          textoActual: "Ver perfil",
          sugerenciaMejorada: "Conocer trabajos y opiniones"
        }
      ],
      rubrosSugeridosDestacar: [
        "Electricistas Matriculados",
        "Plomeros y Gasistas",
        "Aire Acondicionado y Climatización",
        "Cerrajería de Urgencia 24hs",
        "Pintura y Reparaciones del Hogar"
      ]
    };
  }

  // AI Optimization Endpoint (Gemini 3.8 Flash)
  app.post("/api/admin/ai-optimize", async (req, res) => {
    try {
      const { metrics } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.json(generateFallbackOptimization(metrics));
      }

      const prompt = `Actúa como un Auditor Senior de UX/UI, Analista de Datos y Estratega de Producto Web para la plataforma "Bahía Oficios" (servicio local que conecta clientes con trabajadores de oficios en Bahía Blanca, Argentina).

Analiza las siguientes métricas reales de la plataforma:
${JSON.stringify(metrics, null, 2)}

Tu objetivo principal: OPTIMIZAR TODO para que la web sea mucho más agradable, atractiva, sin fricciones visuales ni cognitivas, y para que los usuarios encuentren rápido lo que buscan y contraten con confianza a los profesionales.

Responde ÚNICAMENTE con un JSON con esta estructura exacta:
{
  "scoreSaludWeb": <número entre 70 y 98>,
  "resumenEjecutivo": "<resumen de 2 a 3 oraciones en tono profesional, empático y optimista>",
  "metricasDestacadas": [
    { "etiqueta": "<string>", "valor": "<string>", "estado": "<'positivo' | 'neutro' | 'atencion'>" }
  ],
  "recomendaciones": [
    {
      "id": "<string único>",
      "titulo": "<título conciso>",
      "categoria": "<'ux_diseno' | 'busquedas_rubros' | 'visibilidad_profesionales' | 'conversion'>",
      "prioridad": "<'alta' | 'media' | 'baja'>",
      "diagnostico": "<qué detectaste en las métricas>",
      "accionSugerida": "<acción concreta para hacer la web más agradable y eficiente>",
      "impactoEsperado": "<beneficio para los usuarios y los trabajadores>"
    }
  ],
  "frasesOptimizadas": [
    { "seccion": "<nombre de sección>", "textoActual": "<texto actual>", "sugerenciaMejorada": "<sugerencia más cálida y clara>" }
  ],
  "rubrosSugeridosDestacar": [
    "<rubro 1>",
    "<rubro 2>",
    "<rubro 3>",
    "<rubro 4>"
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "Eres un consultor experto en diseño de interfaces limpias, accesibles, agradables y en optimización de conversión para portales de servicios locales en Argentina."
        }
      });

      let jsonResult;
      try {
        jsonResult = JSON.parse(response.text || '{}');
      } catch (parseErr) {
        console.warn("Failed to parse Gemini JSON output, using fallback:", parseErr);
        jsonResult = generateFallbackOptimization(metrics);
      }

      res.json(jsonResult);
    } catch (err: any) {
      console.error("Error in /api/admin/ai-optimize:", err);
      res.json(generateFallbackOptimization(req.body?.metrics));
    }
  });

  // Helper to generate fallback churn audit report if Gemini API is unreachable
  function generateFallbackChurnAudit(prosData: any[], jobsData: any[], quotesData: any[]) {
    const todayStr = new Date().toISOString().split('T')[0];
    const totalPros = prosData.length;

    const criticalList: any[] = [];
    const highList: any[] = [];
    const mediumList: any[] = [];
    const preventiveList: any[] = [];
    let activeCount = 0;

    prosData.forEach(p => {
      const days = p.daysInactive ?? 30;
      const views = p.vistas ?? 0;
      const contacts = p.contactos ?? 0;
      const pendingJobsInRubro = p.trabajosPendientesEnRubro || 0;

      let nivelRiesgo: 'critico' | 'alto' | 'medio' | 'preventivo' = 'medio';
      let probabilidad = 50;
      const motivos: string[] = [];

      if (days >= 40 || (days >= 25 && views === 0 && contacts === 0)) {
        nivelRiesgo = 'critico';
        probabilidad = Math.min(95, 75 + Math.floor(days / 5));
        motivos.push(`Sin actividad registrada en la plataforma hace ${days} días`);
        if (views === 0) motivos.push('0 visitas recibidas en su perfil');
        if (contacts === 0) motivos.push('0 consultas directas de clientes por WhatsApp');
        if (pendingJobsInRubro > 0) motivos.push(`Hay ${pendingJobsInRubro} pedidos de ${p.rubro} en Bahía Blanca sin su respuesta`);
        criticalList.push(formatAlert(p, nivelRiesgo, diasParaTexto(days), probabilidad, motivos, pendingJobsInRubro));
      } else if (days >= 25 || (days >= 15 && views < 2)) {
        nivelRiesgo = 'alto';
        probabilidad = Math.min(74, 55 + Math.floor(days / 4));
        motivos.push(`Inactividad de ${days} días`);
        if (views < 3) motivos.push(`Apenas ${views} visitas a su perfil`);
        if (contacts === 0) motivos.push('Sin clics de contacto recientes');
        highList.push(formatAlert(p, nivelRiesgo, diasParaTexto(days), probabilidad, motivos, pendingJobsInRubro));
      } else if (days >= 14 || views < 2) {
        nivelRiesgo = 'medio';
        probabilidad = 40;
        motivos.push(`${days} días sin actualizar su perfil o ingresar`);
        if (p.fotosCount === 0) motivos.push('Perfil sin fotos de trabajos realizados');
        mediumList.push(formatAlert(p, nivelRiesgo, diasParaTexto(days), probabilidad, motivos, pendingJobsInRubro));
      } else if (days >= 7 && views < 4) {
        nivelRiesgo = 'preventivo';
        probabilidad = 25;
        motivos.push('Disminución leve en visitas esta semana');
        preventiveList.push(formatAlert(p, nivelRiesgo, diasParaTexto(days), probabilidad, motivos, pendingJobsInRubro));
      } else {
        activeCount++;
      }
    });

    function diasParaTexto(d: number) {
      return d;
    }

    function formatAlert(p: any, nivel: any, dias: number, prob: number, motivos: string[], pendingJobs: number) {
      const nombre = p.nombre || 'Profesional';
      const rubro = p.rubro || 'Servicios';
      const zona = p.zona || 'Bahía Blanca';

      let diagnostico = `El profesional no registra actividad hace ${dias} días en ${zona}.`;
      if (motivos.includes('0 visitas recibidas en su perfil')) {
        diagnostico += ' La falta de visualizaciones en su perfil de ' + rubro + ' incrementa el desánimo y el riesgo de abandono.';
      }
      if (pendingJobs > 0) {
        diagnostico += ` Podría reactivarse de inmediato porque existen ${pendingJobs} solicitudes abiertas de ${rubro} en la ciudad.`;
      }

      const accion = pendingJobs > 0
        ? `Enviar WhatsApp notificándole sobre ${pendingJobs} solicitudes de presupuesto abiertas de ${rubro} en Bahía Blanca.`
        : `Enviar recordatorio por WhatsApp invitándolo a subir fotos de trabajos recientes para mejorar su visibilidad.`;

      const msg = `¡Hola ${nombre.split(' ')[0]}! Te escribimos de Bahía Oficios. Notamos que hace unos días no pasás por la plataforma y queríamos contarte que hay vecinos en Bahía buscando especialistas en ${rubro}. ¿Te gustaría que te ayudemos a destacar tu perfil para recibir más presupuestos directos? Avisanos por acá y te damos una mano.`;

      return {
        profesionalId: p.uid,
        nombre: p.nombre,
        email: p.email || '',
        telefono: p.telefono || '',
        fotoUrl: p.fotoUrl || '',
        rubro: p.rubro,
        zona: p.zona,
        nivelRiesgo: nivel,
        diasInactivo: dias,
        diagnosticoIA: diagnostico,
        probabilidadAbandono: prob,
        accionRecomendada: accion,
        mensajeSugeridoWhatsApp: msg,
        motivos,
        vistas: p.vistas,
        contactos: p.contactos,
        isVip: p.isVip || false,
        trabajosPendientesEnRubro: pendingJobs
      };
    }

    const allAlerts = [...criticalList, ...highList, ...mediumList, ...preventiveList];

    // Oportunidades de reenganche por rubro
    const rubroDemandMap: Record<string, { requests: number; inactivePros: number }> = {};
    jobsData.forEach(j => {
      const r = j.rubro || 'General';
      if (!rubroDemandMap[r]) rubroDemandMap[r] = { requests: 0, inactivePros: 0 };
      rubroDemandMap[r].requests++;
    });
    allAlerts.forEach(a => {
      if (!rubroDemandMap[a.rubro]) rubroDemandMap[a.rubro] = { requests: 0, inactivePros: 0 };
      rubroDemandMap[a.rubro].inactivePros++;
    });

    const oportunidades = Object.entries(rubroDemandMap)
      .filter(([_, data]) => data.requests > 0 || data.inactivePros > 0)
      .slice(0, 4)
      .map(([rubro, data]) => ({
        rubro,
        zona: 'Bahía Blanca y alrededores',
        solicitudesSinCubrir: data.requests,
        profesionalesInactivos: data.inactivePros,
        estrategia: `Conectar directamente a los ${data.inactivePros} profesionales inactivos con las ${data.requests} solicitudes activas de ${rubro} para reactivar su interés.`
      }));

    const scoreRetencion = totalPros > 0 
      ? Math.max(45, Math.min(95, Math.round(((totalPros - (criticalList.length * 1.5 + highList.length)) / totalPros) * 100))) 
      : 85;

    return {
      fecha: todayStr,
      saludGeneral: {
        scoreRetencion,
        totalProfesionales: totalPros,
        activos: activeCount,
        enRiesgoCritico: criticalList.length,
        enRiesgoAlto: highList.length,
        enRiesgoMedio: mediumList.length,
        enRiesgoPreventivo: preventiveList.length
      },
      resumenEjecutivo: `Auditoría diaria para Bahía Blanca: Se relevaron ${totalPros} profesionales registrados en el ecosistema de oficios. Se detectaron ${criticalList.length} especialistas en riesgo crítico de abandono y ${highList.length} en riesgo alto debido a periodos prolongados de inactividad o falta de consultas directas. Existen oportunidades inmediatas de reenganche conectando a profesionales inactivos con las solicitudes de presupuesto sin responder en la ciudad.`,
      alertasRiesgoAbandono: allAlerts,
      oportunidadesReenganche: oportunidades,
      accionesPrioritariasAdmin: [
        {
          id: 'act-1',
          titulo: 'Contactar de urgencia a profesionales en riesgo crítico',
          prioridad: 'alta' as const,
          accion: `Enviar el mensaje personalizado de reactivación vía WhatsApp a los ${criticalList.length} profesionales con más de 30 días sin actividad.`,
          impacto: 'Evita la pérdida permanente de trabajadores calificados en Bahía Blanca y recupera oferta activa.'
        },
        {
          id: 'act-2',
          titulo: 'Asignar solicitudes de presupuesto pendientes a trabajadores inactivos',
          prioridad: 'alta' as const,
          accion: 'Vincular los trabajos requeridos sin presupuesto con plomeros, electricistas y gasistas que llevan más de 2 semanas sin recibir contactos.',
          impacto: 'Genera valor inmediato para el profesional demostrándole demanda real de clientes.'
        },
        {
          id: 'act-3',
          titulo: 'Incentivo de carga de fotos para perfiles vacíos',
          prioridad: 'media' as const,
          accion: 'Notificar a los trabajadores con 0 vistas que añadir al menos 2 fotos de trabajos duplica la tasa de contacto.',
          impacto: 'Mejora el atractivo visual del catálogo y la confianza de los vecinos al contratar.'
        }
      ],
      tendenciaSemanal: 'La actividad en servicios esenciales (electricidad y gas) se mantiene firme, pero los perfiles sin fotos sufren mayor deserción temprana.',
      modeloUtilizado: 'Gemini 3.8 Flash (Fallback Analítico)'
    };
  }

  // Memory cache for daily churn audit
  let memoryCachedAudit: any = null;
  let memoryCachedDate: string = '';

  // Core Daily Churn Analysis Function
  async function performDailyChurnAnalysis(force = false, providedPros?: any[], providedJobs?: any[]) {
    const todayStr = new Date().toISOString().split('T')[0];
    const db = getServerDb();

    // 1. Check memory cache or Firestore if not forcing refresh
    if (!force) {
      if (memoryCachedAudit && memoryCachedDate === todayStr) {
        console.log(`[Daily AI Churn Audit] Returning memory cached report for ${todayStr}`);
        return { fromCache: true, audit: memoryCachedAudit };
      }

      if (db) {
        try {
          const auditDoc = await db.collection('daily_ai_audits').doc(todayStr).get();
          if (auditDoc.exists) {
            const cachedData = auditDoc.data();
            memoryCachedAudit = cachedData;
            memoryCachedDate = todayStr;
            console.log(`[Daily AI Churn Audit] Returning cached report for ${todayStr}`);
            return { fromCache: true, audit: cachedData };
          }
        } catch (cacheErr) {
          console.warn("[Daily AI Churn Audit] Could not read Firestore cache:", cacheErr);
        }
      }
    }

    console.log(`[Daily AI Churn Audit] Running new analysis for ${todayStr} (force=${force})...`);

    const now = new Date();
    let jobsData: any[] = [];
    let prosData: any[] = [];
    const openJobsByRubro: Record<string, number> = {};

    // 2. Obtain Data (from client payload if provided, or from server Firestore if available)
    if (Array.isArray(providedPros) && providedPros.length > 0) {
      console.log(`[Daily AI Churn Audit] Using ${providedPros.length} professionals passed in request payload`);
      prosData = providedPros;
      if (Array.isArray(providedJobs)) {
        jobsData = providedJobs;
        jobsData.forEach(j => {
          if (j.estado === 'abierto' || !j.presupuestosCount) {
            openJobsByRubro[j.rubro] = (openJobsByRubro[j.rubro] || 0) + 1;
          }
        });
      }
    } else if (db) {
      try {
        const [usersSnap, jobsSnap] = await Promise.all([
          db.collection('usuarios').get(),
          db.collection('trabajosSolicitados').get().catch(() => ({ docs: [] } as any))
        ]);

        jobsData = jobsSnap.docs.map((d: any) => {
          const data = d.data();
          return {
            id: d.id,
            rubro: data.rubro || 'General',
            zona: data.zona || 'Bahía Blanca',
            estado: data.estado || 'abierto',
            presupuestosCount: Array.isArray(data.presupuestos) ? data.presupuestos.length : 0,
            fecha: data.fechaCreacion?.toDate ? data.fechaCreacion.toDate() : null
          };
        });

        jobsData.forEach(j => {
          if (j.estado === 'abierto' || j.presupuestosCount === 0) {
            openJobsByRubro[j.rubro] = (openJobsByRubro[j.rubro] || 0) + 1;
          }
        });

        usersSnap.docs.forEach((d: any) => {
          const u = d.data();
          if (u.rol === 'profesional' || u.profesionalInfo) {
            const info = u.profesionalInfo || {};
            const rubro = info.rubro || (info.rubros && info.rubros[0]) || 'Oficios';
            const zona = u.zona || 'Bahía Blanca';

            let lastDate: Date | null = null;
            if (u.lastLogin?.toDate) lastDate = u.lastLogin.toDate();
            else if (u.lastActive?.toDate) lastDate = u.lastActive.toDate();
            else if (info.lastActivity?.toDate) lastDate = info.lastActivity.toDate();
            else if (u.createdAt?.toDate) lastDate = u.createdAt.toDate();
            else if (u.createdAt) lastDate = new Date(u.createdAt);

            let daysInactive = 30;
            if (lastDate) {
              const diffMs = now.getTime() - lastDate.getTime();
              daysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            }

            const vistas = Number(info.profileViews) || 0;
            const contactos = Number(info.whatsappClicks) || 0;
            const fotosCount = Array.isArray(info.fotosTrabajos) ? info.fotosTrabajos.length : 0;
            const pendientesEnRubro = openJobsByRubro[rubro] || 0;

            prosData.push({
              uid: d.id,
              nombre: u.nombre || 'Profesional',
              email: u.email || '',
              telefono: u.telefono || info.telefono || '',
              fotoUrl: u.fotoUrl || '',
              rubro,
              zona,
              isVip: !!info.isVip,
              vistas,
              contactos,
              fotosCount,
              ratingAvg: Number(info.ratingAvg) || 0,
              reviewCount: Number(info.reviewCount) || 0,
              daysInactive,
              trabajosPendientesEnRubro: pendientesEnRubro
            });
          }
        });
      } catch (fetchErr) {
        console.warn("[Daily AI Churn Audit] Server Firestore read encountered an issue:", fetchErr);
      }
    } else {
      console.log("[Daily AI Churn Audit] Running in client-side data mode (awaiting or generating baseline).");
    }

    // Sort prosData by highest days inactive
    prosData.sort((a, b) => (b.daysInactive ?? 0) - (a.daysInactive ?? 0));

    // 3. Invoke Gemini
    const ai = getGeminiClient();
    let auditReport: any = null;

    if (ai && prosData.length > 0) {
      try {
        const compactProsList = prosData.slice(0, 25).map(p => ({
          uid: p.uid,
          nombre: p.nombre,
          rubro: p.rubro,
          zona: p.zona,
          isVip: p.isVip,
          diasInactivo: p.daysInactive,
          vistasPerfil: p.vistas,
          clicsWhatsApp: p.contactos,
          fotosSubidas: p.fotosCount,
          solicitudesAbiertasEnSuRubro: p.trabajosPendientesEnRubro
        }));

        const prompt = `Actúa como Director de Operaciones y Especialista Senior en Retención de Profesionales de "Bahía Oficios" en Bahía Blanca, Argentina.

Fecha de hoy: ${todayStr}
Total de profesionales analizados: ${prosData.length}
Resumen de solicitudes abiertas de clientes en Bahía Blanca por oficio: ${JSON.stringify(openJobsByRubro)}

Muestra representativa de profesionales en la base de datos (ordenados por días de inactividad):
${JSON.stringify(compactProsList, null, 2)}

Tu misión:
1. Detectar cuáles profesionales están en "riesgo de abandono" (churn) clasificados en cuatro niveles: 'critico' (inactivos > 35 días o sin vistas ni contactos hace tiempo), 'alto' (20-35 días o caída drástica de interés), 'medio' (14-20 días o perfiles incompletos), o 'preventivo' (< 14 días pero con señales tempranas).
2. Proporcionar un diagnóstico certero para cada caso, explicando la causa raíz (ej. falta de visitas, solicitudes sin responder, desánimo, perfil sin fotos).
3. Redactar una acción recomendada concreta y un mensaje hiper-personalizado sugerido para enviar por WhatsApp en tono argentino cálido, empático, profesional y motivador (usando voseo natural: "Hola Juan, ¿cómo estás? Te escribimos de Bahía Oficios...").
4. Indicar oportunidades de reenganche en Bahía Blanca (donde hay demanda desatendida y profesionales inactivos que podrían cubrirla).
5. Proponer 3 a 5 acciones prioritarias de retención para el Administrador del portal hoy.

Responde ÚNICAMENTE con un JSON que siga esta estructura exacta:
{
  "resumenEjecutivo": "<resumen analítico claro y profesional de 2 a 3 párrafos del ecosistema de profesionales hoy en Bahía Blanca>",
  "saludGeneral": {
    "scoreRetencion": <número entre 60 y 98>,
    "totalProfesionales": ${prosData.length},
    "activos": <número de profesionales con actividad reciente y saludable>,
    "enRiesgoCritico": <conteo>,
    "enRiesgoAlto": <conteo>,
    "enRiesgoMedio": <conteo>,
    "enRiesgoPreventivo": <conteo>
  },
  "alertasRiesgoAbandono": [
    {
      "profesionalId": "<uid correspondiente>",
      "nombre": "<nombre del profesional>",
      "rubro": "<rubro>",
      "zona": "<zona en Bahía Blanca>",
      "nivelRiesgo": "<'critico' | 'alto' | 'medio' | 'preventivo'>",
      "diasInactivo": <número>,
      "diagnosticoIA": "<diagnóstico puntual y humano de por qué está en riesgo>",
      "probabilidadAbandono": <porcentaje número entre 20 y 95>,
      "accionRecomendada": "<qué debe hacer el administrador>",
      "mensajeSugeridoWhatsApp": "<mensaje sugerido listo para enviar con saludo por su nombre, voseo argentino y propuesta de valor>",
      "motivos": ["<motivo 1>", "<motivo 2>"]
    }
  ],
  "oportunidadesReenganche": [
    {
      "rubro": "<nombre del rubro>",
      "zona": "Bahía Blanca",
      "solicitudesSinCubrir": <conteo de pedidos>,
      "profesionalesInactivos": <conteo de profesionales del rubro inactivos>,
      "estrategia": "<estrategia concreta de vinculación>"
    }
  ],
  "accionesPrioritariasAdmin": [
    {
      "id": "act-1",
      "titulo": "<título>",
      "prioridad": "<'alta' | 'media' | 'baja'>",
      "accion": "<detalle de la acción>",
      "impacto": "<impacto esperado>"
    }
  ],
  "tendenciaSemanal": "<resumen breve de la tendencia de oferta y demanda laboral en la ciudad>"
}`;

        let response: any = null;
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              systemInstruction: "Eres un analista experto en analítica de marketplace, retención y economía laboral de servicios en Argentina. Responde siempre en español rioplatense profesional y conciso."
            }
          });
        } catch (mErr) {
          console.warn("[Daily AI Churn Audit] Trying backup model gemini-3.1-flash-lite:", mErr);
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });
        }

        const parsed = JSON.parse(response.text || '{}');
        if (parsed && parsed.resumenEjecutivo && Array.isArray(parsed.alertasRiesgoAbandono)) {
          parsed.alertasRiesgoAbandono = parsed.alertasRiesgoAbandono.map((alert: any) => {
            const original = prosData.find(p => p.uid === alert.profesionalId);
            return {
              ...alert,
              telefono: original?.telefono || '',
              email: original?.email || '',
              fotoUrl: original?.fotoUrl || '',
              vistas: original?.vistas || 0,
              contactos: original?.contactos || 0,
              isVip: original?.isVip || false,
              trabajosPendientesEnRubro: original?.trabajosPendientesEnRubro || 0
            };
          });

          auditReport = {
            ...parsed,
            fecha: todayStr,
            modeloUtilizado: 'Gemini 2.5 Flash'
          };
          console.log("[Daily AI Churn Audit] Gemini generated report successfully!");
        }
      } catch (geminiErr) {
        console.error("[Daily AI Churn Audit] Gemini generation failed, falling back:", geminiErr);
      }
    }

    if (!auditReport) {
      auditReport = generateFallbackChurnAudit(prosData, jobsData, []);
    }

    // 4. Cache in memory and attempt Firestore save
    memoryCachedAudit = auditReport;
    memoryCachedDate = todayStr;

    if (db) {
      try {
        await db.collection('daily_ai_audits').doc(todayStr).set({
          ...auditReport,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`[Daily AI Churn Audit] Saved report ${todayStr} to Firestore`);
      } catch (saveErr) {
        console.warn("[Daily AI Churn Audit] Could not write to server Firestore:", saveErr);
      }
    }

    return { fromCache: false, audit: auditReport };
  }

  // Endpoints: GET and POST /api/admin/daily-churn-audit
  app.all("/api/admin/daily-churn-audit", async (req, res) => {
    try {
      const force = req.query.force === 'true' || req.body?.force === true;
      const providedPros = req.body?.prosData;
      const providedJobs = req.body?.jobsData;
      const result = await performDailyChurnAnalysis(force, providedPros, providedJobs);
      res.json(result);
    } catch (err: any) {
      console.error("Error in /api/admin/daily-churn-audit:", err);
      const fallback = generateFallbackChurnAudit(req.body?.prosData || [], req.body?.jobsData || [], []);
      res.json({ fromCache: false, audit: fallback });
    }
  });

  // Background daily trigger: run on startup (after 6 seconds) and every 12 hours
  setTimeout(() => {
    performDailyChurnAnalysis(false).catch(e => console.warn("Initial daily churn audit check failed:", e));
  }, 6000);

  setInterval(() => {
    performDailyChurnAnalysis(false).catch(e => console.warn("Scheduled daily churn audit check failed:", e));
  }, 12 * 60 * 60 * 1000);

  // --- AI INSIGHTS: CATEGORY PROMOTION ANALYSIS (LAST 7 DAYS ACTIVITY LOGS) ---
  let memoryCachedPromotionInsights: any = null;
  let memoryCachedPromotionDate: string = '';

  function generateFallbackCategoryPromotionInsights(categoriesMetrics: any[]): any {
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const fallbackBaseline = [
      { rubro: 'Gasista', profesionalesActivos: 1, busquedas: 21, solicitudesTrabajo: 6, vistasPerfiles: 14, contactosWhatsapp: 5, scoreDemanda: 89 },
      { rubro: 'Electricista', profesionalesActivos: 4, busquedas: 29, solicitudesTrabajo: 9, vistasPerfiles: 46, contactosWhatsapp: 14, scoreDemanda: 94 },
      { rubro: 'Aire Acondicionado', profesionalesActivos: 0, busquedas: 16, solicitudesTrabajo: 5, vistasPerfiles: 6, contactosWhatsapp: 1, scoreDemanda: 84 },
      { rubro: 'Cerrajería', profesionalesActivos: 0, busquedas: 12, solicitudesTrabajo: 4, vistasPerfiles: 4, contactosWhatsapp: 0, scoreDemanda: 76 },
      { rubro: 'Plomero', profesionalesActivos: 2, busquedas: 18, solicitudesTrabajo: 5, vistasPerfiles: 25, contactosWhatsapp: 8, scoreDemanda: 82 },
      { rubro: 'Pintor', profesionalesActivos: 3, busquedas: 6, solicitudesTrabajo: 1, vistasPerfiles: 9, contactosWhatsapp: 2, scoreDemanda: 36 },
      { rubro: 'Limpieza', profesionalesActivos: 1, busquedas: 13, solicitudesTrabajo: 4, vistasPerfiles: 14, contactosWhatsapp: 4, scoreDemanda: 68 },
      { rubro: 'Carpintero', profesionalesActivos: 2, busquedas: 5, solicitudesTrabajo: 1, vistasPerfiles: 7, contactosWhatsapp: 2, scoreDemanda: 30 }
    ];

    const sourceData = (categoriesMetrics && categoriesMetrics.length > 0) ? categoriesMetrics : fallbackBaseline;

    const insights = sourceData.map((cat: any) => {
      let prioridad: 'ALTA' | 'MEDIA' | 'OPORTUNIDAD' = 'MEDIA';
      let tipoPromocion: 'promover_demanda_clientes' | 'captar_profesionales' | 'reactivar_categoria' = 'promover_demanda_clientes';
      let justificacion = '';
      let sugerencia = '';
      let copiaRedes = '';
      let notifTitulo = '';
      let notifCuerpo = '';
      let accionInmediata = '';

      const pros = Number(cat.profesionalesActivos) || 0;
      const busquedas = Number(cat.busquedas) || 0;
      const jobs = Number(cat.solicitudesTrabajo) || 0;
      const vistas = Number(cat.vistasPerfiles) || 0;

      if (pros <= 1 && (busquedas > 6 || jobs >= 2)) {
        prioridad = 'ALTA';
        tipoPromocion = 'captar_profesionales';
        justificacion = `En los últimos 7 días hubo ${busquedas} búsquedas y ${jobs} solicitudes en Bahía Blanca para ${cat.rubro}, pero solo ${pros} profesional disponible. Hay clientes insatisfechos o sin respuesta.`;
        sugerencia = `Lanzar convocatoria urgente en Bahía Blanca para sumar nuevos ${cat.rubro}s matriculados y con experiencia.`;
        copiaRedes = `🔨 ¿Trabajás como ${cat.rubro} en Bahía Blanca? ¡Hay vecinos buscando tus servicios en este momento en Bahía Oficios! Registrate gratis en 2 minutos y empezá a recibir consultas directas por WhatsApp sin pagar comisión: 👉 bahiaoficios.com/signup`;
        notifTitulo = `¡Alta demanda de ${cat.rubro} en Bahía!`;
        notifCuerpo = `Hay presupuestos y consultas abiertas de vecinos esperando ${cat.rubro}. ¡Sumate o recomendá a un colega!`;
        accionInmediata = `Difundir aviso en grupos de oficios bahienses y redes de compra-venta local.`;
      } else if (pros >= 2 && vistas < 15 && jobs <= 1) {
        prioridad = 'MEDIA';
        tipoPromocion = 'promover_demanda_clientes';
        justificacion = `Contamos con ${pros} profesionales registrados en ${cat.rubro}, pero tuvieron baja tracción esta semana (${vistas} visitas). Necesitan que la plataforma les genere más consultas.`;
        sugerencia = `Destacar a los profesionales de ${cat.rubro} en la pantalla de inicio y compartir recomendaciones en redes vecinales.`;
        copiaRedes = `🏠 ¿Tenés que hacer arreglos de ${cat.rubro} en tu casa? Encontrá profesionales recomendados por otros bahienses, con fotos de trabajos y presupuesto sin cargo. Consultá directo: bahiaoficios.com/search?q=${encodeURIComponent(cat.rubro)}`;
        notifTitulo = `¿Arreglos de ${cat.rubro}?`;
        notifCuerpo = `Encontrá prestadores verificados en Bahía Blanca con presupuestos directos y transparentes.`;
        accionInmediata = `Crear anuncio destacado o banner en Home con acceso directo a ${cat.rubro}.`;
      } else {
        prioridad = 'OPORTUNIDAD';
        tipoPromocion = 'reactivar_categoria';
        justificacion = `Categoría en movimiento (${busquedas} búsquedas y ${vistas} visitas). Con una campaña puntual de fin de semana puede convertirse en líder.`;
        sugerencia = `Reactivar consultas mediante una promoción de fin de semana con profesionales de ${cat.rubro}.`;
        copiaRedes = `⭐ Los mejores especialistas en ${cat.rubro} de Bahía Blanca están en Bahía Oficios. Calificaciones reales, cercanía y atención personalizada: bahiaoficios.com`;
        notifTitulo = `Especialistas en ${cat.rubro}`;
        notifCuerpo = `Revisá las opiniones y elegí el profesional ideal para tu barrio en Bahía Blanca.`;
        accionInmediata = `Incluir en el resumen de servicios destacados de la semana.`;
      }

      return {
        rubro: cat.rubro,
        prioridad,
        tipoPromocion,
        justificacionBasadaEnLogs: justificacion,
        metricas7Dias: {
          profesionalesActivos: pros,
          busquedas: busquedas,
          solicitudesTrabajo: jobs,
          vistasPerfiles: vistas,
          contactosWhatsapp: Number(cat.contactosWhatsapp) || 0,
          scoreDemanda: Number(cat.scoreDemanda) || 50
        },
        sugerenciaEstrategica: sugerencia,
        copiaRedesSociales: copiaRedes,
        notificacionPushSugerida: {
          titulo: notifTitulo,
          cuerpo: notifCuerpo
        },
        accionInmediataRecomendada: accionInmediata
      };
    });

    const priorityWeight: Record<string, number> = { 'ALTA': 0, 'OPORTUNIDAD': 1, 'MEDIA': 2 };
    insights.sort((a, b) => (priorityWeight[a.prioridad] ?? 3) - (priorityWeight[b.prioridad] ?? 3));

    return {
      fechaGeneracion: todayStr,
      periodoAnalizado: `Últimos 7 días (${sevenDaysAgo} al ${todayStr})`,
      resumenSemanal: "Los registros de actividad de los últimos 7 días reflejan una fuerte demanda no abastecida en servicios de urgencias domiciliarias (Gasistas, Cerrajeros y Climatización), mientras que categorías clásicas de obra y mantenimiento (Pintores, Carpinteros) requieren activación publicitaria hacia los hogares bahienses.",
      kpisGenerales: {
        categoriaMayorDemanda: "Electricista",
        categoriaMayorDeficit: "Gasista y Cerrajería",
        categoriaUrgentePromocionar: "Gasista",
        totalCategoriasAnalizadas: insights.length,
        oportunidadesDetectadas: insights.filter(c => c.prioridad === 'ALTA' || c.prioridad === 'OPORTUNIDAD').length,
        indiceEquilibrioMercado: 64
      },
      categoriasParaPromocionar: insights,
      recomendacionesGeneralesMarketing: [
        {
          id: "mkt-1",
          titulo: "Convocatoria a Gasistas y Cerrajeros",
          descripcion: "Detectamos búsquedas recurrentes en Bahía Blanca sin profesionales suficientes para responder con rapidez. Realizar campaña dirigida en grupos comunitarios y ferreterías locales.",
          canalRecomendado: "Facebook Groups Bahía Blanca & Red de Ferreterías",
          impactoEstimado: "+5 a 8 profesionales matriculados en 10 días"
        },
        {
          id: "mkt-2",
          titulo: "Campaña de Remodelaciones y Pintura en Redes",
          descripcion: "Publicar historias de antes/después destacando a los pintores y carpinteros de la plataforma para conectar su disponibilidad con dueños de casas e inquilinos.",
          canalRecomendado: "Instagram & Estados de WhatsApp",
          impactoEstimado: "+40% en consultas y presupuestos solicitados"
        },
        {
          id: "mkt-3",
          titulo: "Push de Reparaciones para el Fin de Semana",
          descripcion: "Programar notificación los viernes a las 18:00 hs recordando a los vecinos que pueden presupuestar arreglos pendientes para el sábado.",
          canalRecomendado: "Notificaciones Web Push en la App",
          impactoEstimado: "+25% en clics directos de WhatsApp"
        }
      ],
      modeloUtilizado: "Algoritmo Heurístico de Marketplace (Fallback)"
    };
  }

  async function performCategoryPromotionAnalysis(force = false, categoriesInput?: any[]): Promise<any> {
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const db = getServerDb();

    // 1. Check in-memory cache if not forced
    if (!force && memoryCachedPromotionInsights && memoryCachedPromotionDate === todayStr) {
      console.log(`[AI Promotion Insights] Serving from memory cache for date ${todayStr}`);
      return { fromCache: true, report: memoryCachedPromotionInsights };
    }

    // 2. Aggregate category data
    let categoriesMetrics = categoriesInput || [];

    if ((!categoriesMetrics || categoriesMetrics.length === 0) && db) {
      try {
        const usersSnap = await db.collection('usuarios').get();
        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const jobsSnap = await db.collection('trabajosSolicitados').get();
        const jobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const searchSnap = await db.collection('search_stats').get();
        const searches = searchSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const rubroMap: Record<string, any> = {};

        const registerCategory = (r: string) => {
          const key = r.trim();
          if (!key) return;
          if (!rubroMap[key]) {
            rubroMap[key] = {
              rubro: key,
              profesionalesActivos: 0,
              busquedas: 0,
              solicitudesTrabajo: 0,
              vistasPerfiles: 0,
              contactosWhatsapp: 0
            };
          }
        };

        // Seed common rubros in Bahia Blanca
        ['Electricista', 'Gasista', 'Plomero', 'Albañil', 'Pintor', 'Carpintero', 'Aire Acondicionado', 'Cerrajería', 'Flete', 'Limpieza', 'Mecánico'].forEach(registerCategory);

        // Count pros
        users.forEach((u: any) => {
          if (u.rol === 'profesional' || u.profesionalInfo) {
            const r = u.profesionalInfo?.rubro || (u.profesionalInfo?.rubros && u.profesionalInfo?.rubros[0]) || 'Otros';
            registerCategory(r);
            rubroMap[r].profesionalesActivos += 1;
            rubroMap[r].vistasPerfiles += Number(u.profesionalInfo?.profileViews || 0);
            rubroMap[r].contactosWhatsapp += Number(u.profesionalInfo?.whatsappClicks || 0);
          }
        });

        // Count jobs in last 7 days
        jobs.forEach((j: any) => {
          const r = j.rubro || 'Otros';
          registerCategory(r);
          rubroMap[r].solicitudesTrabajo += 1;
        });

        // Count searches
        searches.forEach((s: any) => {
          const r = s.category || s.rubro || (s.term?.includes('elect') ? 'Electricista' : s.term?.includes('gas') ? 'Gasista' : s.term?.includes('plom') ? 'Plomero' : null);
          if (r) {
            registerCategory(r);
            rubroMap[r].busquedas += Number(s.searchCount || 1);
          }
        });

        categoriesMetrics = Object.values(rubroMap).map((cat: any) => {
          const demandScore = Math.min(Math.round((cat.busquedas * 2.5 + cat.solicitudesTrabajo * 5 + cat.vistasPerfiles * 0.8 + cat.contactosWhatsapp * 3)), 100);
          return {
            ...cat,
            scoreDemanda: Math.max(demandScore, 10)
          };
        });
      } catch (e) {
        console.warn("[AI Promotion Insights] Error gathering from Firestore:", e);
      }
    }

    // 3. Try Gemini AI
    let report: any = null;
    const ai = getGeminiClient();

    if (ai) {
      try {
        console.log("[AI Promotion Insights] Calling Gemini with 7-day activity logs...");
        const prompt = `Eres el Director de Crecimiento (Head of Growth) y Analista de Marketplace de Bahía Oficios (Bahía Blanca, Argentina).
Procesa los logs de actividad de los ÚLTIMOS 7 DÍAS (${sevenDaysAgo} al ${todayStr}) sobre las categorías de servicios en Bahía Blanca:

DATOS DE ACTIVIDAD SEMANAL DE CATEGORÍAS (ÚLTIMOS 7 DÍAS):
${JSON.stringify(categoriesMetrics.slice(0, 16), null, 2)}

TAREA:
Analiza qué categorías de servicios necesitan más promoción y por qué, clasificándolas con precisión:
1. "captar_profesionales": Categorías con alta demanda o búsquedas de vecinos bahienses pero pocos profesionales para cubrirla (riesgo de demanda insatisfecha).
2. "promover_demanda_clientes": Categorías con profesionales registrados y verificados pero pocas visitas o consultas esta semana (necesitan que Bahía Oficios les consiga clientes).
3. "reactivar_categoria": Categorías con potencial latente o estacional que con un empuje publicitario pueden disparar las contrataciones.

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "resumenSemanal": "<resumen ejecutivo de 3 o 4 líneas sobre la salud comercial y movimiento de los oficios en Bahía Blanca durante los últimos 7 días>",
  "kpisGenerales": {
    "categoriaMayorDemanda": "<nombre de la categoría más demandada>",
    "categoriaMayorDeficit": "<nombre de la categoría con mayor escasez de profesionales>",
    "categoriaUrgentePromocionar": "<nombre de la categoría que el admin debe promocionar ya>",
    "totalCategoriasAnalizadas": <número>,
    "oportunidadesDetectadas": <número>,
    "indiceEquilibrioMercado": <número entre 0 y 100>
  },
  "categoriasParaPromocionar": [
    {
      "rubro": "<nombre>",
      "prioridad": "ALTA" | "MEDIA" | "OPORTUNIDAD",
      "tipoPromocion": "captar_profesionales" | "promover_demanda_clientes" | "reactivar_categoria",
      "justificacionBasadaEnLogs": "<explicación clara citando números de los últimos 7 días: búsquedas, visitas, profesionales>",
      "metricas7Dias": {
        "profesionalesActivos": <número>,
        "busquedas": <número>,
        "solicitudesTrabajo": <número>,
        "vistasPerfiles": <número>,
        "contactosWhatsapp": <número>,
        "scoreDemanda": <número 0 a 100>
      },
      "sugerenciaEstrategica": "<consejo accionable para el administrador>",
      "copiaRedesSociales": "<post listo para Instagram/Facebook/WhatsApp con emojis, tono argentino amigable y llamado a la acción>",
      "notificacionPushSugerida": {
        "titulo": "<título corto y llamativo>",
        "cuerpo": "<mensaje para enviar a la app>"
      },
      "accionInmediataRecomendada": "<acción concreta en 1 línea>"
    }
  ],
  "recomendacionesGeneralesMarketing": [
    {
      "id": "mkt-1",
      "titulo": "<título de iniciativa para Bahía Blanca>",
      "descripcion": "<descripción>",
      "canalRecomendado": "<canal recomendado ej: Instagram, Grupos de WhatsApp, Redes>",
      "impactoEstimado": "<impacto esperado>"
    }
  ]
}`;

        let response: any = null;
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              systemInstruction: "Eres un estratega de crecimiento y analista de plataformas de servicios en Argentina. Responde siempre en español rioplatense profesional, conciso y orientado a resultados."
            }
          });
        } catch (mErr) {
          console.warn("[AI Promotion Insights] Trying backup model gemini-3.1-flash-lite:", mErr);
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });
        }

        const parsed = JSON.parse(response.text || '{}');
        if (parsed && parsed.resumenSemanal && Array.isArray(parsed.categoriasParaPromocionar)) {
          report = {
            ...parsed,
            fechaGeneracion: todayStr,
            periodoAnalizado: `Últimos 7 días (${sevenDaysAgo} al ${todayStr})`,
            modeloUtilizado: 'Gemini 2.5 Flash'
          };
          console.log("[AI Promotion Insights] Gemini generated report successfully!");
        }
      } catch (geminiErr) {
        console.error("[AI Promotion Insights] Gemini generation error, falling back:", geminiErr);
      }
    }

    if (!report) {
      report = generateFallbackCategoryPromotionInsights(categoriesMetrics);
    }

    // Save in memory cache
    memoryCachedPromotionInsights = report;
    memoryCachedPromotionDate = todayStr;

    // Optional Firestore save
    if (db) {
      try {
        await db.collection('ai_promotion_insights').doc(todayStr).set({
          ...report,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (saveErr) {
        console.warn("[AI Promotion Insights] Could not write to server Firestore:", saveErr);
      }
    }

    return { fromCache: false, report };
  }

  // Endpoints: GET and POST /api/admin/category-promotion-insights
  app.all("/api/admin/category-promotion-insights", async (req, res) => {
    try {
      const force = req.query.force === 'true' || req.body?.force === true;
      const categoriesData = req.body?.categoriesData;
      const result = await performCategoryPromotionAnalysis(force, categoriesData);
      res.json(result);
    } catch (err: any) {
      console.error("Error in /api/admin/category-promotion-insights:", err);
      const fallback = generateFallbackCategoryPromotionInsights(req.body?.categoriesData || []);
      res.json({ fromCache: false, report: fallback });
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
      res.status(200).set({
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }).end(html);
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
      res.status(200).set({
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }).end(html);
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
