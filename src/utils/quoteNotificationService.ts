import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export interface NotifyNewOfferParams {
  trabajoId: string;
  trabajoTitulo: string;
  clienteId: string;
  profesionalNombre: string;
  monto: number | string;
  mensaje?: string;
}

export interface NotifyOfferStatusParams {
  profesionalId: string;
  trabajoTitulo: string;
  nuevoEstado: 'aceptado' | 'rechazado';
  clienteNombre: string;
}

export interface NotifyNewJobParams {
  trabajoId: string;
  rubro: string;
  zona: string;
  titulo: string;
}

/**
 * Notifica al cliente cuando un profesional le envía un presupuesto.
 */
export async function notificarClienteNuevaOferta({
  trabajoId,
  trabajoTitulo,
  clienteId,
  profesionalNombre,
  monto,
  mensaje
}: NotifyNewOfferParams): Promise<boolean> {
  if (!clienteId || clienteId === 'invitado') {
    return false;
  }

  try {
    const formattedMonto = typeof monto === 'number' 
      ? `$${monto.toLocaleString('es-AR')}` 
      : `$${monto}`;

    await addDoc(collection(db, 'notificaciones'), {
      userId: clienteId,
      tipo: 'nuevo_presupuesto',
      titulo: `💼 ¡Nuevo presupuesto para "${trabajoTitulo}"!`,
      mensaje: `${profesionalNombre} te envió una cotización por ${formattedMonto}. Ingresá a tu panel para ver la propuesta y contactarlo.`,
      leida: false,
      fecha: serverTimestamp(),
      referenciaId: trabajoId,
      metadata: {
        trabajoId,
        profesionalNombre,
        monto: String(monto),
        mensaje: mensaje?.slice(0, 100) || ''
      }
    });
    return true;
  } catch (error) {
    console.error("Error al notificar al cliente sobre nueva oferta:", error);
    return false;
  }
}

/**
 * Notifica al profesional cuando el cliente acepta o rechaza su presupuesto.
 */
export async function notificarProfesionalEstadoOferta({
  profesionalId,
  trabajoTitulo,
  nuevoEstado,
  clienteNombre
}: NotifyOfferStatusParams): Promise<boolean> {
  if (!profesionalId) return false;

  try {
    const esAceptado = nuevoEstado === 'aceptado';
    await addDoc(collection(db, 'notificaciones'), {
      userId: profesionalId,
      tipo: esAceptado ? 'presupuesto_aceptado' : 'presupuesto_rechazado',
      titulo: esAceptado 
        ? `🎉 ¡Presupuesto Aceptado!` 
        : `Presupuesto no seleccionado`,
      mensaje: esAceptado
        ? `${clienteNombre} aceptó tu cotización para "${trabajoTitulo}". ¡Coordiná el inicio del trabajo!`
        : `${clienteNombre} actualizó el estado para "${trabajoTitulo}".`,
      leida: false,
      fecha: serverTimestamp(),
      referenciaId: 'mis-presupuestos'
    });
    return true;
  } catch (error) {
    console.error("Error al notificar estado de oferta al profesional:", error);
    return false;
  }
}

import { isVipActive } from './vipUtils';

/**
 * Notifica a los profesionales del rubro cuando se publica un nuevo trabajo en Bahía Blanca.
 * Los profesionales con membresía VIP reciben la alerta anticipada prioritaria de 15 minutos.
 */
export async function notificarProfesionalesNuevoTrabajo({
  trabajoId,
  rubro,
  zona,
  titulo
}: NotifyNewJobParams): Promise<number> {
  try {
    const profQuery = query(
      collection(db, 'usuarios'),
      where('rol', '==', 'profesional'),
      where('profesionalInfo.rubro', '==', rubro)
    );
    const profSnap = await getDocs(profQuery);
    let count = 0;

    for (const profDoc of profSnap.docs) {
      const profData = profDoc.data();
      const isVip = isVipActive((profData?.profesionalInfo || profData) as any);

      if (isVip) {
        // Alerta prioritaria VIP con 15 minutos de ventaja
        await addDoc(collection(db, 'notificaciones'), {
          userId: profDoc.id,
          tipo: 'alerta_vip_nuevo_trabajo',
          titulo: `⚡ ALERTA VIP (15 min antes): ${rubro}`,
          mensaje: `¡Acceso prioritario exclusivo! Nuevo pedido en ${zona}: "${titulo}". Cotizá ahora con ventaja antes de la liberación pública general.`,
          leida: false,
          fecha: serverTimestamp(),
          referenciaId: trabajoId,
          metadata: {
            esVipAnticipada: true,
            trabajoId,
            rubro,
            zona
          }
        });
      } else {
        // Alerta estándar
        await addDoc(collection(db, 'notificaciones'), {
          userId: profDoc.id,
          tipo: 'nuevo_trabajo_publicado',
          titulo: `💼 Nuevo trabajo solicitado: ${rubro}`,
          mensaje: `Se ha publicado un pedido en ${zona}: "${titulo}". Disponible en Bahía Oficios.`,
          leida: false,
          fecha: serverTimestamp(),
          referenciaId: trabajoId,
          metadata: {
            esVipAnticipada: false,
            trabajoId,
            rubro,
            zona
          }
        });
      }
      count++;
    }

    return count;
  } catch (error) {
    console.warn("No se pudieron enviar notificaciones a profesionales:", error);
    return 0;
  }
}
