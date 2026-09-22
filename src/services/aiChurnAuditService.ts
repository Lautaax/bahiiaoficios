import { ChurnAuditReport, ChurnRiskAlert, User } from '../types';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { sendPushNotification } from '../utils/notifications';

export async function getDailyChurnAudit(
  force: boolean = false,
  existingUsers?: User[]
): Promise<{ fromCache: boolean; audit: ChurnAuditReport }> {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Try reading client-side Firestore cache if not forcing
  if (!force) {
    try {
      const cacheSnap = await getDoc(doc(db, 'daily_ai_audits', todayStr));
      if (cacheSnap.exists()) {
        const audit = cacheSnap.data() as ChurnAuditReport;
        console.log('[aiChurnAuditService] Loaded audit from client Firestore cache');
        return { fromCache: true, audit };
      }
    } catch (cacheErr) {
      console.warn('[aiChurnAuditService] Could not read Firestore cache:', cacheErr);
    }
  }

  // 2. Prepare payload from existingUsers or fetch from Firestore
  try {
    let usersList = existingUsers || [];
    if (usersList.length === 0) {
      const usersSnap = await getDocs(collection(db, 'usuarios'));
      usersList = usersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as User));
    }

    // Fetch jobs
    let jobsList: any[] = [];
    try {
      const jobsSnap = await getDocs(collection(db, 'trabajosSolicitados'));
      jobsList = jobsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          rubro: data.rubro || 'General',
          zona: data.zona || 'Bahía Blanca',
          estado: data.estado || 'abierto',
          presupuestosCount: Array.isArray(data.presupuestos) ? data.presupuestos.length : 0
        };
      });
    } catch (e) {
      console.warn('[aiChurnAuditService] Could not load trabajosSolicitados:', e);
    }

    const openJobsByRubro: Record<string, number> = {};
    jobsList.forEach(j => {
      if (j.estado === 'abierto' || j.presupuestosCount === 0) {
        openJobsByRubro[j.rubro] = (openJobsByRubro[j.rubro] || 0) + 1;
      }
    });

    const now = new Date();
    const prosData: any[] = [];

    usersList.forEach((userItem) => {
      const u = userItem as any;
      if (u.rol === 'profesional' || u.profesionalInfo) {
        const info = (u.profesionalInfo || {}) as any;
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
          uid: u.uid,
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

    // 3. Post to backend to run Gemini
    const res = await fetch(`/api/admin/daily-churn-audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        force,
        prosData,
        jobsData: jobsList
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al procesar con Gemini');
    }

    const data = await res.json();
    const audit: ChurnAuditReport = data.audit;

    // 4. Save to Firestore client cache
    try {
      await setDoc(doc(db, 'daily_ai_audits', todayStr), {
        ...audit,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (saveErr) {
      console.warn('[aiChurnAuditService] Could not cache to Firestore client:', saveErr);
    }

    return { fromCache: data.fromCache, audit };
  } catch (err: any) {
    console.warn('[aiChurnAuditService] POST with data failed, trying fallback GET:', err);
    const fallbackRes = await fetch(`/api/admin/daily-churn-audit${force ? '?force=true' : ''}`);
    if (fallbackRes.ok) {
      return await fallbackRes.json();
    }
    throw err;
  }
}


/**
 * Builds the WhatsApp URL with the suggested Gemini personalized message
 */
export function buildWhatsAppReactivationUrl(alert: ChurnRiskAlert): string | null {
  const rawPhone = alert.telefono || '';
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return null;

  // Format for Argentina WhatsApp
  let fullPhone = digits;
  if (!fullPhone.startsWith('54')) {
    fullPhone = `549${digits.replace(/^0+/, '').replace(/^15/, '')}`;
  }

  const encodedMsg = encodeURIComponent(alert.mensajeSugeridoWhatsApp);
  return `https://wa.me/${fullPhone}?text=${encodedMsg}`;
}

/**
 * Sends a notification directly to the professional with the AI reactivation copy
 */
export async function sendReactivationPushNotification(alert: ChurnRiskAlert): Promise<boolean> {
  try {
    const title = `¡Oportunidades en Bahía Blanca para ${alert.rubro}!`;
    const message = alert.mensajeSugeridoWhatsApp;

    // 1. Save in Firestore notifications collection
    await addDoc(collection(db, 'notificaciones'), {
      userId: alert.profesionalId,
      titulo: title,
      mensaje: message,
      leida: false,
      fecha: serverTimestamp(),
      tipo: 'reactivacion_ia',
      referenciaId: 'gemini_churn_audit',
      metadata: {
        rubro: alert.rubro,
        zona: alert.zona,
        nivelRiesgo: alert.nivelRiesgo,
        enviadoPorAdmin: true
      }
    });

    // 2. Update user's lastReactivationSent
    try {
      await updateDoc(doc(db, 'usuarios', alert.profesionalId), {
        lastReactivationSent: serverTimestamp()
      });
    } catch (e) {
      console.warn("Could not update user lastReactivationSent:", e);
    }

    // 3. Trigger browser Web Push notification
    sendPushNotification(title, {
      body: message.slice(0, 160) + '...',
      icon: alert.fotoUrl || '/vite.svg',
      tag: `reactivacion-${alert.profesionalId}`
    });

    return true;
  } catch (error) {
    console.error('Error sending reactivation push notification:', error);
    return false;
  }
}

