/**
 * CLOUD FUNCTIONS (Node.js)
 * 
 * Ubicación: /functions/index.js
 * 
 * Incluye:
 * 1. updateProfessionalRating: Trigger Firestore para calcular promedio de estrellas.
 * 2. createPreference: Callable Function para generar pago en Mercado Pago.
 * 3. webhookMP: HTTPS Function para recibir notificaciones de pago.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
// const mercadopago = require("mercadopago"); // Asumimos instalado en package.json

initializeApp();
const db = getFirestore();

// Configurar Mercado Pago (Reemplazar con ACCESS_TOKEN real)
// mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });

// 1. Trigger: Actualizar Rating
exports.updateProfessionalRating = onDocumentCreated("resenas/{resenaId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const newReview = snapshot.data();
  const profesionalId = newReview.profesionalId;
  const newRating = newReview.rating;

  if (!profesionalId || !newRating) return;

  const professionalRef = db.collection("usuarios").doc(profesionalId);

  try {
    await db.runTransaction(async (transaction) => {
      const professionalDoc = await transaction.get(professionalRef);
      if (!professionalDoc.exists) throw new Error("Profesional no encontrado");

      const data = professionalDoc.data();
      const currentProfile = data.profesionalInfo || {};
      const currentTotal = currentProfile.reviewCount || 0;
      const currentAvg = currentProfile.ratingAvg || 0;

      // Nuevo promedio ponderado
      const newTotal = currentTotal + 1;
      const newAvg = ((currentAvg * currentTotal) + newRating) / newTotal;

      transaction.update(professionalRef, {
        "profesionalInfo.ratingAvg": newAvg,
        "profesionalInfo.reviewCount": newTotal
      });
    });
  } catch (error) {
    console.error("Error updating rating:", error);
  }
});

// 2. Callable: Crear Preferencia de Pago
// Se llama desde el frontend con: const createPreference = httpsCallable(functions, 'createPreference');
exports.createPreference = onRequest(async (req, res) => {
  // Nota: En un entorno real usaríamos onCall, pero aquí usamos onRequest para simplificar la demo HTTP
  // o si se prefiere usar como API REST.
  
  // const { planId, days, price, title } = req.body; 
  
  try {
    /*
    const preference = {
      items: [
        {
          title: title || "Membresía VIP",
          unit_price: price || 5000,
          quantity: 1,
          currency_id: "ARS"
        }
      ],
      // Guardamos UID y Días en external_reference para recuperarlos en el webhook
      // Formato: UID|DAYS
      external_reference: `${req.body.uid}|${req.body.days || 30}`, 
      back_urls: {
        success: `${process.env.APP_URL}/dashboard-profesional?status=success`,
        failure: `${process.env.APP_URL}/dashboard-profesional?status=failure`,
        pending: `${process.env.APP_URL}/dashboard-profesional?status=pending`
      },
      auto_return: "approved",
      notification_url: `${process.env.APP_URL}/api/webhookMP` // URL de la función webhookMP
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.init_point });
    */
    
    // Mock response
    res.json({ init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?..." });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error creando preferencia");
  }
});

// 3. Webhook: Recibir notificación de Mercado Pago
exports.webhookMP = onRequest(async (req, res) => {
  const query = req.query;
  const topic = query.topic || query.type;

  try {
    if (topic === "payment") {
      const paymentId = query.id || query['data.id'];
      
      // Consultar estado del pago a MP
      // const payment = await mercadopago.payment.get(paymentId);
      
      // Mock payment data
      // Simulamos que external_reference viene como "UID|DAYS"
      const payment = {
          body: {
              status: 'approved',
              external_reference: 'USER_UID_MOCK|30' // Esto vendría del pago real
          }
      };

      if (payment.body.status === 'approved') {
        const parts = payment.body.external_reference.split('|');
        const uid = parts[0];
        const days = parseInt(parts[1] || '30');
        
        // Calcular fecha de expiración
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + days);

        // Actualizar usuario a VIP
        await db.collection("usuarios").doc(uid).update({
          "profesionalInfo.isVip": true,
          "profesionalInfo.vipExpiration": expirationDate
        });
        
        console.log(`Usuario ${uid} actualizado a VIP por ${days} días hasta ${expirationDate}`);
      }
    }
    res.status(200).send("OK");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error en webhook");
  }
});

