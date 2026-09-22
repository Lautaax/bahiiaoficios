import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  increment,
  limit,
  orderBy
} from 'firebase/firestore';
import { sendPushNotification } from '../utils/notifications';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const LAST_CHECK_KEY = 'bahia_last_quote_reminder_check';

export interface ReminderResult {
  checkedCount: number;
  remindersSent: number;
  details: Array<{
    requestId: string;
    profesionalId: string;
    rubro: string;
    hoursPending: number;
  }>;
}

export const quoteReminderService = {
  /**
   * Scans pending quote requests in Firestore and sends notifications to professionals
   * who haven't responded after 24 hours.
   */
  processPendingQuoteReminders: async (currentUserId?: string): Promise<ReminderResult> => {
    const result: ReminderResult = {
      checkedCount: 0,
      remindersSent: 0,
      details: []
    };

    try {
      const now = Date.now();

      // Query quoteRequests that are still 'pendiente'
      const q = query(
        collection(db, 'quoteRequests'),
        where('estado', '==', 'pendiente'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      result.checkedCount = snapshot.size;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const requestId = docSnap.id;

        // Determine created date
        let createdMs = 0;
        if (data.fecha?.toMillis) {
          createdMs = data.fecha.toMillis();
        } else if (data.createdAt?.toMillis) {
          createdMs = data.createdAt.toMillis();
        } else if (data.fecha) {
          createdMs = new Date(data.fecha).getTime();
        }

        if (!createdMs) continue;

        const ageMs = now - createdMs;
        const hoursPending = Math.round(ageMs / (1000 * 60 * 60));

        // Only process if older than 24 hours
        if (ageMs < TWENTY_FOUR_HOURS_MS) continue;

        // Check if reminder was already sent recently (within the last 24h)
        let lastReminderMs = 0;
        if (data.fechaUltimoRecordatorio?.toMillis) {
          lastReminderMs = data.fechaUltimoRecordatorio.toMillis();
        }
        if (lastReminderMs && (now - lastReminderMs < TWENTY_FOUR_HOURS_MS)) {
          continue; // Already reminded in this 24h window
        }

        // Identify professionals who haven't responded yet
        const assigned: string[] = data.profesionalesAsignados || [];
        const responses: any[] = data.respuestas || [];
        const respondedProIds = new Set(responses.map(r => r.profesionalId));

        // Professionals who are assigned but haven't answered
        const pendingPros = assigned.filter(proId => !respondedProIds.has(proId));

        if (pendingPros.length === 0) continue;

        // Notify each pending professional
        for (const proId of pendingPros) {
          // Send in-app notification to Firestore collection 'notificaciones'
          try {
            await addDoc(collection(db, 'notificaciones'), {
              userId: proId,
              tipo: 'recordatorio_presupuesto_24h',
              titulo: '⏰ Presupuesto pendiente (+24hs)',
              mensaje: `Un vecino de Bahía Blanca espera tu presupuesto para "${data.rubro || data.titulo || 'trabajo'}" hace más de 24 horas. ¡Respondé ahora para concretar el trabajo!`,
              referenciaId: requestId,
              leida: false,
              fecha: serverTimestamp(),
              metadata: {
                requestId,
                rubro: data.rubro || '',
                zona: data.zona || '',
                horasPendiente: hoursPending
              }
            });

            // Store in Firestore collection 'recordatorios_presupuestos' for AI auditing and analytics
            await addDoc(collection(db, 'recordatorios_presupuestos'), {
              solicitudId: requestId,
              tipo: 'quote_request',
              profesionalId: proId,
              clienteNombre: data.clienteNombre || 'Vecino de Bahía',
              rubro: data.rubro || '',
              zona: data.zona || '',
              horasPendiente: hoursPending,
              fechaRecordatorio: serverTimestamp(),
              estado: 'enviado'
            });

            // If the logged in user is this professional, also show push notification immediately
            if (currentUserId && currentUserId === proId) {
              sendPushNotification('⏰ Presupuesto pendiente (+24hs)', {
                body: `Tenés una solicitud de presupuesto para ${data.rubro || 'tu rubro'} que espera respuesta hace más de 24 horas.`,
                icon: '/vite.svg'
              });
            }

            result.remindersSent++;
            result.details.push({
              requestId,
              profesionalId: proId,
              rubro: data.rubro || '',
              hoursPending
            });
          } catch (notifErr) {
            console.warn(`Error sending notification to pro ${proId}:`, notifErr);
          }
        }

        // Mark the quoteRequest as reminded
        try {
          await updateDoc(doc(db, 'quoteRequests', requestId), {
            recordatorio24hEnviado: true,
            fechaUltimoRecordatorio: serverTimestamp(),
            recordatoriosEnviadosCount: increment(1)
          });
        } catch (updateErr) {
          console.warn(`Error updating quoteRequest ${requestId}:`, updateErr);
        }
      }
    } catch (error) {
      console.warn("Error running pending quote reminders:", error);
    }

    return result;
  },

  /**
   * Throttled check: only runs at most once every 30 minutes per browser session
   */
  checkIfDueAndRun: async (userId?: string): Promise<ReminderResult | null> => {
    try {
      const lastCheck = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
      const now = Date.now();
      const THIRTY_MINUTES_MS = 30 * 60 * 1000;

      if (now - lastCheck < THIRTY_MINUTES_MS) {
        return null; // Not due yet
      }

      localStorage.setItem(LAST_CHECK_KEY, String(now));
      return await quoteReminderService.processPendingQuoteReminders(userId);
    } catch {
      return null;
    }
  }
};
