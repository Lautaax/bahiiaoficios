import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { BAHIA_BLANCA_ZONES_GEO, getZoneGeo, BahiaZoneGeo } from '../data/bahiaBlancaZones';
import { sendPushNotification } from '../utils/notifications';

export interface ZoneHeatData {
  name: string;
  lat: number;
  lng: number;
  requestCount: number;
  intensity: number; // 0 - 100
  level: 'critica' | 'alta' | 'media' | 'baja' | 'sin_datos';
  color: string;
  topRubros: { rubro: string; count: number; percentage: number }[];
  urgentCount: number;
  professionalsCount: number;
  coverageRatio: number; // requests per professional
  avgBudgetEstimate?: string;
  lastRequestDate?: string;
}

export interface HeatMapStats {
  totalRequests: number;
  activeZonesCount: number;
  topZoneName: string;
  topZoneCount: number;
  mostRequestedRubro: string;
  zones: ZoneHeatData[];
}

export interface InactiveProfessionalItem {
  user: User;
  daysInactive: number;
  lastActiveDate: Date | null;
  views: number;
  contacts: number;
  photosCount: number;
  needsPhotosIncentive: boolean;
  reasons: string[];
  lastReactivationSent?: Date | null;
  status: 'pendiente' | 'notificado_reciente';
}

/**
 * Loads service requests from 'trabajosSolicitados', 'quoteRequests' and users
 * to compute geographic heat map data across Bahía Blanca.
 */
