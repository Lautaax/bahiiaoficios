import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface SavedPresupuestoItem {
  id: string;
  tarea: string;
  unidad: string;
  cantidad: number;
  costoMatUnit: number;
  costoMoUnit: number;
  subtotalMat: number;
  subtotalMo: number;
  subtotalTotal: number;
}

export interface SavedPresupuesto {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  titulo: string;
  rubro: string;
  fecha: string;
  fechaTimestamp: number;
  items: SavedPresupuestoItem[];
  montoManoObra: number;
  montoMateriales: number;
  montoTotal: number;
  montoSena: number;
  montoSaldo: number;
  formaPago?: string;
  plazoEntrega?: string;
  fechaInicio?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  clienteDireccion?: string;
  proNombre?: string;
  proTelefono?: string;
  observaciones?: string;
}

const LOCAL_STORAGE_KEY = 'bahia_oficios_presupuestos_history';

/**
 * Obtener todos los presupuestos guardados (combina localStorage y Firestore para el usuario)
 */
export async function getPresupuestos(userId?: string): Promise<SavedPresupuesto[]> {
  const localList: SavedPresupuesto[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localList.push(...parsed);
      }
    }
  } catch (err) {
    console.warn('[PresupuestosStorage] Error leyendo de localStorage:', err);
  }

  // Si hay usuario logueado en Firebase, intentar sincronizar desde Firestore
  const currentUid = userId || auth.currentUser?.uid;
  if (currentUid && db) {
    try {
      const q = query(
        collection(db, 'presupuestos_guardados'),
        where('userId', '==', currentUid)
      );
      const snapshot = await getDocs(q);
      const remoteList: SavedPresupuesto[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        remoteList.push({
          ...(data as any),
          id: docSnap.id
        });
      });

      // Fusionar evitando duplicados por ID
      const map = new Map<string, SavedPresupuesto>();
      localList.forEach(p => map.set(p.id, p));
      remoteList.forEach(p => map.set(p.id, p));
      const merged = Array.from(map.values()).sort((a, b) => b.fechaTimestamp - a.fechaTimestamp);

      // Guardar copia local actualizada
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // ignore
      }
      return merged;
    } catch (firestoreErr) {
      console.warn('[PresupuestosStorage] Firestore offline o sin conexión, usando copia local:', firestoreErr);
    }
  }

  return localList.sort((a, b) => b.fechaTimestamp - a.fechaTimestamp);
}

/**
 * Guardar un nuevo presupuesto tanto en local como en Firestore
 */
export async function savePresupuesto(
  data: Omit<SavedPresupuesto, 'id' | 'fechaTimestamp'>
): Promise<SavedPresupuesto> {
  const now = Date.now();
  const newId = `presup-${now}-${Math.random().toString(36).substring(2, 7)}`;
  const currentUid = data.userId || auth.currentUser?.uid || 'invitado';
  const currentEmail = data.userEmail || auth.currentUser?.email || '';
  const currentName = data.userName || auth.currentUser?.displayName || 'Usuario';

  const newPresupuesto: SavedPresupuesto = {
    ...data,
    id: newId,
    userId: currentUid,
    userEmail: currentEmail,
    userName: currentName,
    fechaTimestamp: now
  };

  // 1. Guardar en localStorage inmediatamente
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list: SavedPresupuesto[] = raw ? JSON.parse(raw) : [];
    list.unshift(newPresupuesto);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[PresupuestosStorage] Error escribiendo en localStorage:', err);
  }

  // 2. Notificar cambio a componentes montados
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('presupuestos_updated', { detail: newPresupuesto }));
  }

  // 3. Si hay Firebase disponible y usuario logueado, sincronizar con Firestore
  if (currentUid !== 'invitado' && db) {
    try {
      await addDoc(collection(db, 'presupuestos_guardados'), {
        ...newPresupuesto,
        createdAt: new Date().toISOString()
      });
    } catch (firestoreErr) {
      console.warn('[PresupuestosStorage] Error sincronizando con Firestore:', firestoreErr);
    }
  }

  return newPresupuesto;
}

/**
 * Eliminar presupuesto del historial
 */
