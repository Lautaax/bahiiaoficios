import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ProfesionalInfo } from '../types';

/**
 * Parsea con seguridad cualquier formato de fecha proveniente de Firestore o API
 * (Timestamp, {_seconds}, {seconds}, string ISO, o Date)
 */
export const parseVipDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal?.toDate === 'function') return dateVal.toDate();
  if (dateVal?.seconds !== undefined) return new Date(dateVal.seconds * 1000);
  if (dateVal?._seconds !== undefined) return new Date(dateVal._seconds * 1000);
  
  const parsed = new Date(dateVal);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Obtiene la fecha de expiración VIP del perfil profesional
 */
export const getVipExpirationDate = (profesionalInfo?: ProfesionalInfo | null): Date | null => {
  if (!profesionalInfo?.vipExpiration) return null;
  return parseVipDate(profesionalInfo.vipExpiration);
};

/**
 * Determina si la suscripción VIP está verdaderamente activa en este momento
 */
export const isVipActive = (profesionalInfo?: ProfesionalInfo | null): boolean => {
  if (!profesionalInfo?.isVip) return false;
  
  const expiration = getVipExpirationDate(profesionalInfo);
  if (!expiration) {
    // Si no tiene fecha de expiración pero tiene el flag, asumimos activo temporalmente
    return true;
  }
  
  return expiration.getTime() > Date.now();
};

export type VipSubscriptionStatus = 'active' | 'expiring_soon' | 'expired' | 'none';

/**
 * Obtiene el estado detallado de la suscripción VIP
 */
export const getVipStatus = (profesionalInfo?: ProfesionalInfo | null): VipSubscriptionStatus => {
  const expiration = getVipExpirationDate(profesionalInfo);
  const flagVip = !!profesionalInfo?.isVip;

  if (!flagVip && !expiration) return 'none';

  if (!expiration) {
    return flagVip ? 'active' : 'none';
  }

  const now = Date.now();
  const diffTime = expiration.getTime() - now;

  if (diffTime < 0) {
    return 'expired';
  }

  // Si faltan 7 días o menos (7 * 24 * 60 * 60 * 1000 ms)
  if (diffTime <= 7 * 24 * 60 * 60 * 1000) {
    return 'expiring_soon';
  }

  return 'active';
};

/**
 * Calcula la diferencia en días respecto a hoy para mostrar información comercial
 */
export const getVipDiffInfo = (profesionalInfo?: ProfesionalInfo | null): { 
  days: number; 
  isPast: boolean; 
  label: string; 
  expirationDate: Date | null 
} => {
  const expiration = getVipExpirationDate(profesionalInfo);
  if (!expiration) {
    return { days: 0, isPast: false, label: 'Sin fecha registrada', expirationDate: null };
  }

  const now = new Date();
  // Normalizar a medianoche para comparación de días limpia
  const dateMidnight = new Date(expiration.getFullYear(), expiration.getMonth(), expiration.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = dateMidnight.getTime() - nowMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysPast = Math.abs(diffDays);
    return {
      days: daysPast,
      isPast: true,
      label: daysPast === 1 ? 'Venció ayer' : `Venció hace ${daysPast} días`,
      expirationDate: expiration
    };
  } else if (diffDays === 0) {
    return {
      days: 0,
      isPast: false,
      label: 'Vence hoy',
      expirationDate: expiration
    };
  } else {
    return {
      days: diffDays,
      isPast: false,
      label: diffDays === 1 ? 'Vence mañana' : `Vence en ${diffDays} días`,
      expirationDate: expiration
    };
  }
};

/**
 * Verifica si el VIP está expirado y, de ser así, actualiza Firestore automáticamente
 * poniendo 'profesionalInfo.isVip' en false.
 * Retorna true si el usuario fue expirado y actualizado.
 */
export const checkAndExpireUserVip = async (
  userId: string, 
  profesionalInfo?: ProfesionalInfo | null
): Promise<boolean> => {
  if (!userId || !profesionalInfo) return false;

  const expiration = getVipExpirationDate(profesionalInfo);
  if (!expiration) return false;

  const isExpired = expiration.getTime() <= Date.now();
  
  // Si está marcado como VIP pero ya venció, actualizamos Firestore
  if (profesionalInfo.isVip && isExpired) {
    try {
      const userRef = doc(db, 'usuarios', userId);
      await updateDoc(userRef, {
        'profesionalInfo.isVip': false,
        'profesionalInfo.vipExpiredAt': new Date()
      });
      console.log(`[VIP Manager] Usuario ${userId} actualizado a no-VIP por vencimiento (${expiration.toLocaleDateString()})`);
      return true;
    } catch (error) {
      console.error(`[VIP Manager] Error al expirar VIP de usuario ${userId}:`, error);
      return false;
    }
  }

  return false;
};