export async function getBahiaBlancaHeatMapData(
  selectedRubro: string = 'todos',
  timeframeDays: number = 0 // 0 = all time, 30 = last 30 days, 7 = last 7 days
): Promise<HeatMapStats> {
  try {
    const [jobsSnap, quotesSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, 'trabajosSolicitados')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'quoteRequests')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'usuarios')).catch(() => ({ docs: [] }))
    ]);

    const now = new Date();
    const cutoffDate = timeframeDays > 0 ? new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000) : null;

    // Map of zone -> list of requests
    const zoneRequestsMap: Record<string, { rubro: string; urgente: boolean; fecha: Date | null }[]> = {};
    const zoneProsMap: Record<string, number> = {};

    // Initialize zones
    BAHIA_BLANCA_ZONES_GEO.forEach(z => {
      zoneRequestsMap[z.name] = [];
      zoneProsMap[z.name] = 0;
    });

    // Count professionals per zone
    usersSnap.docs.forEach(docSnap => {
      const u = docSnap.data() as User;
      if (u.rol === 'profesional' && u.zona) {
        const geo = getZoneGeo(u.zona);
        zoneProsMap[geo.name] = (zoneProsMap[geo.name] || 0) + 1;
      }
    });

    let totalFilteredRequests = 0;
    const rubroGlobalMap: Record<string, number> = {};

    // Process trabajosSolicitados
    jobsSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const rubro = data.rubro || 'General';
      const zona = data.zona || 'Centro';
      
      let reqDate: Date | null = null;
      if (data.fechaCreacion?.toDate) reqDate = data.fechaCreacion.toDate();
      else if (data.createdAt?.toDate) reqDate = data.createdAt.toDate();
      else if (data.fechaCreacion) reqDate = new Date(data.fechaCreacion);

      if (cutoffDate && reqDate && reqDate < cutoffDate) {
        return;
      }

      if (selectedRubro !== 'todos' && rubro.toLowerCase() !== selectedRubro.toLowerCase()) {
        return;
      }

      const geo = getZoneGeo(zona);
      if (!zoneRequestsMap[geo.name]) zoneRequestsMap[geo.name] = [];
      zoneRequestsMap[geo.name].push({
        rubro,
        urgente: Boolean(data.urgente || data.urgencia === 'hoy' || data.urgencia === 'esta_semana'),
        fecha: reqDate
      });

      totalFilteredRequests++;
      rubroGlobalMap[rubro] = (rubroGlobalMap[rubro] || 0) + 1;
    });

    // Also factor in direct quoteRequests
    quotesSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const rubro = data.rubro || 'General';
      const zona = data.zona || 'Centro';

      let reqDate: Date | null = null;
      if (data.fecha?.toDate) reqDate = data.fecha.toDate();
      else if (data.createdAt?.toDate) reqDate = data.createdAt.toDate();

      if (cutoffDate && reqDate && reqDate < cutoffDate) {
        return;
      }

      if (selectedRubro !== 'todos' && rubro.toLowerCase() !== selectedRubro.toLowerCase()) {
        return;
      }

      const geo = getZoneGeo(zona);
      if (!zoneRequestsMap[geo.name]) zoneRequestsMap[geo.name] = [];
      zoneRequestsMap[geo.name].push({
        rubro,
        urgente: Boolean(data.urgente),
        fecha: reqDate
      });

      totalFilteredRequests++;
      rubroGlobalMap[rubro] = (rubroGlobalMap[rubro] || 0) + 1;
    });

    // Find maximum requests across any single zone to scale 0 - 100
    const counts = Object.values(zoneRequestsMap).map(arr => arr.length);
    const maxCount = Math.max(...counts, 1);

    let topZoneName = 'Centro';
    let topZoneCount = 0;

    const zonesData: ZoneHeatData[] = BAHIA_BLANCA_ZONES_GEO.map(geo => {
      const list = zoneRequestsMap[geo.name] || [];
      const count = list.length;
      if (count > topZoneCount) {
        topZoneCount = count;
        topZoneName = geo.name;
      }

      const intensity = count > 0 ? Math.min(100, Math.round((count / maxCount) * 100)) : 0;
      
      let level: ZoneHeatData['level'] = 'sin_datos';
      let color = '#94a3b8'; // slate

      if (intensity >= 75) {
        level = 'critica';
        color = '#ef4444'; // red-500
      } else if (intensity >= 50) {
        level = 'alta';
        color = '#f97316'; // orange-500
      } else if (intensity >= 20) {
        level = 'media';
        color = '#eab308'; // yellow-500
      } else if (count > 0) {
        level = 'baja';
        color = '#10b981'; // emerald-500
      }

      // Count rubros within this zone
      const rubroCounts: Record<string, number> = {};
      let urgentCount = 0;
      let latestDate: Date | null = null;

      list.forEach(item => {
        rubroCounts[item.rubro] = (rubroCounts[item.rubro] || 0) + 1;
        if (item.urgente) urgentCount++;
        if (item.fecha && (!latestDate || item.fecha > latestDate)) {
          latestDate = item.fecha;
        }
      });

      const topRubros = Object.entries(rubroCounts)
        .map(([r, c]) => ({
          rubro: r,
          count: c,
          percentage: count > 0 ? Math.round((c / count) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      const pros = zoneProsMap[geo.name] || 0;
      const coverageRatio = pros > 0 ? Number((count / pros).toFixed(1)) : count;

      return {
        name: geo.name,
        lat: geo.lat,
        lng: geo.lng,
        requestCount: count,
        intensity,
        level,
        color,
        topRubros,
        urgentCount,
        professionalsCount: pros,
        coverageRatio,
        lastRequestDate: latestDate ? latestDate.toLocaleDateString('es-AR') : undefined
      };
    }).sort((a, b) => b.requestCount - a.requestCount);

    const activeZonesCount = zonesData.filter(z => z.requestCount > 0).length;

    // Most requested rubro globally
    const topRubroEntry = Object.entries(rubroGlobalMap).sort((a, b) => b[1] - a[1])[0];
    const mostRequestedRubro = topRubroEntry ? `${topRubroEntry[0]} (${topRubroEntry[1]})` : 'General';

    return {
      totalRequests: totalFilteredRequests,
      activeZonesCount,
      topZoneName,
      topZoneCount,
      mostRequestedRubro,
      zones: zonesData
    };
  } catch (error) {
    console.error("Error computing Bahía Blanca heat map data:", error);
    return {
      totalRequests: 0,
      activeZonesCount: 0,
      topZoneName: 'Centro',
      topZoneCount: 0,
      mostRequestedRubro: 'N/A',
      zones: BAHIA_BLANCA_ZONES_GEO.map(geo => ({
        name: geo.name,
        lat: geo.lat,
        lng: geo.lng,
        requestCount: 0,
        intensity: 0,
        level: 'sin_datos',
        color: '#94a3b8',
        topRubros: [],
        urgentCount: 0,
        professionalsCount: 0,
        coverageRatio: 0
      }))
    };
  }
}

/**
 * Identifies professionals who haven't had visits or activity in the last 30 days.
 */
export function identifyInactiveProfessionals(
  allUsers: User[],
  daysThreshold: number = 30
): InactiveProfessionalItem[] {
  const now = new Date();
  const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
  const cutoffTime = now.getTime() - thresholdMs;

  const inactiveList: InactiveProfessionalItem[] = [];

  const pros = allUsers.filter(u => u.rol === 'profesional' && u.profesionalInfo);

  pros.forEach(pro => {
    const info = pro.profesionalInfo || ({} as any);
    const views = Number(info.profileViews) || 0;
    const contacts = Number(info.whatsappClicks) || 0;

    // Determine the most recent activity timestamp
    let lastDate: Date | null = null;

    if ((pro as any).lastLogin?.toDate) {
      lastDate = (pro as any).lastLogin.toDate();
    } else if ((pro as any).lastActive?.toDate) {
      lastDate = (pro as any).lastActive.toDate();
    } else if (info.lastActivity?.toDate) {
      lastDate = info.lastActivity.toDate();
    } else if (pro.createdAt?.toDate) {
      lastDate = pro.createdAt.toDate();
    } else if (pro.createdAt) {
      lastDate = new Date(pro.createdAt);
    }

    let lastSent: Date | null = null;
    if ((pro as any).lastReactivationSent?.toDate) {
      lastSent = (pro as any).lastReactivationSent.toDate();
    } else if ((pro as any).lastReactivationSent) {
      lastSent = new Date((pro as any).lastReactivationSent);
    }

    const reasons: string[] = [];
    let isInactive = false;
    let daysInactive = 30;

    if (lastDate) {
      const elapsedMs = now.getTime() - lastDate.getTime();
      daysInactive = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
      if (lastDate.getTime() < cutoffTime) {
        isInactive = true;
        reasons.push(`Sin actividad registrada hace ${daysInactive} días`);
      }
    } else {
      // No date found and 0 views
      isInactive = true;
      daysInactive = 35;
      reasons.push('Sin fecha de actividad reciente');
    }

    // Work photos calculation
    const photos = pro.profesionalInfo?.fotosTrabajos || [];
    const photosDetalle = pro.profesionalInfo?.fotosTrabajosDetalle || [];
    const photoUrls = new Set<string>();
    photos.forEach(url => { if (url) photoUrls.add(url.trim()); });
    photosDetalle.forEach(d => { if (d?.url) photoUrls.add(d.url.trim()); });
    const photosCount = photoUrls.size;
    const needsPhotosIncentive = views === 0 && photosCount < 2;

    if (views === 0) {
      isInactive = true;
      if (needsPhotosIncentive) {
        reasons.push(`0 visitas y solo ${photosCount}/2 fotos de trabajos (Incentivo activo)`);
      } else {
        reasons.push('0 visitas acumuladas a su perfil');
      }
    } else if (views < 3 && daysInactive >= 20) {
      isInactive = true;
      reasons.push(`Apenas ${views} visitas registradas`);
    }

    if (contacts === 0 && daysInactive >= 20) {
      reasons.push('0 contactos directos por WhatsApp');
    }

    if (isInactive) {
      // Check if notified within the last 7 days
      const notifiedRecently = lastSent && (now.getTime() - lastSent.getTime() < 7 * 24 * 60 * 60 * 1000);

      inactiveList.push({
        user: pro,
        daysInactive,
        lastActiveDate: lastDate,
        views,
        contacts,
        photosCount,
        needsPhotosIncentive,
        reasons,
        lastReactivationSent: lastSent,
        status: notifiedRecently ? 'notificado_reciente' : 'pendiente'
      });
    }
  });

  // Sort: pending first, then by highest days of inactivity
  return inactiveList.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'pendiente' ? -1 : 1;
    }
    return b.daysInactive - a.daysInactive;
  });
}