export async function deletePresupuesto(id: string, userId?: string): Promise<void> {
  // 1. Eliminar de localStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const list: SavedPresupuesto[] = JSON.parse(raw);
      const filtered = list.filter(p => p.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (err) {
    console.warn('[PresupuestosStorage] Error eliminando de localStorage:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('presupuestos_updated'));
  }

  // 2. Eliminar de Firestore si aplica
  const currentUid = userId || auth.currentUser?.uid;
  if (currentUid && db) {
    try {
      await deleteDoc(doc(db, 'presupuestos_guardados', id));
    } catch (err) {
      console.warn('[PresupuestosStorage] Error eliminando de Firestore:', err);
    }
  }
}

/**
 * Construir el documento PDF oficial de un presupuesto guardado
 */
export function buildPresupuestoPdf(p: SavedPresupuesto) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor = [15, 36, 92]; // Deep navy #0f245c
  const darkColor = [15, 23, 42]; // Slate 900
  const textMuted = [100, 116, 139];

  // Encabezado Membretado Oficial
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('BAHÍA OFICIOS', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Cómputo y Presupuesto Oficial de Obra • Bahía Blanca', 14, 19);

  doc.setFontSize(8);
  doc.text(`Fecha: ${p.fecha || new Date().toLocaleDateString('es-AR')}`, pageWidth - 14, 13, { align: 'right' });
  doc.text(`ID: ${p.id.slice(0, 15)}`, pageWidth - 14, 19, { align: 'right' });

  let currentY = 36;

  // Título del Presupuesto
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(p.titulo || 'PRESUPUESTO DE MANO DE OBRA Y MATERIALES', 14, currentY);

  currentY += 5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Rubro: ${p.rubro || 'Construcción y Servicios'} • Validez orientativa según costos de plaza en Bahía Blanca`, 14, currentY);

  currentY += 7;

  // Tabla de Partes Intervinientes
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5
    },
    head: [['DATOS DEL PRESTADOR / PROFESIONAL', 'DATOS DEL CLIENTE / LUGAR DE TRABAJO']],
    body: [
      [
        `Profesional: ${p.proNombre || 'A convenir'}\nTeléfono: ${p.proTelefono || 'A completar'}\nRubro: ${p.rubro || 'Oficios'}`,
        `Cliente: ${p.clienteNombre || 'A convenir'}\nTeléfono: ${p.clienteTelefono || 'A convenir'}\nDirección: ${p.clienteDireccion || 'Bahía Blanca'}`
      ]
    ]
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Si tiene ítems detallados de cómputo, incluir la tabla de ítems
  if (p.items && p.items.length > 0) {
    const tableBody = p.items.map(it => [
      it.tarea,
      it.unidad,
      String(it.cantidad),
      it.costoMatUnit > 0 ? `$${it.costoMatUnit.toLocaleString('es-AR')}` : '-',
      it.subtotalMat > 0 ? `$${it.subtotalMat.toLocaleString('es-AR')}` : '-',
      it.costoMoUnit > 0 ? `$${it.costoMoUnit.toLocaleString('es-AR')}` : '-',
      it.subtotalMo > 0 ? `$${it.subtotalMo.toLocaleString('es-AR')}` : '-',
      `$${it.subtotalTotal.toLocaleString('es-AR')}`
    ]);

    autoTable(doc, {
      startY: currentY,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 36, 92],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7.5
      },
      styles: {
        fontSize: 7,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 12, halign: 'center' },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 22, halign: 'right' },
        7: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
      },
      head: [['Tarea / Concepto', 'Unid.', 'Cant.', 'Mat. Unit', 'Mat. Subtot', 'M.O. Unit', 'M.O. Subtot', 'Subtotal']],
      body: tableBody
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Tabla Resumen Económico
  const economicLines: string[] = [
    `• Subtotal Costo de Mano de Obra: $${p.montoManoObra.toLocaleString('es-AR')}`,
    `• Subtotal Costo de Materiales: $${p.montoMateriales.toLocaleString('es-AR')}`,
    `----------------------------------------------------`,
    `TOTAL GENERAL PRESUPUESTADO: $${p.montoTotal.toLocaleString('es-AR')}`,
    `(-) Seña / Anticipo acordado: $${p.montoSena.toLocaleString('es-AR')}`,
    `(=) Saldo contra entrega conforme: $${p.montoSaldo.toLocaleString('es-AR')}`
  ];

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5
    },
    head: [['CONDICIONES DE PAGO Y PLAZOS', 'DISCRIMINACIÓN ECONÓMICA']],
    body: [
      [
        `Forma de Pago: ${p.formaPago || 'Efectivo / Transferencia'}\nPlazo Estimado: ${p.plazoEntrega || 'A convenir'}\nFecha de Inicio: ${p.fechaInicio || 'A coordinar'}\nObservaciones: ${p.observaciones || 'Conforme a inspección previa'}`,
        economicLines.join('\n')
      ]
    ]
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Pie y firmas
  doc.setDrawColor(180, 180, 180);
  doc.line(20, currentY + 12, 80, currentY + 12);
  doc.line(pageWidth - 80, currentY + 12, pageWidth - 20, currentY + 12);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('FIRMA DEL PROFESIONAL', 50, currentY + 16, { align: 'center' });
  doc.text('FIRMA DEL CLIENTE', pageWidth - 50, currentY + 16, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Generado mediante Bahía Oficios (bahiaoficios.com) • Directorio de Profesionales de Bahía Blanca', pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });

  const cleanFileName = `Presupuesto_${(p.titulo || 'Obra').replace(/\s+/g, '_').slice(0, 30)}_BahiaOficios.pdf`;
  return { doc, cleanFileName };
}

/**
 * Descargar PDF en el dispositivo
 */
export function downloadPresupuestoPdf(p: SavedPresupuesto) {
  const { doc, cleanFileName } = buildPresupuestoPdf(p);
  doc.save(cleanFileName);
}

/**
 * Compartir presupuesto por WhatsApp y descargar el PDF
 */
export async function sharePresupuestoWhatsApp(p: SavedPresupuesto) {
  const { doc, cleanFileName } = buildPresupuestoPdf(p);

  try {
    doc.save(cleanFileName);
  } catch (err) {
    console.warn('Error al guardar PDF:', err);
  }

  const text = `*BAHÍA OFICIOS • PRESUPUESTO OFICIAL*
📋 *Trabajo:* ${p.titulo || p.rubro}
👷 *Profesional:* ${p.proNombre || 'A convenir'} (${p.proTelefono || 'Sin tel'})
👤 *Cliente:* ${p.clienteNombre || 'A convenir'}
📍 *Lugar:* ${p.clienteDireccion || 'Bahía Blanca'}

🛠️ *Mano de Obra:* $${p.montoManoObra.toLocaleString('es-AR')}
🧱 *Materiales:* $${p.montoMateriales.toLocaleString('es-AR')}
💰 *TOTAL PRESUPUESTADO:* $${p.montoTotal.toLocaleString('es-AR')}

💵 *Seña:* $${p.montoSena.toLocaleString('es-AR')}
💳 *Saldo:* $${p.montoSaldo.toLocaleString('es-AR')}

📎 *Se adjunta documento PDF descargado: ${cleanFileName}*
📄 *Bahía Oficios (bahiaoficios.com)*`;

  // Intentar Web Share nativo con archivo si está disponible
  try {
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], cleanFileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      await navigator.share({
        files: [pdfFile],
        title: cleanFileName,
        text: text
      });
      return;
    }
  } catch {
    // fallback
  }

  const targetPhone = (p.clienteTelefono || '').replace(/\D/g, '');
  const url = targetPhone
    ? `https://wa.me/549${targetPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  window.open(url, '_blank');
}

export const PRESUPUESTO_DRAFT_KEY = 'bahiaoficios_presupuesto_draft';

export interface PresupuestoDraftItem {
  id: string;
  descripcion: string;
  precio: string | number;
  precioUnitario?: string | number;
  cantidad?: string | number;
}

export interface PresupuestoDraft {
  proNombre?: string;
  proDni?: string;
  proTelefono?: string;
  proRubro?: string;
  proMatricula?: string;
  clienteNombre?: string;
  clienteDni?: string;
  clienteTelefono?: string;
  clienteDireccion?: string;
  tituloTrabajo?: string;
  descripcionTrabajo?: string;
  plazoEntrega?: string;
  fechaInicio?: string;
  montoManoObra?: string;
  montoMateriales?: string;
  montoTotal?: string;
  montoSena?: string;
  formaPago?: string;
  tareasList?: PresupuestoDraftItem[];
  materialesList?: PresupuestoDraftItem[];
  savedAt?: number;
}

export function savePresupuestoDraft(draft: PresupuestoDraft): void {
  try {
    localStorage.setItem(PRESUPUESTO_DRAFT_KEY, JSON.stringify({
      ...draft,
      savedAt: Date.now()
    }));
  } catch (e) {
    console.warn('Error guardando borrador:', e);
  }
}

export function getPresupuestoDraft(): PresupuestoDraft | null {
  try {
    const raw = localStorage.getItem(PRESUPUESTO_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearPresupuestoDraft(): void {
  try {
    localStorage.removeItem(PRESUPUESTO_DRAFT_KEY);
  } catch (e) {
    // ignore
  }
}

