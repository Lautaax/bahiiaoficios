import { collection, addDoc, serverTimestamp, updateDoc, doc, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { sendPushNotification } from '../utils/notifications';
import { safeLocalStorage } from '../utils/storage';

export interface PhotoIncentiveStatus {
  views: number;
  photosCount: number;
  neededPhotos: number;
  isEligible: boolean;
}

/**
 * Evaluates whether a professional has 0 views and fewer than 2 work photos,
 * making them eligible for the photo upload incentive.
 */
export function getPhotoIncentiveStatus(user?: User | null): PhotoIncentiveStatus {
  if (!user || user.rol !== 'profesional' || !user.profesionalInfo) {
    return {
      views: 0,
      photosCount: 0,
      neededPhotos: 2,
      isEligible: false
    };
  }

  const info = user.profesionalInfo;
  const views = Number(info.profileViews) || 0;

  // Total unique photos count across fotosTrabajos and fotosTrabajosDetalle
  const workUrls = new Set<string>();
  (info.fotosTrabajos || []).forEach(url => {
    if (url && typeof url === 'string') workUrls.add(url.trim());
  });
  (info.fotosTrabajosDetalle || []).forEach(item => {
    if (item?.url && typeof item.url === 'string') workUrls.add(item.url.trim());
  });

  const photosCount = workUrls.size;
  const neededPhotos = Math.max(0, 2 - photosCount);
  const isEligible = views === 0 && photosCount < 2;

  return {
    views,
    photosCount,
    neededPhotos,
    isEligible
  };
}

/**
 * Sends in-app and push notification to a worker with 0 views to incentivize adding at least 2 photos.
 */
export async function sendPhotoIncentiveNotification(
  worker: User,
  customTitle?: string,
  customMessage?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const status = getPhotoIncentiveStatus(worker);
    const firstName = worker.nombre ? worker.nombre.split(' ')[0] : 'colega';
    const rubro = worker.profesionalInfo?.rubro || 'tu oficio';

    const title = customTitle || '📸 ¡Duplicá tus contactos! Sumá fotos de tus trabajos';
    const message = customMessage || `Hola ${firstName}, los perfiles de ${rubro} con al menos 2 fotos de trabajos reales duplican la tasa de contacto (+100%) y generan mayor confianza en los vecinos de Bahía Blanca. ¡Cargá tus fotos y empezá a recibir tus primeras visitas!`;

    // 1. Write notification to Firestore
    await addDoc(collection(db, 'notificaciones'), {
      userId: worker.uid,
      tipo: 'incentivo_fotos',
      titulo: title,
      mensaje: message,
      leida: false,
      fecha: serverTimestamp(),
      referenciaId: 'perfil_portafolio',
      accionUrl: '/dashboard-profesional?tab=perfil&section=portafolio',
      meta: {
        viewsAtSent: status.views,
        photosAtSent: status.photosCount,
        category: rubro
      }
    });

    // 2. Trigger native browser push notification if permitted
    sendPushNotification(title, {
      body: message,
      icon: worker.fotoUrl || '/vite.svg'
    });

    // 3. Mark user document to prevent spamming
    try {
      await updateDoc(doc(db, 'usuarios', worker.uid), {
        'profesionalInfo.lastPhotoIncentiveSent': serverTimestamp()
      });
    } catch (e) {
      console.warn('[photoIncentiveService] Could not update lastPhotoIncentiveSent on user doc:', e);
    }

    // 4. Save to local storage for quick throttling
    safeLocalStorage.setItem(`photo_incentive_sent_${worker.uid}`, new Date().toISOString());

    return {
      success: true,
      message: `Incentivo de fotos enviado correctamente a ${worker.nombre}.`
    };
  } catch (error: any) {
    console.error('[photoIncentiveService] Error sending photo incentive notification:', error);
    return {
      success: false,
      message: error?.message || 'Error al enviar la notificación de incentivo de fotos.'
    };
  }
}

/**
 * Automatically evaluates whether the logged-in worker should receive the incentive notification.
 * Throttled to run at most once every 7 days.
 */
export async function checkAndTriggerPhotoIncentiveForUser(user?: User | null): Promise<boolean> {
  if (!user || user.rol !== 'profesional') return false;

  const status = getPhotoIncentiveStatus(user);
  if (!status.isEligible) return false;

  // Local storage throttle: don't notify more than once every 7 days in the same browser session
  const throttleKey = `photo_incentive_sent_${user.uid}`;
  const lastSentLocal = safeLocalStorage.getItem(throttleKey);
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  if (lastSentLocal) {
    const elapsed = now - new Date(lastSentLocal).getTime();
    if (elapsed < SEVEN_DAYS_MS) {
      return false;
    }
  }

  // Check Firestore user record for lastPhotoIncentiveSent
  const lastSentRemote = (user.profesionalInfo as any)?.lastPhotoIncentiveSent;
  if (lastSentRemote) {
    const remoteDate = lastSentRemote.toDate ? lastSentRemote.toDate() : new Date(lastSentRemote);
    if (now - remoteDate.getTime() < SEVEN_DAYS_MS) {
      safeLocalStorage.setItem(throttleKey, remoteDate.toISOString());
      return false;
    }
  }

  // Also verify whether there is an existing unread 'incentivo_fotos' notification in Firestore
  try {
    const q = query(
      collection(db, 'notificaciones'),
      where('userId', '==', user.uid),
      where('tipo', '==', 'incentivo_fotos'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      // Notification was already sent previously
      safeLocalStorage.setItem(throttleKey, new Date().toISOString());
      return false;
    }
  } catch (e) {
    console.warn('[photoIncentiveService] Firestore query error check:', e);
  }

  // Send the notification
  const res = await sendPhotoIncentiveNotification(user);
  return res.success;
}

/**
 * Filters all users to find professionals who have 0 views and fewer than 2 work photos.
 */
export function findWorkersNeedingPhotos(users: User[]): { user: User; status: PhotoIncentiveStatus }[] {
  return users
    .filter(u => u.rol === 'profesional' && u.profesionalInfo)
    .map(u => ({
      user: u,
      status: getPhotoIncentiveStatus(u)
    }))
    .filter(item => item.status.isEligible);
}

/**
 * Bulk sender for admin to notify all workers with 0 views and fewer than 2 photos.
 */
export async function sendBulkPhotoIncentives(
  workers: User[],
  onProgress?: (current: number, total: number) => void
): Promise<{ successCount: number; failCount: number }> {
  let successCount = 0;
  let failCount = 0;
  const total = workers.length;

  for (let i = 0; i < total; i++) {
    const worker = workers[i];
    const res = await sendPhotoIncentiveNotification(worker);
    if (res.success) {
      successCount++;
    } else {
      failCount++;
    }
    if (onProgress) {
      onProgress(i + 1, total);
    }
    // Small pause to prevent hitting rate limits
    await new Promise(r => setTimeout(r, 60));
  }

  return { successCount, failCount };
}
