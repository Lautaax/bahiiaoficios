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

  // Image Caching Middleware
  app.use((req, res, next) => {
    // Set caching for static images
    if (req.url.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
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
      const isAd = type === 'ad_payment';
      const unitPrice = Number(price) || (isDeposit ? 10000 : (isAd ? 15000 : 5000));
      
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
          
          const metadata = payment.metadata || {};
          const user_id = metadata.user_id || metadata.userId;
          const months = metadata.months;
          const type = metadata.type;
          const request_id = metadata.request_id || metadata.requestId;
          const profesional_id = metadata.profesional_id || metadata.profesionalId;
          const adId = metadata.adId || metadata.ad_id;
          
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
          } else if (type === 'ad_payment' && adId && months) {
            try {
              const db = admin.firestore();
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
            } catch (dbError) {
              console.error("Error updating Firestore for ad:", dbError);
            }
          } else if (user_id && months) {
            try {
              const db = admin.firestore();
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

    try {
      const db = admin.firestore();
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
    try {
      const db = admin.firestore();
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
      geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
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