// 4. Función para verificar si la suscripción VIP sigue vigente al iniciar sesión o cargar perfil
// Endpoint: /verifyVipStatus?uid=USER_UID o POST con { uid: "USER_UID" }
exports.verifyVipStatus = onRequest(async (req, res) => {
  // Habilitar CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const uid = req.query.uid || req.body?.uid || req.body?.data?.uid;

  if (!uid) {
    return res.status(400).json({ error: "Parámetro uid requerido" });
  }

  try {
    const userRef = db.collection("usuarios").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const userData = userDoc.data();
    const profesionalInfo = userData.profesionalInfo || {};

    // Si no está registrado como VIP, retornamos estado no VIP
    if (!profesionalInfo.isVip) {
      return res.json({
        uid,
        isVip: false,
        message: "El usuario no es VIP actualmente"
      });
    }

    // Parsear fecha de expiración
    let expirationDate = null;
    const rawExpiration = profesionalInfo.vipExpiration;

    if (rawExpiration) {
      if (typeof rawExpiration.toDate === 'function') {
        expirationDate = rawExpiration.toDate();
      } else if (rawExpiration.seconds) {
        expirationDate = new Date(rawExpiration.seconds * 1000);
      } else if (rawExpiration._seconds) {
        expirationDate = new Date(rawExpiration._seconds * 1000);
      } else {
        expirationDate = new Date(rawExpiration);
      }
    }

    const now = new Date();

    // Si la fecha de vencimiento ya pasó (o no existe fecha pero figuraba VIP)
    if (!expirationDate || expirationDate.getTime() <= now.getTime()) {
      await userRef.update({
        "profesionalInfo.isVip": false,
        "profesionalInfo.vipExpiredAt": now
      });

      console.log(`[Cloud Function] Membresía VIP expirada para ${uid}. Caducó: ${expirationDate}. Se actualizó a isVip: false.`);

      return res.json({
        uid,
        isVip: false,
        expired: true,
        expirationDate: expirationDate ? expirationDate.toISOString() : null,
        message: "Suscripción VIP expirada. Se actualizó el estado a no-VIP."
      });
    }

    // Membresía vigente
    const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return res.json({
      uid,
      isVip: true,
      expired: false,
      expirationDate: expirationDate.toISOString(),
      daysRemaining,
      message: `Suscripción VIP vigente. Quedan ${daysRemaining} días.`
    });
  } catch (error) {
    console.error("Error verificando estado VIP:", error);
    res.status(500).json({ error: "Error interno verificando estado VIP" });
  }
});

// 5. Función masiva para depurar todos los VIPs expirados en la base de datos
exports.cleanExpiredVips = onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).send('');

  try {
    const snapshot = await db.collection("usuarios")
      .where("profesionalInfo.isVip", "==", true)
      .get();

    const now = new Date();
    let updatedCount = 0;
    const updatedUsers = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const rawExp = data.profesionalInfo?.vipExpiration;
      let expDate = null;

      if (rawExp) {
        if (typeof rawExp.toDate === 'function') expDate = rawExp.toDate();
        else if (rawExp.seconds) expDate = new Date(rawExp.seconds * 1000);
        else if (rawExp._seconds) expDate = new Date(rawExp._seconds * 1000);
        else expDate = new Date(rawExp);
      }

      if (!expDate || expDate.getTime() <= now.getTime()) {
        await doc.ref.update({
          "profesionalInfo.isVip": false,
          "profesionalInfo.vipExpiredAt": now
        });
        updatedCount++;
        updatedUsers.push({
          uid: doc.id,
          nombre: data.nombre,
          expiredDate: expDate ? expDate.toISOString() : null
        });
      }
    }

    res.json({
      success: true,
      updatedCount,
      updatedUsers,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error("Error depurando VIPs:", error);
    res.status(500).json({ error: error.message });
  }
});

