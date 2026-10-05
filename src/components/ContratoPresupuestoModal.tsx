import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Mic, 
  MicOff, 
  Download, 
  X, 
  Sparkles, 
  CheckCircle2, 
  Printer, 
  DollarSign, 
  Calendar, 
  User, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Share2, 
  AlertCircle,
  HelpCircle,
  Plus
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';
import { PROFESSIONS } from '../constants';
import { savePresupuesto } from '../utils/presupuestosStorage';

interface ContratoPresupuestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStandalonePage?: boolean;
  initialJobTitle?: string;
  initialRubro?: string;
  initialClientName?: string;
  initialClientPhone?: string;
  initialClientAddress?: string;
  initialAmount?: number | string;
  initialManoObra?: number | string;
  initialMateriales?: number | string;
}

export const ContratoPresupuestoModal: React.FC<ContratoPresupuestoModalProps> = ({
  isOpen,
  onClose,
  isStandalonePage = false,
  initialJobTitle = '',
  initialRubro = '',
  initialClientName = '',
  initialClientPhone = '',
  initialClientAddress = '',
  initialAmount = '',
  initialManoObra = '',
  initialMateriales = ''
}) => {
  const { currentUser } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Datos del Profesional / Prestador
  const [proNombre, setProNombre] = useState('');
  const [proDni, setProDni] = useState('');
  const [proTelefono, setProTelefono] = useState('');
  const [proRubro, setProRubro] = useState('');
  const [proMatricula, setProMatricula] = useState('');

  // Datos del Cliente
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDni, setClienteDni] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');

  // Detalle del Trabajo
  const [tituloTrabajo, setTituloTrabajo] = useState('');
  const [descripcionTrabajo, setDescripcionTrabajo] = useState('');
  const [plazoEntrega, setPlazoEntrega] = useState('5 días hábiles');
  const [fechaInicio, setFechaInicio] = useState('');

  // Valores Económicos (Separación de Mano de Obra y Materiales)
  const [montoManoObra, setMontoManoObra] = useState<string>('');
  const [montoMateriales, setMontoMateriales] = useState<string>('');
  const [montoTotal, setMontoTotal] = useState<string>('');
  const [montoSena, setMontoSena] = useState<string>('');
  const [formaPago, setFormaPago] = useState('Efectivo / Transferencia');

  const handleManoObraChange = (val: string) => {
    setMontoManoObra(val);
    const mo = parseFloat(val) || 0;
    const mat = parseFloat(montoMateriales) || 0;
    if (val === '' && montoMateriales === '') {
      setMontoTotal('');
    } else {
      setMontoTotal(String(mo + mat));
    }
  };

  const handleMaterialesChange = (val: string) => {
    setMontoMateriales(val);
    const mo = parseFloat(montoManoObra) || 0;
    const mat = parseFloat(val) || 0;
    if (montoManoObra === '' && val === '') {
      setMontoTotal('');
    } else {
      setMontoTotal(String(mo + mat));
    }
  };

  const handleTotalChange = (val: string) => {
    setMontoTotal(val);
  };

  const applyQuickSenaPercent = (pct: number) => {
    const mo = parseFloat(montoManoObra) || 0;
    const mat = parseFloat(montoMateriales) || 0;
    const tot = montoTotal !== '' ? (parseFloat(montoTotal) || 0) : (mo + mat);
    if (tot > 0) {
      setMontoSena(String(Math.round((tot * pct) / 100)));
    }
  };

  // Estado del Micrófono (Dictado por Voz) y Feedback de Compartir
  const [isListening, setIsListening] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Focus trap, Escape key, and scroll lock for accessibility
  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => {
      const focusables = modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables && focusables.length > 0) {
        focusables[0].focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusables = Array.from(modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(el => el.offsetParent !== null);

        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (triggerRef.current && (triggerRef.current as HTMLElement).focus) {
        (triggerRef.current as HTMLElement).focus();
      }
    };
  }, [isOpen, onClose]);

  // Inicializar campos con datos disponibles
  useEffect(() => {
    if (isOpen) {
      if (currentUser?.rol === 'profesional') {
        setProNombre(currentUser.nombre || '');
        setProTelefono(currentUser.profesionalInfo?.telefono || '');
        setProRubro(currentUser.profesionalInfo?.rubro || PROFESSIONS[0]?.name || 'Servicios Generales');
        setProMatricula((currentUser.profesionalInfo as any)?.matricula || (currentUser.profesionalInfo as any)?.cuit || '');
      } else if (currentUser?.rol === 'cliente') {
        setClienteNombre(currentUser.nombre || '');
        setClienteTelefono(currentUser.profesionalInfo?.telefono || '');
      }

      if (initialJobTitle) setTituloTrabajo(initialJobTitle);
      if (initialRubro) setProRubro(initialRubro);
      if (initialClientName) setClienteNombre(initialClientName);
      if (initialClientPhone) setClienteTelefono(initialClientPhone);
      if (initialClientAddress) setClienteDireccion(initialClientAddress);
      
      if (initialManoObra) setMontoManoObra(String(initialManoObra));
      if (initialMateriales) setMontoMateriales(String(initialMateriales));

      if (initialAmount) {
        setMontoTotal(String(initialAmount));
        if (!initialManoObra) setMontoManoObra(String(initialAmount));
      } else if (initialManoObra || initialMateriales) {
        const mo = parseFloat(String(initialManoObra)) || 0;
        const mat = parseFloat(String(initialMateriales)) || 0;
        setMontoTotal(String(mo + mat));
      }

      // Fecha de inicio por defecto: Hoy
      const today = new Date().toISOString().split('T')[0];
      setFechaInicio(today);
    }
  }, [isOpen, currentUser, initialJobTitle, initialRubro, initialClientName, initialClientPhone, initialClientAddress, initialAmount, initialManoObra, initialMateriales]);

  // Manejo de Reconocimiento de Voz (Web Speech API)
  const toggleVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechFeedback('Tu navegador no admite reconocimiento por voz. Te sugerimos Google Chrome.');
      setTimeout(() => setSpeechFeedback(null), 4000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setSpeechFeedback(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-AR';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechFeedback('🎙️ Escuchando... Hablá para dictar las tareas y materiales');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }

        if (transcript.trim()) {
          setDescripcionTrabajo(prev => {
            const separator = prev.trim() ? '\n• ' : '• ';
            return (prev.trim() + separator + transcript.trim()).trim();
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setSpeechFeedback('Dictado pausado. Podés continuar hablando cuando desees.');
        setTimeout(() => setSpeechFeedback(null), 3500);
      };

      recognition.onend = () => {
        setIsListening(false);
        setSpeechFeedback(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
      setSpeechFeedback('No se pudo activar el micrófono.');
    }
  };

  // Cláusulas rápidas prearmadas
  const addQuickClause = (text: string) => {
    setDescripcionTrabajo(prev => {
      const separator = prev.trim() ? '\n• ' : '• ';
      return (prev.trim() + separator + text).trim();
    });
  };

  // Cálculo del saldo y desglose de mano de obra y materiales
  const numManoObra = parseFloat(montoManoObra) || 0;
  const numMateriales = parseFloat(montoMateriales) || 0;
  const numTotal = montoTotal !== ''
    ? (parseFloat(montoTotal) || 0)
    : (numManoObra + numMateriales);
  const numSena = parseFloat(montoSena) || 0;
  const numSaldo = Math.max(0, numTotal - numSena);

  // Construcción del documento PDF oficial con desglose completo
  const buildPdfDoc = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor = [79, 70, 229]; // Indigo #4f46e5
    const darkColor = [15, 23, 42]; // Slate #0f172a
    const textMuted = [100, 116, 139];

    // Encabezado Membretado
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('BAHÍA OFICIOS', 14, 13);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Directorio Oficial de Profesionales y Servicios • Bahía Blanca', 14, 19);

    const docDate = new Date().toLocaleDateString('es-AR');
    doc.setFontSize(8);
    doc.text(`Fecha de Emisión: ${docDate}`, pageWidth - 14, 13, { align: 'right' });
    doc.text('Documento de Acuerdo Privado / Recibo', pageWidth - 14, 19, { align: 'right' });

    let currentY = 36;

    // Título del Documento
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTRATO DE LOCACIÓN DE SERVICIOS Y RECIBO DE SEÑA', 14, currentY);

    currentY += 5;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Celebrado de conformidad con los Arts. 1251 y concordantes del Código Civil y Comercial de la Nación Argentina.', 14, currentY);

    currentY += 8;

    // Tabla 1: Datos de las Partes
    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3
      },
      head: [['DATOS DEL PROFESIONAL / PRESTADOR', 'DATOS DEL CLIENTE / LOCATARIO']],
      body: [
        [
          `Nombre: ${proNombre || 'A completar'}\nDNI/CUIT: ${proDni || 'A completar'}\nTeléfono: ${proTelefono || 'A completar'}\nRubro: ${proRubro || 'Oficio'}${proMatricula ? `\nMatrícula: ${proMatricula}` : ''}`,
          `Nombre: ${clienteNombre || 'A completar'}\nDNI: ${clienteDni || 'A completar'}\nTeléfono: ${clienteTelefono || 'A completar'}\nLugar de Trabajo: ${clienteDireccion || 'Bahía Blanca'}`
        ]
      ]
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;

    // Tabla 2: Objeto y Detalle del Trabajo
    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3.5
      },
      head: [['OBJETO DEL TRABAJO Y TAREAS ACORDADAS']],
      body: [
        [
          `Trabajo a Ejecutar: ${tituloTrabajo || 'Servicio Profesional'}\n\nDetalle de tareas y alcance:\n${descripcionTrabajo.trim() || 'Conforme a lo presupuestado e inspeccionado previamente en el domicilio.'}`
        ]
      ]
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;

    // Tabla 3: Condiciones Económicas con desglose individual de Mano de Obra y Materiales
    const valoresBreakdownLines: string[] = [
      `Costo de Mano de Obra: $${numManoObra.toLocaleString('es-AR')}`,
      `Costo de Materiales: $${numMateriales.toLocaleString('es-AR')}`,
      `----------------------------------------------------`,
      `TOTAL PRESUPUESTADO: $${numTotal.toLocaleString('es-AR')}`,
      `(-) Seña acordada / recibida: $${numSena.toLocaleString('es-AR')}`,
      `(=) Saldo contra entrega conforme: $${numSaldo.toLocaleString('es-AR')}`
    ];

    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3
      },
      head: [['CONDICIONES Y PLAZOS DE ENTREGA', 'DESGLOSE INDIVIDUAL (MANO DE OBRA Y MATERIALES)']],
      body: [
        [
          `Fecha pactada de inicio: ${fechaInicio || 'A convenir'}\nPlazo estimado de entrega: ${plazoEntrega || 'A convenir'}\nForma de pago acordada: ${formaPago}`,
          valoresBreakdownLines.join('\n')
        ]
      ]
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;

    // Cláusula de Conformidad y Garantía
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    const clausulas = [
      '1. El profesional se compromete a realizar las labores encomendadas aplicando reglas del buen arte y materiales aptos.',
      '2. El cliente entregará la seña indicada para congelar precio o acopio de materiales, cancelando el saldo al finalizar los trabajos tras su inspección.',
      '3. En caso de discrepancias sobre vicios ocultos, las partes acuerdan intentar una mediación amistosa a través de la comunidad de Bahía Oficios.'
    ];

    clausulas.forEach(c => {
      doc.text(c, 14, currentY);
      currentY += 4;
    });

    currentY += 16;

    // Espacio de Firmas
    doc.setDrawColor(150, 150, 150);
    doc.line(20, currentY, 80, currentY);
    doc.line(pageWidth - 80, currentY, pageWidth - 20, currentY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('FIRMA DEL PROFESIONAL', 50, currentY + 4, { align: 'center' });
    doc.text('FIRMA DEL CLIENTE / LOCATARIO', pageWidth - 50, currentY + 4, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Aclaración: ${proNombre || '___________________'}`, 50, currentY + 8, { align: 'center' });
    doc.text(`Aclaración: ${clienteNombre || '___________________'}`, pageWidth - 50, currentY + 8, { align: 'center' });

    // Pie de página oficial
    doc.setFontSize(7);
    doc.text('Generado a través de Bahía Oficios (bahiaoficios.com) • Directorio de Profesionales de Bahía Blanca', pageWidth / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });

    const cleanFileName = `Contrato_${(tituloTrabajo || 'Trabajo').replace(/\s+/g, '_')}_BahiaOficios.pdf`;
    return { doc, cleanFileName };
  };

  const persistToHistory = () => {
    savePresupuesto({
      titulo: tituloTrabajo || `${proRubro} - ${clienteNombre || 'Presupuesto de Trabajo'}`,
      rubro: proRubro || 'Construcción y Oficios',
      fecha: new Date().toLocaleDateString('es-AR'),
      items: [],
      montoManoObra: numManoObra,
      montoMateriales: numMateriales,
      montoTotal: numTotal,
      montoSena: numSena,
      montoSaldo: numSaldo,
      formaPago,
      plazoEntrega,
      fechaInicio,
      clienteNombre,
      clienteTelefono,
      clienteDireccion,
      proNombre,
      proTelefono,
      observaciones: descripcionTrabajo
    }).catch(e => console.warn('Error guardando en historial:', e));
  };

  // Generación del documento PDF oficial
  const handleGeneratePdf = () => {
    const { doc, cleanFileName } = buildPdfDoc();
    doc.save(cleanFileName);
    persistToHistory();
    setShareFeedback('✅ PDF descargado exitosamente y guardado en Mis Presupuestos.');
    setTimeout(() => setShareFeedback(null), 4000);
  };

  // Enviar resumen por WhatsApp e integración para compartir el PDF directamente
  const handleShareWhatsApp = async () => {
    const { doc, cleanFileName } = buildPdfDoc();
    persistToHistory();

    // 1. SIEMPRE generar y descargar el archivo PDF en el dispositivo para que el usuario cuente con el archivo
    try {
      doc.save(cleanFileName);
    } catch (saveErr) {
      console.warn('Error al guardar PDF localmente:', saveErr);
    }

    const desgloseManoMat: string[] = [];
    if (numManoObra > 0) desgloseManoMat.push(`  • 🛠️ Costo de Mano de Obra: $${numManoObra.toLocaleString('es-AR')}`);
    if (numMateriales > 0) desgloseManoMat.push(`  • 🧱 Costo de Materiales: $${numMateriales.toLocaleString('es-AR')}`);

    const text = `*BAHÍA OFICIOS • CONTRATO Y PRESUPUESTO OFICIAL*
📋 *Trabajo:* ${tituloTrabajo || proRubro}
👷 *Profesional:* ${proNombre || 'A convenir'} (${proTelefono || 'Sin teléfono'})
👤 *Cliente:* ${clienteNombre || 'A convenir'}
📍 *Lugar:* ${clienteDireccion || 'Bahía Blanca'}
🗓️ *Fecha inicio:* ${fechaInicio || 'A convenir'} | *Plazo:* ${plazoEntrega}

💰 *TOTAL PRESUPUESTADO:* $${numTotal.toLocaleString('es-AR')}
${desgloseManoMat.length > 0 ? desgloseManoMat.join('\n') + '\n' : ''}💵 *Seña acordada:* $${numSena.toLocaleString('es-AR')}
💳 *Saldo contra entrega:* $${numSaldo.toLocaleString('es-AR')}
💳 *Forma de pago:* ${formaPago}

📝 *Detalle acordado:*
${descripcionTrabajo.trim() || 'Mano de obra y materiales acordados'}

📎 *Se generó y descargó el archivo PDF oficial: ${cleanFileName}*
📄 *Bahía Oficios (bahiaoficios.com) • Directorio de Profesionales de Bahía Blanca*`;

    // 2. Intentar compartir el archivo PDF nativamente (Web Share API) si el navegador lo admite
    try {
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], cleanFileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: cleanFileName,
          text: text
        });
        setShareFeedback(`✅ PDF descargado (${cleanFileName}) y compartido por WhatsApp.`);
        setTimeout(() => setShareFeedback(null), 5000);
        return;
      }
    } catch (err) {
      console.log('Web Share API con archivo no completada, utilizando fallback:', err);
    }

    // 3. Fallback estándar: abrir WhatsApp con el mensaje y confirmar descarga del PDF
    setShareFeedback(`✅ PDF generado y descargado (${cleanFileName}). Se abrió WhatsApp para enviar el presupuesto.`);
    setTimeout(() => setShareFeedback(null), 6000);

    const targetPhone = clienteTelefono.replace(/\D/g, '');
    const url = targetPhone
      ? `https://wa.me/549${targetPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  if (!isOpen && !isStandalonePage) return null;

  const cardContent = (
    <div 
      ref={modalRef}
      className={`relative w-full ${isStandalonePage ? 'max-w-4xl mx-auto my-0' : 'max-w-3xl my-8 max-h-[92vh]'} bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col focus:outline-none`}
      role={isStandalonePage ? 'region' : 'dialog'}
      aria-modal={!isStandalonePage}
      aria-labelledby="contrato-modal-title"
      aria-describedby="contrato-modal-desc"
      tabIndex={-1}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Membretado */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-amber-300 flex items-center justify-center shrink-0 shadow-inner" aria-hidden="true">
            <FileText size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Modelo Oficial Descargable
            </span>
            <h3 id="contrato-modal-title" className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
              Contrato y Recibo Rápido de Trabajo
            </h3>
            <p id="contrato-modal-desc" className="text-xs text-indigo-200">
              Dejá asentado el presupuesto, seña y plazos en un PDF listo para imprimir y firmar.
            </p>
          </div>
        </div>

        {!isStandalonePage && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
            aria-label="Cerrar modal de contrato"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Form Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-100">
          {/* SECCIÓN 1: PARTES INTERVINIENTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profesional */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <User size={14} aria-hidden="true" /> Profesional / Prestador
              </h4>
              <div className="space-y-2">
                <div>
                  <label htmlFor="pro-nombre" className="sr-only">Nombre y Apellido del Profesional</label>
                  <input
                    id="pro-nombre"
                    type="text"
                    value={proNombre}
                    onChange={(e) => setProNombre(e.target.value)}
                    placeholder="Nombre y Apellido del Profesional"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="pro-dni" className="sr-only">DNI o CUIT del Profesional</label>
                    <input
                      id="pro-dni"
                      type="text"
                      value={proDni}
                      onChange={(e) => setProDni(e.target.value)}
                      placeholder="DNI o CUIT"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="pro-telefono" className="sr-only">Teléfono del Profesional</label>
                    <input
                      id="pro-telefono"
                      type="text"
                      value={proTelefono}
                      onChange={(e) => setProTelefono(e.target.value)}
                      placeholder="Teléfono / WhatsApp"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="pro-rubro" className="sr-only">Rubro u Oficio</label>
                    <input
                      id="pro-rubro"
                      type="text"
                      value={proRubro}
                      onChange={(e) => setProRubro(e.target.value)}
                      placeholder="Rubro (Plomero, Gasista...)"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="pro-matricula" className="sr-only">Matrícula o Habilitación</label>
                    <input
                      id="pro-matricula"
                      type="text"
                      value={proMatricula}
                      onChange={(e) => setProMatricula(e.target.value)}
                      placeholder="N° Matrícula (opcional)"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cliente */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" /> Cliente / Lugar de Trabajo
              </h4>
              <div className="space-y-2">
                <div>
                  <label htmlFor="cliente-nombre" className="sr-only">Nombre y Apellido del Cliente</label>
                  <input
                    id="cliente-nombre"
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Nombre y Apellido del Cliente"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="cliente-dni" className="sr-only">DNI del Cliente</label>
                    <input
                      id="cliente-dni"
                      type="text"
                      value={clienteDni}
                      onChange={(e) => setClienteDni(e.target.value)}
                      placeholder="DNI del Cliente (opcional)"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="cliente-telefono" className="sr-only">Teléfono del Cliente</label>
                    <input
                      id="cliente-telefono"
                      type="text"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      placeholder="Teléfono del Cliente"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="cliente-direccion" className="sr-only">Dirección del domicilio de obra</label>
                  <input
                    id="cliente-direccion"
                    type="text"
                    value={clienteDireccion}
                    onChange={(e) => setClienteDireccion(e.target.value)}
                    placeholder="Dirección del domicilio / obra en Bahía Blanca"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: DETALLE DEL TRABAJO CON DICTADO POR VOZ */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText size={15} className="text-indigo-600" aria-hidden="true" /> Tareas, Alcance y Materiales Acordados
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Podés escribir las tareas o presionar el botón para dictar directamente con tu voz.
                </p>
              </div>

              {/* Botón de Dictado por Voz */}
              <button
                type="button"
                onClick={toggleVoiceRecording}
                aria-pressed={isListening}
                aria-label={isListening ? "Detener dictado por voz" : "Iniciar dictado de tareas por voz"}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff size={14} aria-hidden="true" />
                    <span>Detener Dictado</span>
                  </>
                ) : (
                  <>
                    <Mic size={14} aria-hidden="true" />
                    <span>Dictar con Voz 🎙️</span>
                  </>
                )}
              </button>
            </div>

            {speechFeedback && (
              <div 
                role="status" 
                aria-live="polite" 
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-600 dark:text-amber-300 text-xs flex items-center gap-2"
              >
                <Sparkles size={14} aria-hidden="true" />
                <span>{speechFeedback}</span>
              </div>
            )}

            <div>
              <label htmlFor="trabajo-titulo" className="sr-only">Título resumen del trabajo</label>
              <input
                id="trabajo-titulo"
                type="text"
                value={tituloTrabajo}
                onChange={(e) => setTituloTrabajo(e.target.value)}
                placeholder="Título resumen del trabajo (Ej: Reparación de cañerías e instalación de bomba presurizadora)"
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="trabajo-descripcion" className="sr-only">Detalle de tareas y condiciones</label>
              <textarea
                id="trabajo-descripcion"
                rows={4}
                value={descripcionTrabajo}
                onChange={(e) => setDescripcionTrabajo(e.target.value)}
                placeholder="Detallá las tareas a realizar, materiales contemplados, partes no incluidas, condiciones de entrega..."
                className="w-full p-3 text-xs leading-relaxed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Cláusulas Rápidas de 1 Clic */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                Agregar cláusula frecuente con 1 clic:
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => addQuickClause('Garantía de mano de obra por 90 días ante fallas de ejecución.')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                >
                  + Garantía 90 días
                </button>
                <button
                  type="button"
                  onClick={() => addQuickClause('Los materiales serán provistos por el cliente en el domicilio de obra.')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                >
                  + Materiales a cargo del cliente
                </button>
                <button
                  type="button"
                  onClick={() => addQuickClause('Incluye limpieza final y retiro de restos de obra.')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                >
                  + Limpieza final incluida
                </button>
                <button
                  type="button"
                  onClick={() => addQuickClause('Presupuesto válido por 15 días corridos a partir de la fecha.')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                >
                  + Validez 15 días
                </button>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: PLAZOS Y CONDICIONES ECONÓMICAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fechas */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Calendar size={14} aria-hidden="true" /> Fechas y Plazos
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="trabajo-fecha-inicio" className="text-[10px] text-slate-500 font-bold block mb-1">
                    Fecha de Inicio:
                  </label>
                  <input
                    id="trabajo-fecha-inicio"
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="trabajo-plazo" className="text-[10px] text-slate-500 font-bold block mb-1">
                    Plazo de Ejecución:
                  </label>
                  <input
                    id="trabajo-plazo"
                    type="text"
                    value={plazoEntrega}
                    onChange={(e) => setPlazoEntrega(e.target.value)}
                    placeholder="Ej: 3 días hábiles"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Montos, Mano de Obra, Materiales y Seña */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <DollarSign size={14} aria-hidden="true" /> Mano de Obra, Materiales y Pagos
                </h4>
                <span className="text-[10px] font-semibold text-slate-400">
                  Valores discriminados
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label htmlFor="monto-mano-obra" className="text-[10px] text-slate-500 font-bold block mb-1">
                    Mano de Obra ($):
                  </label>
                  <input
                    id="monto-mano-obra"
                    type="number"
                    value={montoManoObra}
                    onChange={(e) => handleManoObraChange(e.target.value)}
                    placeholder="Ej: 50000"
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="monto-materiales" className="text-[10px] text-slate-500 font-bold block mb-1">
                    Materiales ($):
                  </label>
                  <input
                    id="monto-materiales"
                    type="number"
                    value={montoMateriales}
                    onChange={(e) => handleMaterialesChange(e.target.value)}
                    placeholder="Ej: 30000"
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="monto-total" className="text-[10px] text-slate-500 font-bold block mb-1">
                    Monto Total ($):
                  </label>
                  <input
                    id="monto-total"
                    type="number"
                    value={montoTotal}
                    onChange={(e) => handleTotalChange(e.target.value)}
                    placeholder="Ej: 80000"
                    className="w-full px-3 py-2 text-xs font-black bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botones de Seña Rápida */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-400 font-medium">Seña rápida:</span>
                <button
                  type="button"
                  onClick={() => applyQuickSenaPercent(30)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 text-[10px] font-bold transition-colors cursor-pointer"
                >
                  30% ($)
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickSenaPercent(50)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 text-[10px] font-bold transition-colors cursor-pointer"
                >
                  50% ($)
                </button>
                <button
                  type="button"
                  onClick={() => setMontoSena('0')}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-medium transition-colors cursor-pointer"
                >
                  Sin seña
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label htmlFor="monto-sena" className="text-[10px] text-slate-500 font-bold block mb-1">
                    Seña / Anticipo ($):
                  </label>
                  <input
                    id="monto-sena"
                    type="number"
                    value={montoSena}
                    onChange={(e) => setMontoSena(e.target.value)}
                    placeholder="Ej: 30000"
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Saldo Calculado */}
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between text-xs self-end h-[38px]">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Saldo contra entrega:</span>
                  <span className="font-black text-indigo-700 dark:text-indigo-300 text-sm">
                    ${numSaldo.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" aria-hidden="true" />
            <span>Validez de contrato privado según Código Civil y Comercial.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              aria-label="Compartir resumen del presupuesto por WhatsApp"
            >
              <Share2 size={15} aria-hidden="true" />
              <span>Enviar por WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleGeneratePdf}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs transition-all shadow-md shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
              aria-label="Descargar contrato y presupuesto oficial en formato PDF"
            >
              <Download size={15} aria-hidden="true" />
              <span>Descargar PDF Oficial</span>
            </button>
          </div>
        </div>
      </div>
  );

  if (isStandalonePage) {
    return cardContent;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {cardContent}
    </div>
  );
};