/**
 * Sends a reactivation push notification to a single professional.
 * Stores in Firestore 'notificaciones', triggers browser notification,
 * and updates user's lastReactivationSent.
 */
export async function sendReactivationNotification(
  professional: User,
  customTitle?: string,
  customMessage?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const rubro = professional.profesionalInfo?.rubro || 'oficio';
    const zona = professional.zona || 'Bahía Blanca';

    const title = customTitle || `👋 ¡Hola ${professional.nombre.split(' ')[0]}! Te extrañamos en Bahía Oficios`;
    const message = customMessage || `Hay vecinos de ${zona} buscando presupuestos de ${rubro}. Reactivá tu perfil para recibir solicitudes y presupuestar hoy.`;

    // 1. Add to notificaciones collection in Firestore
    await addDoc(collection(db, 'notificaciones'), {
      userId: professional.uid,
      tipo: 'reactivacion',
      titulo: title,
      mensaje: message,
      leida: false,
      fecha: serverTimestamp(),
      referenciaId: 'admin_reactivation',
      metadata: {
        tipo: 'reactivacion_profesional',
        rubro,
        zona,
        enviadoPorAdmin: true,
        fechaEnvio: new Date().toISOString()
      }
    });

    // 2. Update user document with lastReactivationSent
    try {
      await updateDoc(doc(db, 'usuarios', professional.uid), {
        lastReactivationSent: serverTimestamp()
      });
    } catch (e) {
      console.warn("Could not update user lastReactivationSent:", e);
    }

    // 3. Trigger Web Push API if browser supports it
    sendPushNotification(title, {
      body: message,
      icon: professional.fotoUrl || '/vite.svg',
      tag: `reactivacion-${professional.uid}`
    });

    return {
      success: true,
      message: `Notificación push enviada con éxito a ${professional.nombre}`
    };
  } catch (error: any) {
    console.error("Error sending reactivation push notification:", error);
    return {
      success: false,
      message: error?.message || 'Error al enviar la notificación'
    };
  }
}

/**
 * Bulk send reactivation push notifications to multiple inactive professionals.
 */
export async function sendBulkReactivationNotifications(
  professionals: User[],
  customTitle?: string,
  customMessage?: string,
  onProgress?: (completed: number, total: number) => void
): Promise<{ totalSent: number; failed: number }> {
  let totalSent = 0;
  let failed = 0;

  for (let i = 0; i < professionals.length; i++) {
    const pro = professionals[i];
    const res = await sendReactivationNotification(pro, customTitle, customMessage);
    if (res.success) {
      totalSent++;
    } else {
      failed++;
    }
    if (onProgress) {
      onProgress(i + 1, professionals.length);
    }
  }

  return { totalSent, failed };
}
