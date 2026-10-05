import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  FileText, 
  Mic, 
  MicOff, 
  Download, 
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
  Plus,
  Trash2,
  Lock,
  RotateCcw,
  Wrench,
  ShoppingBag,
  Save,
  ArrowLeft,
  FolderOpen,
  Copy,
  ExternalLink,
  Bot,
  Volume2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';
import { PROFESSIONS } from '../constants';
import { 
  savePresupuesto, 
  savePresupuestoDraft, 
  getPresupuestoDraft, 
  clearPresupuestoDraft, 
  PresupuestoDraftItem 
} from '../utils/presupuestosStorage';
import { parseVoiceToItems } from '../utils/voiceBudgetParser';
import { PresupuestoAuthModal } from './PresupuestoAuthModal';

export const PresupuestarPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();

  // Estados de utilidad
  const [copiedLink, setCopiedLink] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'pdf' | 'whatsapp' | null>(null);

  // Estados para reconocimiento por voz con IA
  const [isListeningTareas, setIsListeningTareas] = useState(false);
  const [isListeningMateriales, setIsListeningMateriales] = useState(false);
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [aiVoiceFeedback, setAiVoiceFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Datos del Profesional / Prestador
  const [proNombre, setProNombre] = useState('');
  const [proDni, setProDni] = useState('');
  const [proTelefono, setProTelefono] = useState('');
  const [proRubro, setProRubro] = useState('');
  const [proMatricula, setProMatricula] = useState('');

  // Datos del Cliente / Locatario
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDni, setClienteDni] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');

  // Detalle del Trabajo
  const [tituloTrabajo, setTituloTrabajo] = useState('');
  const [descripcionTrabajo, setDescripcionTrabajo] = useState('');
  const [plazoEntrega, setPlazoEntrega] = useState('5 días aproximados');
  const [fechaInicio, setFechaInicio] = useState('');

  // 1. TAREAS Y MANO DE OBRA CON CANTIDAD/UNIDAD Y PRECIO INDIVIDUAL
  const [tareasList, setTareasList] = useState<PresupuestoDraftItem[]>([
    { id: 't-1', descripcion: '', cantidad: '1 un', precio: '' }
  ]);

  // 2. MATERIALES E INSUMOS CON CANTIDAD/UNIDAD Y PRECIO INDIVIDUAL
  const [materialesList, setMaterialesList] = useState<PresupuestoDraftItem[]>([
    { id: 'm-1', descripcion: '', cantidad: '1 un', precio: '' }
  ]);

  // Valores Económicos (Totales, Seña y Forma de Pago)
  const [montoManoObra, setMontoManoObra] = useState<string>('');
  const [montoMateriales, setMontoMateriales] = useState<string>('');
  const [montoTotal, setMontoTotal] = useState<string>('');
  const [montoSena, setMontoSena] = useState<string>('');
  const [formaPago, setFormaPago] = useState('Efectivo / Transferencia');

  // Estado del Micrófono General (Observaciones)
  const [isListeningGeneral, setIsListeningGeneral] = useState(false);
  const [speechFeedbackGeneral, setSpeechFeedbackGeneral] = useState<string | null>(null);

  // Título de la pestaña
  useEffect(() => {
    document.title = 'Presupuestar Online • Presupuesto y Cómputo de Obra | Bahía Oficios';
    window.scrollTo(0, 0);
  }, []);

  // Recalcular montos a partir de las listas de tareas y materiales
  const recalculateFromItems = (
    currentTareas: PresupuestoDraftItem[], 
    currentMateriales: PresupuestoDraftItem[],
    overrideMo?: string,
    overrideMat?: string
  ) => {
    const sumTareas = currentTareas.reduce((acc, curr) => {
      if (!curr.precio) return acc;
      const num = typeof curr.precio === 'string'
        ? parseFloat(curr.precio.replace(/\./g, '').replace(',', '.'))
        : Number(curr.precio);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);

    const sumMateriales = currentMateriales.reduce((acc, curr) => {
      if (!curr.precio) return acc;
      const num = typeof curr.precio === 'string'
        ? parseFloat(curr.precio.replace(/\./g, '').replace(',', '.'))
        : Number(curr.precio);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);

    const effectiveMo = (sumTareas > 0) 
      ? sumTareas 
      : (overrideMo !== undefined ? (parseFloat(overrideMo) || 0) : (parseFloat(montoManoObra) || 0));

    const effectiveMat = (sumMateriales > 0)
      ? sumMateriales
      : (overrideMat !== undefined ? (parseFloat(overrideMat) || 0) : (parseFloat(montoMateriales) || 0));

    if (sumTareas > 0) {
      setMontoManoObra(String(sumTareas));
    }
    if (sumMateriales > 0) {
      setMontoMateriales(String(sumMateriales));
    }

    const newTotal = effectiveMo + effectiveMat;
    if (newTotal > 0 || sumTareas > 0 || sumMateriales > 0) {
      setMontoTotal(String(newTotal));
    }
  };

  // Manejo de Tareas con precio y cantidad individual
  const handleAddTarea = () => {
    setTareasList(prev => [
      ...prev,
      { id: `t-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, descripcion: '', cantidad: '1 un', precio: '' }
    ]);
  };

  const handleUpdateTarea = (id: string, field: 'descripcion' | 'cantidad' | 'precio', value: string) => {
    setTareasList(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, [field]: value } : item);
      recalculateFromItems(updated, materialesList);
      return updated;
    });
  };

  const handleRemoveTarea = (id: string) => {
    setTareasList(prev => {
      const updated = prev.filter(item => item.id !== id);
      recalculateFromItems(updated, materialesList);
      return updated;
    });
  };

  // Manejo de Materiales con precio y cantidad individual
  const handleAddMaterial = () => {
    setMaterialesList(prev => [
      ...prev,
      { id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, descripcion: '', cantidad: '1 un', precio: '' }
    ]);
  };

  const handleUpdateMaterial = (id: string, field: 'descripcion' | 'cantidad' | 'precio', value: string) => {
    setMaterialesList(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, [field]: value } : item);
      recalculateFromItems(tareasList, updated);
      return updated;
    });
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterialesList(prev => {
      const updated = prev.filter(item => item.id !== id);
      recalculateFromItems(tareasList, updated);
      return updated;
    });
  };

  // Manejo de cambios manuales en Mano de Obra y Materiales
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

  // Dictado por voz inteligente con IA para Tareas o Materiales
  const handleVoiceRecordingWithAi = (targetSection: 'tarea' | 'material') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setAiVoiceFeedback('Tu navegador no admite reconocimiento por voz. Te sugerimos Google Chrome.');
      setTimeout(() => setAiVoiceFeedback(null), 4000);
      return;
    }

    if (isListeningTareas || isListeningMateriales) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListeningTareas(false);
      setIsListeningMateriales(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-AR';
      recognition.continuous = false;
      recognition.interimResults = false;

      if (targetSection === 'tarea') {
        setIsListeningTareas(true);
        setAiVoiceFeedback('🎙️ Escuchando... Decí por ejemplo: "4 m de revoque a 20.000 pesos"');
      } else {
        setIsListeningMateriales(true);
        setAiVoiceFeedback('🎙️ Escuchando... Decí por ejemplo: "tres codos de termofusión valen cada uno 5.000 pesos"');
      }

      recognition.onresult = async (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }

        const cleanTranscript = transcript.trim();
        if (!cleanTranscript) return;

        setIsListeningTareas(false);
        setIsListeningMateriales(false);
        setIsProcessingAi(true);
        setAiVoiceFeedback(`🤖 IA procesando: "${cleanTranscript}"...`);

        try {
          // Parsear con IA Gemini 3.8 Flash (o fallback heurístico local)
          const parsedItems = await parseVoiceToItems(cleanTranscript, targetSection);

          if (parsedItems.length === 0) {
            setAiVoiceFeedback(`No se detectó precio o ítem. Probá decir: "4 m de revoque a 20.000 pesos"`);
            setTimeout(() => setAiVoiceFeedback(null), 5000);
            return;
          }

          if (targetSection === 'tarea') {
            setTareasList(prev => {
              const isFirstEmpty = prev.length === 1 && !prev[0].descripcion && !prev[0].precio;
              const newItems: PresupuestoDraftItem[] = parsedItems.map(p => ({
                id: `t-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                descripcion: p.descripcion,
                cantidad: p.cantidad || '1 un',
                precio: p.precio,
                precioUnitario: p.precioUnitario
              }));

              const updated = isFirstEmpty ? newItems : [...prev, ...newItems];
              recalculateFromItems(updated, materialesList);
              return updated;
            });

            const summaryFeedback = parsedItems.map(i => {
              const unitPart = i.precioUnitario && i.precioUnitario !== i.precio ? ` (unit: $${Number(i.precioUnitario).toLocaleString('es-AR')})` : '';
              return `${i.cantidad} ${i.descripcion}${unitPart} → $${Number(i.precio || 0).toLocaleString('es-AR')}`;
            }).join(', ');
            setAiVoiceFeedback(`✨ ¡Tarea reconocida con IA! ${summaryFeedback}`);
          } else {
            setMaterialesList(prev => {
              const isFirstEmpty = prev.length === 1 && !prev[0].descripcion && !prev[0].precio;
              const newItems: PresupuestoDraftItem[] = parsedItems.map(p => ({
                id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                descripcion: p.descripcion,
                cantidad: p.cantidad || '1 un',
                precio: p.precio,
                precioUnitario: p.precioUnitario
              }));

              const updated = isFirstEmpty ? newItems : [...prev, ...newItems];
              recalculateFromItems(tareasList, updated);
              return updated;
            });

            const summaryFeedback = parsedItems.map(i => {
              const unitPart = i.precioUnitario && i.precioUnitario !== i.precio ? ` (unit: $${Number(i.precioUnitario).toLocaleString('es-AR')})` : '';
              return `${i.cantidad} ${i.descripcion}${unitPart} → $${Number(i.precio || 0).toLocaleString('es-AR')}`;
            }).join(', ');
            setAiVoiceFeedback(`✨ ¡Material reconocido con IA! ${summaryFeedback}`);
          }

          setTimeout(() => setAiVoiceFeedback(null), 6000);
        } catch (err) {
          console.error('Error parseando con IA:', err);
          setAiVoiceFeedback('Ocurrió un error al procesar el audio con IA.');
          setTimeout(() => setAiVoiceFeedback(null), 4000);
        } finally {
          setIsProcessingAi(false);
        }
      };

      recognition.onerror = () => {
        setIsListeningTareas(false);
        setIsListeningMateriales(false);
        setIsProcessingAi(false);
        setAiVoiceFeedback('Se detuvo la escucha o no se detectó audio.');
        setTimeout(() => setAiVoiceFeedback(null), 3000);
      };

      recognition.onend = () => {
        setIsListeningTareas(false);
        setIsListeningMateriales(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListeningTareas(false);
      setIsListeningMateriales(false);
      setAiVoiceFeedback('No se pudo acceder al micrófono del navegador.');
      setTimeout(() => setAiVoiceFeedback(null), 3000);
    }
  };

  // Carga inicial: Parámetros URL o Restauración de Borrador de localStorage
  useEffect(() => {
    const qTitulo = searchParams.get('titulo') || searchParams.get('jobTitle');
    const qRubro = searchParams.get('rubro');
    const qCliente = searchParams.get('cliente') || searchParams.get('clientName');
    const qMo = searchParams.get('manoObra') || searchParams.get('mo');
    const qMat = searchParams.get('materiales') || searchParams.get('mat');
    const qTotal = searchParams.get('total') || searchParams.get('amount');

    if (qTitulo) setTituloTrabajo(qTitulo);
    if (qRubro) setProRubro(qRubro);
    if (qCliente) setClienteNombre(qCliente);
    if (qMo) setMontoManoObra(qMo);
    if (qMat) setMontoMateriales(qMat);
    if (qTotal) setMontoTotal(qTotal);

    // Si no vinieron parámetros por URL, intentar cargar borrador guardado en localStorage
    if (!qTitulo && !qTotal && !qMo && !qMat) {
      const draft = getPresupuestoDraft();
      if (draft) {
        if (draft.proNombre) setProNombre(draft.proNombre);
        if (draft.proDni) setProDni(draft.proDni);
        if (draft.proTelefono) setProTelefono(draft.proTelefono);
        if (draft.proRubro) setProRubro(draft.proRubro);
        if (draft.proMatricula) setProMatricula(draft.proMatricula);

        if (draft.clienteNombre) setClienteNombre(draft.clienteNombre);
        if (draft.clienteDni) setClienteDni(draft.clienteDni);
        if (draft.clienteTelefono) setClienteTelefono(draft.clienteTelefono);
        if (draft.clienteDireccion) setClienteDireccion(draft.clienteDireccion);

        if (draft.tituloTrabajo) setTituloTrabajo(draft.tituloTrabajo);
        if (draft.descripcionTrabajo) setDescripcionTrabajo(draft.descripcionTrabajo);
        if (draft.plazoEntrega) setPlazoEntrega(draft.plazoEntrega);
        if (draft.fechaInicio) setFechaInicio(draft.fechaInicio);

        if (draft.montoManoObra) setMontoManoObra(draft.montoManoObra);
        if (draft.montoMateriales) setMontoMateriales(draft.montoMateriales);
        if (draft.montoTotal) setMontoTotal(draft.montoTotal);
        if (draft.montoSena) setMontoSena(draft.montoSena);
        if (draft.formaPago) setFormaPago(draft.formaPago);

        if (Array.isArray(draft.tareasList) && draft.tareasList.length > 0) {
          setTareasList(draft.tareasList);
        }
        if (Array.isArray(draft.materialesList) && draft.materialesList.length > 0) {
          setMaterialesList(draft.materialesList);
        }
        setDraftRestored(true);
      }
    }

    // Prellenar datos del usuario autenticado si están vacíos
    if (currentUser) {
      if (!proNombre && currentUser.rol === 'profesional') {
        setProNombre(currentUser.nombre || '');
        setProTelefono(currentUser.profesionalInfo?.telefono || '');
        if (currentUser.profesionalInfo?.rubro) setProRubro(currentUser.profesionalInfo.rubro);
      }
    }

    if (!fechaInicio) {
      setFechaInicio(new Date().toISOString().split('T')[0]);
    }
  }, [searchParams, currentUser]);

  // Guardado persistente automático en localStorage ante cualquier cambio
  useEffect(() => {
    const hasData = Boolean(
      proNombre || clienteNombre || tituloTrabajo || descripcionTrabajo ||
      montoManoObra || montoMateriales || montoTotal ||
      tareasList.some(t => t.descripcion.trim() || t.precio) ||
      materialesList.some(m => m.descripcion.trim() || m.precio)
    );

    if (hasData) {
      savePresupuestoDraft({
        proNombre,
        proDni,
        proTelefono,
        proRubro,
        proMatricula,
        clienteNombre,
        clienteDni,
        clienteTelefono,
        clienteDireccion,
        tituloTrabajo,
        descripcionTrabajo,
        plazoEntrega,
        fechaInicio,
        montoManoObra,
        montoMateriales,
        montoTotal,
        montoSena,
        formaPago,
        tareasList,
        materialesList
      });

      const now = new Date();
      setLastAutoSaveTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [
    proNombre, proDni, proTelefono, proRubro, proMatricula,
    clienteNombre, clienteDni, clienteTelefono, clienteDireccion,
    tituloTrabajo, descripcionTrabajo, plazoEntrega, fechaInicio,
    montoManoObra, montoMateriales, montoTotal, montoSena, formaPago,
    tareasList, materialesList
  ]);

  const handleClearDraft = () => {
    if (window.confirm('¿Querés limpiar todos los campos del presupuesto y empezar uno nuevo desde cero?')) {
      clearPresupuestoDraft();
      setTituloTrabajo('');
      setDescripcionTrabajo('');
      setClienteNombre('');
      setClienteDni('');
      setClienteTelefono('');
      setClienteDireccion('');
      setMontoManoObra('');
      setMontoMateriales('');
      setMontoTotal('');
      setMontoSena('');
      setTareasList([{ id: 't-1', descripcion: '', cantidad: '1 un', precio: '' }]);
      setMaterialesList([{ id: 'm-1', descripcion: '', cantidad: '1 un', precio: '' }]);
      setDraftRestored(false);
      setLastAutoSaveTime(null);
    }
  };

  const handleCopyDirectLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Reconocimiento de Voz General (Observaciones)
  const toggleVoiceRecordingGeneral = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechFeedbackGeneral('Tu navegador no admite reconocimiento por voz.');
      setTimeout(() => setSpeechFeedbackGeneral(null), 3000);
      return;
    }

    if (isListeningGeneral) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListeningGeneral(false);
      setSpeechFeedbackGeneral(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-AR';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListeningGeneral(true);
        setSpeechFeedbackGeneral('🎙️ Escuchando observaciones...');
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

      recognition.onerror = () => {
        setIsListeningGeneral(false);
        setSpeechFeedbackGeneral('No se detectó audio.');
        setTimeout(() => setSpeechFeedbackGeneral(null), 3000);
      };

      recognition.onend = () => {
        setIsListeningGeneral(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListeningGeneral(false);
      setSpeechFeedbackGeneral('Error al iniciar dictado.');
      setTimeout(() => setSpeechFeedbackGeneral(null), 3000);
    }
  };

  const addQuickClause = (clause: string) => {
    setDescripcionTrabajo(prev => {
      const cleanPrev = prev.trim();
      if (!cleanPrev) return clause;
      return `${cleanPrev}\n- ${clause}`;
    });
  };

  // Cálculos de Totales y Subtotales
  const numManoObra = parseFloat(montoManoObra) || 0;
  const numMateriales = parseFloat(montoMateriales) || 0;
  const numTotal = montoTotal !== '' ? (parseFloat(montoTotal) || 0) : (numManoObra + numMateriales);
  const numSena = parseFloat(montoSena) || 0;
  const numSaldo = Math.max(0, numTotal - numSena);

  // Listas de items válidos
  const validTareas = tareasList.filter(t => t.descripcion.trim().length > 0);
  const validMateriales = materialesList.filter(m => m.descripcion.trim().length > 0);

  // Construcción del PDF Oficial
  const buildPdfDoc = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor = [15, 36, 92]; // #0f245c
    const textMuted = [100, 116, 139];
    const darkColor = [30, 41, 59];

    // Encabezado Membretado Oficial
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('BAHÍA OFICIOS', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(219, 234, 254);
    doc.text('Directorio Oficial de Profesionales y Servicios • Bahía Blanca', 14, 18);
    doc.text('bahiaoficios.com', 14, 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('PRESUPUESTO DE TRABAJO', pageWidth - 14, 12, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(254, 243, 199);
    const todayFormatted = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.text(`Fecha de Emisión: ${todayFormatted}`, pageWidth - 14, 18, { align: 'right' });
    doc.text(`Validez: 15 días corridos`, pageWidth - 14, 23, { align: 'right' });

    let currentY = 34;

    // Tabla 1: Partes Intervinientes
    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 36, 92],
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

    currentY = (doc as any).lastAutoTable.finalY + 5;

    // Tabla 2: Objeto General del Trabajo
    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3
      },
      head: [['OBJETO DEL TRABAJO Y ALCANCE GENERAL']],
      body: [
        [
          `Trabajo a Ejecutar: ${tituloTrabajo || 'Servicio Profesional'}\n\nObservaciones / Alcance:\n${descripcionTrabajo.trim() || 'Conforme a lo acordado e inspeccionado previamente en el domicilio de obra.'}`
        ]
      ]
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;

    // Tabla 3: TAREAS Y MANO DE OBRA CON CANTIDAD/UNIDAD Y PRECIO
    if (validTareas.length > 0) {
      const tareasBody = validTareas.map((item, idx) => {
        const itemPrice = typeof item.precio === 'string'
          ? (parseFloat(item.precio.replace(/\./g, '').replace(',', '.')) || 0)
          : Number(item.precio);
        return [
          String(idx + 1),
          item.descripcion,
          item.cantidad || '1 un',
          itemPrice > 0 ? `$${itemPrice.toLocaleString('es-AR')}` : 'A convenir'
        ];
      });

      autoTable(doc, {
        startY: currentY,
        theme: 'grid',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8.5
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
        },
        head: [['#', 'DESGLOSE DE TAREAS Y MANO DE OBRA', 'CANTIDAD / MEDIDA', 'PRECIO']],
        body: [
          ...tareasBody,
          ['', 'SUBTOTAL MANO DE OBRA', '', `$${numManoObra.toLocaleString('es-AR')}`]
        ]
      });

      currentY = (doc as any).lastAutoTable.finalY + 5;
    }

    // Tabla 4: MATERIALES E INSUMOS CON CANTIDAD/UNIDAD Y PRECIO
    if (validMateriales.length > 0) {
      const materialesBody = validMateriales.map((item, idx) => {
        const itemPrice = typeof item.precio === 'string'
          ? (parseFloat(item.precio.replace(/\./g, '').replace(',', '.')) || 0)
          : Number(item.precio);
        return [
          String(idx + 1),
          item.descripcion,
          item.cantidad || '1 un',
          itemPrice > 0 ? `$${itemPrice.toLocaleString('es-AR')}` : 'A convenir'
        ];
      });

      autoTable(doc, {
        startY: currentY,
        theme: 'grid',
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8.5
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
        },
        head: [['#', 'DESGLOSE DE MATERIALES E INSUMOS', 'CANTIDAD', 'PRECIO']],
        body: [
          ...materialesBody,
          ['', 'SUBTOTAL MATERIALES', '', `$${numMateriales.toLocaleString('es-AR')}`]
        ]
      });

      currentY = (doc as any).lastAutoTable.finalY + 5;
    }

    // Tabla 5: Resumen Económico Final y Plazos
    const valoresBreakdownLines: string[] = [
      `Costo Mano de Obra: $${numManoObra.toLocaleString('es-AR')}`,
      `Costo Materiales: $${numMateriales.toLocaleString('es-AR')}`,
      `----------------------------------------------------`,
      `TOTAL PRESUPUESTADO: $${numTotal.toLocaleString('es-AR')}`,
      `(-) Seña acordada: $${numSena.toLocaleString('es-AR')}`,
      `(=) Saldo contra entrega: $${numSaldo.toLocaleString('es-AR')}`
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
      head: [['CONDICIONES Y PLAZOS ESTIMADOS', 'RESUMEN ECONÓMICO FINAL']],
      body: [
        [
          `Fecha pactada de inicio: ${fechaInicio || 'A convenir'}\nPlazo estimado de ejecución: ${plazoEntrega || 'A convenir'}\nForma de pago acordada: ${formaPago}\n\n* Duración del trabajo sujeto a cambios climáticos.`,
          valoresBreakdownLines.join('\n')
        ]
      ]
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;

    // Cláusulas y Condiciones del Presupuesto
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    const clausulas = [
      '1. Validez de la cotización: 15 días corridos a partir de la fecha de emisión del presente presupuesto.',
      '2. Plazos de ejecución: Los días consignados son aproximados. La duración del trabajo está sujeta a cambios climáticos y contingencias de obra.',
      '3. El cliente entregará la seña indicada para congelar precio o acopio de materiales, cancelando el saldo al finalizar los trabajos tras su inspección.',
      '4. En caso de consultas o discrepancias sobre los trabajos, las partes podrán solicitar una mediación amistosa a través de Bahía Oficios.'
    ];

    clausulas.forEach(c => {
      doc.text(c, 14, currentY);
      currentY += 4;
    });

    currentY += 4;

    // Leyenda de cambios climáticos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text('IMPORTANTE: Duración del trabajo sujeto a cambios climáticos.', pageWidth / 2, currentY, { align: 'center' });

    currentY += 10;

    // Espacio de Firmas y Conformidad
    doc.setDrawColor(150, 150, 150);
    doc.line(20, currentY, 80, currentY);
    doc.line(pageWidth - 80, currentY, pageWidth - 20, currentY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('FIRMA DEL PROFESIONAL', 50, currentY + 4, { align: 'center' });
    doc.text('CONFORMIDAD DEL CLIENTE', pageWidth - 50, currentY + 4, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Aclaración: ${proNombre || '___________________'}`, 50, currentY + 8, { align: 'center' });
    doc.text(`Aclaración: ${clienteNombre || '___________________'}`, pageWidth - 50, currentY + 8, { align: 'center' });

    doc.setFontSize(7);
    doc.text('Generado a través de Bahía Oficios (bahiaoficios.com) • Directorio de Profesionales de Bahía Blanca • Duración del trabajo sujeto a cambios climáticos', pageWidth / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });

    const cleanFileName = `Presupuesto_${(tituloTrabajo || 'Trabajo').replace(/\s+/g, '_')}_BahiaOficios.pdf`;
    return { doc, cleanFileName };
  };

  const persistToHistory = () => {
    const itemsFormatted = [
      ...validTareas.map(t => ({
        id: t.id,
        tarea: t.descripcion,
        unidad: String(t.cantidad || 'U'),
        cantidad: 1,
        costoMatUnit: 0,
        costoMoUnit: parseFloat(String(t.precio)) || 0,
        subtotalMat: 0,
        subtotalMo: parseFloat(String(t.precio)) || 0,
        subtotalTotal: parseFloat(String(t.precio)) || 0
      })),
      ...validMateriales.map(m => ({
        id: m.id,
        tarea: m.descripcion,
        unidad: String(m.cantidad || 'U'),
        cantidad: 1,
        costoMatUnit: parseFloat(String(m.precio)) || 0,
        costoMoUnit: 0,
        subtotalMat: parseFloat(String(m.precio)) || 0,
        subtotalMo: 0,
        subtotalTotal: parseFloat(String(m.precio)) || 0
      }))
    ];

    savePresupuesto({
      titulo: tituloTrabajo || `${proRubro} - ${clienteNombre || 'Presupuesto de Trabajo'}`,
      rubro: proRubro || 'Construcción y Oficios',
      fecha: new Date().toLocaleDateString('es-AR'),
      items: itemsFormatted,
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

  // Guardado persistente inmediato del estado del formulario en localStorage
  const saveCurrentDraftSnapshot = () => {
    savePresupuestoDraft({
      proNombre,
      proDni,
      proTelefono,
      proRubro,
      proMatricula,
      clienteNombre,
      clienteDni,
      clienteTelefono,
      clienteDireccion,
      tituloTrabajo,
      descripcionTrabajo,
      plazoEntrega,
      fechaInicio,
      montoManoObra,
      montoMateriales,
      montoTotal,
      montoSena,
      formaPago,
      tareasList,
      materialesList
    });
    const now = new Date();
    setLastAutoSaveTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  // Acción: Generar Presupuesto (PDF Oficial)
  const handleGeneratePdf = () => {
    // 1. Guardar de forma inmediata el estado en localStorage antes de cualquier verificación
    saveCurrentDraftSnapshot();

    // 2. Verificar autenticación: si no está logueado, abrir modal persistente de registro/login
    if (!currentUser) {
      setPendingAction('pdf');
      setShowAuthModal(true);
      return;
    }

    const { doc, cleanFileName } = buildPdfDoc();
    doc.save(cleanFileName);
    persistToHistory();
    setShareFeedback('✅ Presupuesto oficial generado y descargado exitosamente. Guardado en tu cuenta.');
    setTimeout(() => setShareFeedback(null), 4000);
  };

  // Acción: Compartir por WhatsApp
  const handleShareWhatsApp = async () => {
    // 1. Guardar de forma inmediata el estado en localStorage
    saveCurrentDraftSnapshot();

    if (!currentUser) {
      setPendingAction('whatsapp');
      setShowAuthModal(true);
      return;
    }

    executeShareWhatsApp();
  };

  const executeShareWhatsApp = async () => {
    const { doc, cleanFileName } = buildPdfDoc();
    persistToHistory();

    try {
      doc.save(cleanFileName);
    } catch (saveErr) {
      console.warn('Error al guardar PDF localmente:', saveErr);
    }

    const tareasLines: string[] = [];
    if (validTareas.length > 0) {
      tareasLines.push('*🛠️ Desglose de Tareas:*');
      validTareas.forEach(t => {
        const p = parseFloat(String(t.precio)) || 0;
        const cantStr = t.cantidad ? ` (${t.cantidad})` : '';
        tareasLines.push(`  • ${t.descripcion}${cantStr}${p > 0 ? `: $${p.toLocaleString('es-AR')}` : ''}`);
      });
    }

    const materialesLines: string[] = [];
    if (validMateriales.length > 0) {
      materialesLines.push('*🧱 Desglose de Materiales:*');
      validMateriales.forEach(m => {
        const p = parseFloat(String(m.precio)) || 0;
        const cantStr = m.cantidad ? ` (${m.cantidad})` : '';
        materialesLines.push(`  • ${m.descripcion}${cantStr}${p > 0 ? `: $${p.toLocaleString('es-AR')}` : ''}`);
      });
    }

    const desgloseManoMat: string[] = [];
    if (numManoObra > 0) desgloseManoMat.push(`  • 🛠️ Costo Mano de Obra: $${numManoObra.toLocaleString('es-AR')}`);
    if (numMateriales > 0) desgloseManoMat.push(`  • 🧱 Costo Materiales: $${numMateriales.toLocaleString('es-AR')}`);

    const text = `*BAHÍA OFICIOS • PRESUPUESTO OFICIAL*
📋 *Trabajo:* ${tituloTrabajo || proRubro}
👷 *Profesional:* ${proNombre || 'A convenir'} (${proTelefono || 'Sin teléfono'})
👤 *Cliente:* ${clienteNombre || 'A convenir'}
📍 *Lugar:* ${clienteDireccion || 'Bahía Blanca'}
🗓️ *Fecha inicio:* ${fechaInicio || 'A convenir'} | *Plazo estimado:* ${plazoEntrega}

${tareasLines.length > 0 ? tareasLines.join('\n') + '\n\n' : ''}${materialesLines.length > 0 ? materialesLines.join('\n') + '\n\n' : ''}💰 *TOTAL PRESUPUESTADO:* $${numTotal.toLocaleString('es-AR')}
${desgloseManoMat.length > 0 ? desgloseManoMat.join('\n') + '\n' : ''}💵 *Seña acordada:* $${numSena.toLocaleString('es-AR')}
💳 *Saldo contra entrega:* $${numSaldo.toLocaleString('es-AR')}
💳 *Forma de pago:* ${formaPago}

📝 *Condiciones y Observaciones:*
${descripcionTrabajo.trim() || 'Mano de obra y materiales acordados'}

⚠️ *Nota:* Duración del trabajo sujeto a cambios climáticos.

📎 *Se generó el archivo PDF oficial: ${cleanFileName}*
📄 *Bahía Oficios (bahiaoficios.com) • Directorio de Profesionales de Bahía Blanca*`;

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
      console.log('Web Share API fallback:', err);
    }

    setShareFeedback(`✅ PDF generado y descargado (${cleanFileName}). Se abrió WhatsApp para enviar el presupuesto.`);
    setTimeout(() => setShareFeedback(null), 6000);

    const targetPhone = clienteTelefono.replace(/\D/g, '');
    const url = targetPhone
      ? `https://wa.me/549${targetPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  const handleAuthSuccess = (userData: any) => {
    setShowAuthModal(false);

    // Asegurar que todos los campos del presupuesto persistan intactos desde localStorage
    const savedDraft = getPresupuestoDraft();
    if (savedDraft) {
      if (savedDraft.proNombre && !proNombre) setProNombre(savedDraft.proNombre);
      if (savedDraft.clienteNombre && !clienteNombre) setClienteNombre(savedDraft.clienteNombre);
      if (savedDraft.tituloTrabajo && !tituloTrabajo) setTituloTrabajo(savedDraft.tituloTrabajo);
      if (savedDraft.montoTotal && !montoTotal) setMontoTotal(savedDraft.montoTotal);
      if (Array.isArray(savedDraft.tareasList) && savedDraft.tareasList.length > 0 && tareasList.every(t => !t.descripcion && !t.precio)) {
        setTareasList(savedDraft.tareasList);
      }
      if (Array.isArray(savedDraft.materialesList) && savedDraft.materialesList.length > 0 && materialesList.every(m => !m.descripcion && !m.precio)) {
        setMaterialesList(savedDraft.materialesList);
      }
    }

    if (!proNombre && userData?.nombre) {
      setProNombre(userData.nombre);
    }
    if (!proTelefono && userData?.telefono) {
      setProTelefono(userData.telefono);
    }

    setShareFeedback('🎉 ¡Cuenta conectada con éxito! Tus datos se conservaron. Generando presupuesto...');
    setTimeout(() => {
      if (pendingAction === 'pdf') {
        const { doc, cleanFileName } = buildPdfDoc();
        doc.save(cleanFileName);
        persistToHistory();
        setShareFeedback('✅ Presupuesto oficial generado y descargado exitosamente. Guardado en tu cuenta.');
      } else if (pendingAction === 'whatsapp') {
        executeShareWhatsApp();
      }
      setPendingAction(null);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-6 sm:py-10 px-3 sm:px-6">
      
      {/* Barra superior de navegación y utilidades */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Link
            to="/calculadora-costos"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Calculadora de Cómputo</span>
          </Link>

          <Link
            to="/mis-presupuestos"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-[#0f245c] dark:text-blue-300 font-bold transition-colors"
          >
            <FolderOpen size={14} />
            <span>Mis Presupuestos</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyDirectLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-bold transition-all shadow-xs cursor-pointer"
            title="Copiar enlace directo a esta página"
          >
            {copiedLink ? (
              <>
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">¡Enlace Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copiar Enlace (/presupuestar)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hero informativo */}
      <div className="max-w-4xl mx-auto mb-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0f245c] to-blue-700 text-white flex items-center justify-center shrink-0 shadow-md">
              <FileText size={24} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                  Acceso Directo
                </span>
                <span className="text-xs text-slate-400 font-mono">bahiaoficios.com/presupuestar</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                Presupuestador Online
              </h1>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-right">
            <span>Precios y medidas individuales por tarea y material</span>
            <span className="block font-bold text-slate-700 dark:text-slate-300 mt-0.5">
              Dictado por voz inteligente con IA para rellenado automático
            </span>
          </div>
        </div>
      </div>

      {/* FORMULARIO PRINCIPAL DE PRESUPUESTO */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Barra de Notificación de Borrador Auto-Guardado */}
        <div className="bg-slate-100 dark:bg-slate-850 px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Save size={14} className="text-emerald-500 shrink-0" />
            <span>
              {draftRestored 
                ? 'Borrador recuperado automáticamente de tu última sesión.' 
                : lastAutoSaveTime 
                  ? `Guardado automático activo (${lastAutoSaveTime}). No vas a perder datos al registrarte.`
                  : 'Borrador activo: se guarda en tu dispositivo a medida que escribís.'}
            </span>
          </div>

          {(draftRestored || lastAutoSaveTime) && (
            <button
              type="button"
              onClick={handleClearDraft}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
              title="Borrar borrador guardado y empezar en blanco"
            >
              <RotateCcw size={11} />
              <span>Limpiar / Empezar Nuevo</span>
            </button>
          )}
        </div>

        {/* Feedback de Dictado por Voz con IA */}
        {aiVoiceFeedback && (
          <div className="px-5 py-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-amber-500/10 border-b border-indigo-200/50 dark:border-indigo-900/50 flex items-center justify-between gap-3 text-xs text-indigo-950 dark:text-indigo-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              {isProcessingAi ? (
                <Sparkles size={16} className="text-purple-600 animate-spin shrink-0" />
              ) : isListeningTareas || isListeningMateriales ? (
                <Mic size={16} className="text-rose-600 animate-pulse shrink-0" />
              ) : (
                <Bot size={16} className="text-indigo-600 shrink-0" />
              )}
              <span className="font-semibold">{aiVoiceFeedback}</span>
            </div>
            {(isListeningTareas || isListeningMateriales) && (
              <button
                type="button"
                onClick={() => {
                  if (recognitionRef.current) {
                    try { recognitionRef.current.stop(); } catch {}
                  }
                  setIsListeningTareas(false);
                  setIsListeningMateriales(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer"
              >
                Listo / Detener
              </button>
            )}
          </div>
        )}

        <div className="p-5 sm:p-7 space-y-6">

          {/* PASO 1: PARTES INTERVINIENTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profesional */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <User size={14} aria-hidden="true" /> Profesional / Prestador
              </h3>
              <div className="space-y-2">
                <div>
                  <label htmlFor="p-nombre" className="sr-only">Nombre del Profesional</label>
                  <input
                    id="p-nombre"
                    type="text"
                    value={proNombre}
                    onChange={(e) => setProNombre(e.target.value)}
                    placeholder="Tu Nombre y Apellido (o Empresa)"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      value={proDni}
                      onChange={(e) => setProDni(e.target.value)}
                      placeholder="DNI / CUIT (opcional)"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
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
                    <input
                      type="text"
                      value={proRubro}
                      onChange={(e) => setProRubro(e.target.value)}
                      placeholder="Rubro (Ej: Plomero, Albañil)"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={proMatricula}
                      onChange={(e) => setProMatricula(e.target.value)}
                      placeholder="Matrícula / Reg. (opcional)"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cliente */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <User size={14} aria-hidden="true" /> Cliente / Locatario
              </h3>
              <div className="space-y-2">
                <div>
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Nombre y Apellido del Cliente"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      value={clienteDni}
                      onChange={(e) => setClienteDni(e.target.value)}
                      placeholder="DNI del Cliente (opcional)"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      placeholder="Teléfono del Cliente"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <input
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

          {/* TÍTULO PRINCIPAL DEL TRABAJO */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText size={15} className="text-indigo-600" aria-hidden="true" />
              Título Resumen de la Obra o Trabajo
            </h3>
            <input
              type="text"
              value={tituloTrabajo}
              onChange={(e) => setTituloTrabajo(e.target.value)}
              placeholder="Ej: Instalación completa de cañerías en baño y colocación de sanitarios"
              className="w-full px-3.5 py-2.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* PASO 2: TAREAS Y MANO DE OBRA CON CANTIDAD/UNIDAD Y PRECIO INDIVIDUAL + DICTADO IA */}
          <div className="p-4 sm:p-6 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-tight text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Wrench size={16} className="text-indigo-600" aria-hidden="true" />
                    Tareas y Mano de Obra (Cantidad, Medida y Precio)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-8">
                  Ingresá labor, cantidad/unidad (ej: <em>4 m</em>, <em>15 m²</em>, <em>1 global</em>) y precio. O <strong>dictalo por voz con IA</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Botón de Dictado con IA para Tareas */}
                <button
                  type="button"
                  onClick={() => handleVoiceRecordingWithAi('tarea')}
                  disabled={isProcessingAi}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer ${
                    isListeningTareas
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800'
                  }`}
                  title="Dictar tarea por voz (Ej: '4 m de revoque a 20.000 pesos')"
                >
                  <Mic size={14} className={isListeningTareas ? "animate-bounce" : "text-indigo-600 dark:text-indigo-400"} />
                  <span>{isListeningTareas ? 'Escuchando...' : 'Dictar con IA 🎙️'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddTarea}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus size={14} />
                  <span>+ Agregar Tarea</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {tareasList.map((tarea, idx) => (
                <div 
                  key={tarea.id} 
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 shadow-xs"
                >
                  <span className="w-5 text-center text-xs font-black text-indigo-500 dark:text-indigo-400 shrink-0">
                    {idx + 1}
                  </span>

                  <input
                    type="text"
                    value={tarea.descripcion}
                    onChange={(e) => handleUpdateTarea(tarea.id, 'descripcion', e.target.value)}
                    placeholder="Descripción de la tarea (Ej: Revoque grueso a la cal)"
                    className="flex-1 min-w-[160px] px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                  />

                  {/* Campo de Cantidad / Unidad en Tareas */}
                  <input
                    type="text"
                    value={tarea.cantidad || ''}
                    onChange={(e) => handleUpdateTarea(tarea.id, 'cantidad', e.target.value)}
                    placeholder="Cant. (4 m, 15 m²)"
                    className="w-28 sm:w-32 px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none font-medium text-center"
                    title="Cantidad o medida (ej: 4 m, 12 m², 1 global, 10 ml)"
                  />

                  <div className="flex items-center gap-1.5 w-32 sm:w-36 shrink-0 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-500">$</span>
                    <input
                      type="number"
                      value={tarea.precio}
                      onChange={(e) => handleUpdateTarea(tarea.id, 'precio', e.target.value)}
                      placeholder="Precio"
                      className="w-full text-xs font-black text-[#0f245c] dark:text-white bg-transparent border-0 focus:ring-0 focus:outline-none text-right"
                    />
                  </div>

                  {tareasList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTarea(tarea.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Eliminar tarea"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Indicador Reactivo de Subtotal de Mano de Obra */}
            <div className="flex flex-wrap items-center justify-between pt-2 px-2 bg-indigo-100/50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40 text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {validTareas.length} tarea{validTareas.length !== 1 ? 's' : ''} cargada{validTareas.length !== 1 ? 's' : ''} con costo
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-900 dark:text-indigo-200">
                  Subtotal Mano de Obra:
                </span>
                <span className="font-black text-base text-indigo-700 dark:text-indigo-300">
                  ${numManoObra.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>

          {/* PASO 3: MATERIALES E INSUMOS CON CANTIDAD/UNIDAD Y PRECIO INDIVIDUAL + DICTADO IA */}
          <div className="p-4 sm:p-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-900/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-tight text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <ShoppingBag size={16} className="text-emerald-600" aria-hidden="true" />
                    Materiales e Insumos (Precio Individual por Material)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-8">
                  Ingresá materiales con cantidad y precio. O <strong>dictalo por voz con IA</strong> (ej: <em>"tres codos de termofusión valen cada uno 5.000 pesos"</em>).
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Botón de Dictado con IA para Materiales */}
                <button
                  type="button"
                  onClick={() => handleVoiceRecordingWithAi('material')}
                  disabled={isProcessingAi}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer ${
                    isListeningMateriales
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                  }`}
                  title="Dictar material por voz (Ej: 'tres codos de termofusión valen cada uno 5.000 pesos')"
                >
                  <Mic size={14} className={isListeningMateriales ? "animate-bounce" : "text-emerald-600 dark:text-emerald-400"} />
                  <span>{isListeningMateriales ? 'Escuchando...' : 'Dictar con IA 🎙️'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus size={14} />
                  <span>+ Agregar Material</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {materialesList.map((material, idx) => (
                <div 
                  key={material.id} 
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 shadow-xs"
                >
                  <span className="w-5 text-center text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                    {idx + 1}
                  </span>

                  <input
                    type="text"
                    value={material.descripcion}
                    onChange={(e) => handleUpdateMaterial(material.id, 'descripcion', e.target.value)}
                    placeholder="Descripción del material (Ej: Codos de termofusión 20mm)"
                    className="flex-1 min-w-[160px] px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  />

                  <input
                    type="text"
                    value={material.cantidad || ''}
                    onChange={(e) => handleUpdateMaterial(material.id, 'cantidad', e.target.value)}
                    placeholder="Cant. (3 un)"
                    className="w-28 sm:w-32 px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none font-medium text-center"
                  />

                  <div className="flex items-center gap-1.5 w-32 sm:w-36 shrink-0 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-500">$</span>
                    <input
                      type="number"
                      value={material.precio}
                      onChange={(e) => handleUpdateMaterial(material.id, 'precio', e.target.value)}
                      placeholder="Precio"
                      className="w-full text-xs font-black text-[#0f245c] dark:text-white bg-transparent border-0 focus:ring-0 focus:outline-none text-right"
                    />
                  </div>

                  {materialesList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(material.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Eliminar material"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Indicador Reactivo de Subtotal de Materiales */}
            <div className="flex flex-wrap items-center justify-between pt-2 px-2 bg-emerald-100/50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {validMateriales.length} material{validMateriales.length !== 1 ? 'es' : ''} cargado{validMateriales.length !== 1 ? 's' : ''} con costo
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950 dark:text-emerald-200">
                  Subtotal Materiales:
                </span>
                <span className="font-black text-base text-emerald-700 dark:text-emerald-300">
                  ${numMateriales.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>

          {/* PASO 4: OBSERVACIONES Y DICTADO POR VOZ */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText size={15} className="text-indigo-600" aria-hidden="true" />
                  Observaciones, Cláusulas y Dictado por Voz
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Condiciones de garantía, aclaraciones sobre provisión de materiales o retiro de escombros.
                </p>
              </div>

              {/* Botón de Dictado */}
              <button
                type="button"
                onClick={toggleVoiceRecordingGeneral}
                aria-pressed={isListeningGeneral}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto ${
                  isListeningGeneral
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isListeningGeneral ? (
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

            {speechFeedbackGeneral && (
              <div role="status" className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-600 dark:text-amber-300 text-xs flex items-center gap-2">
                <Sparkles size={14} aria-hidden="true" />
                <span>{speechFeedbackGeneral}</span>
              </div>
            )}

            <textarea
              rows={3}
              value={descripcionTrabajo}
              onChange={(e) => setDescripcionTrabajo(e.target.value)}
              placeholder="Detallá cualquier condición especial del trabajo..."
              className="w-full p-3 text-xs leading-relaxed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            {/* Cláusulas Rápidas */}
            <div className="flex flex-wrap gap-1.5 text-xs pt-1">
              <button
                type="button"
                onClick={() => addQuickClause('Garantía de mano de obra por 90 días ante fallas de ejecución.')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
              >
                + Garantía 90 días
              </button>
              <button
                type="button"
                onClick={() => addQuickClause('Los materiales serán provistos por el cliente en el domicilio de obra.')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
              >
                + Materiales a cargo del cliente
              </button>
              <button
                type="button"
                onClick={() => addQuickClause('Incluye limpieza final y retiro de restos de obra.')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
              >
                + Limpieza final incluida
              </button>
              <button
                type="button"
                onClick={() => addQuickClause('Presupuesto válido por 15 días corridos a partir de la fecha.')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
              >
                + Validez 15 días
              </button>
            </div>
          </div>

          {/* PASO 5: CONDICIONES ECONÓMICAS Y TOTALES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fechas y Forma de Pago */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Calendar size={14} aria-hidden="true" /> Fechas y Plazos
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="fecha-inicio-input" className="text-[10px] text-slate-500 font-bold block mb-1">
                    Fecha de Inicio:
                  </label>
                  <input
                    id="fecha-inicio-input"
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="plazo-entrega-input" className="text-[10px] text-slate-500 font-bold block mb-1">
                    Plazo de Ejecución (Días aproximados):
                  </label>
                  <input
                    id="plazo-entrega-input"
                    type="text"
                    value={plazoEntrega}
                    onChange={(e) => setPlazoEntrega(e.target.value)}
                    placeholder="Ej: 5 días aproximados"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1 mt-1">
                    <span aria-hidden="true">⚠️</span> Duración del trabajo sujeto a cambios climáticos
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="forma-pago-select" className="text-[10px] text-slate-500 font-bold block mb-1">
                  Forma de Pago Acordada:
                </label>
                <select
                  id="forma-pago-select"
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                >
                  <option value="Efectivo / Transferencia">Efectivo / Transferencia</option>
                  <option value="Efectivo al finalizar">Efectivo contra entrega</option>
                  <option value="Transferencia bancaria">Transferencia bancaria</option>
                  <option value="Seña 50% y saldo contra entrega">Seña 50% y saldo contra entrega</option>
                  <option value="A convenir según avance">A convenir según avance</option>
                </select>
              </div>
            </div>

            {/* Montos y Totales con Auto-Suma */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <DollarSign size={14} aria-hidden="true" />
                  Mano de Obra, Materiales y Total
                </h3>
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  Suma Automática
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label htmlFor="p-mo" className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block mb-1">
                    Mano de Obra ($):
                  </label>
                  <input
                    id="p-mo"
                    type="number"
                    value={montoManoObra}
                    onChange={(e) => handleManoObraChange(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="p-mat" className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block mb-1">
                    Materiales ($):
                  </label>
                  <input
                    id="p-mat"
                    type="number"
                    value={montoMateriales}
                    onChange={(e) => handleMaterialesChange(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="p-tot" className="text-[10px] text-indigo-900 dark:text-indigo-200 font-black block mb-1">
                    TOTAL GENERAL ($):
                  </label>
                  <input
                    id="p-tot"
                    type="number"
                    value={montoTotal}
                    onChange={(e) => handleTotalChange(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs font-black bg-indigo-100/70 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botones de Seña Rápida */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-500 font-bold">Calcular Seña:</span>
                <button
                  type="button"
                  onClick={() => applyQuickSenaPercent(30)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  30%
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickSenaPercent(50)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  50%
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="p-sena" className="text-[10px] text-slate-500 font-bold block mb-1">
                    Seña Acordada ($):
                  </label>
                  <input
                    id="p-sena"
                    type="number"
                    value={montoSena}
                    onChange={(e) => setMontoSena(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">
                    Saldo Restante a Cobrar:
                  </label>
                  <div className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700">
                    ${numSaldo.toLocaleString('es-AR')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Toast */}
          {shareFeedback && (
            <div 
              role="status" 
              className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              <span className="font-semibold">{shareFeedback}</span>
            </div>
          )}

          {/* Banner explicativo de autenticación protegida */}
          {!currentUser && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
              <Lock size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-xs block">Generación protegida sin pérdida de datos</span>
                <span className="leading-relaxed">
                  Al presionar <strong>"Generar Presupuesto"</strong> o <strong>"Enviar por WhatsApp"</strong> se te pedirá ingresar o registrarte gratis para asociar el comprobante a tu cuenta. <strong>Todo lo que escribiste (tareas, materiales, precios y datos) queda 100% preservado en tu navegador y se restaura al instante.</strong>
                </span>
              </div>
            </div>
          )}

        </div>

        {/* BARRA INFERIOR DE ACCIONES */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-auto text-center sm:text-left flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Total del Presupuesto:
            </span>
            <div className="inline-flex items-center justify-center sm:justify-start gap-2">
              <span className="px-3.5 py-1.5 rounded-xl bg-[#0f245c] text-white dark:bg-blue-600 dark:text-white font-black text-lg sm:text-xl shadow-xs tracking-tight">
                ${numTotal.toLocaleString('es-AR')}
              </span>
              {numSena > 0 && (
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                  Seña: ${numSena.toLocaleString('es-AR')}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Share2 size={15} aria-hidden="true" />
              <span>Enviar por WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleGeneratePdf}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Download size={16} aria-hidden="true" />
              <span>Generar Presupuesto (PDF Oficial)</span>
            </button>
          </div>
        </div>

      </div>

      {/* Modal de Registro / Login en caso de no estar autenticado */}
      <PresupuestoAuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingAction(null);
        }}
        onSuccess={handleAuthSuccess}
        pendingBudgetSummary={{
          titulo: tituloTrabajo || `${proRubro} - ${clienteNombre || 'Presupuesto'}`,
          cliente: clienteNombre,
          total: numTotal,
          tareasCount: validTareas.length,
          materialesCount: validMateriales.length
        }}
      />
    </div>
  );
};
