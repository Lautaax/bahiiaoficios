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
  Plus,
  Trash2,
  Lock,
  RotateCcw,
  Layers,
  ShoppingBag,
  Wrench,
  Save,
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

  // TAREAS / MANO DE OBRA DESGLOSADA CON PRECIO INDIVIDUAL Y MEDIDA/CANTIDAD
  const [tareasList, setTareasList] = useState<PresupuestoDraftItem[]>([
    { id: 't-1', descripcion: '', cantidad: '1 un', precio: '' }
  ]);

  // MATERIALES E INSUMOS DESGLOSADOS CON PRECIO INDIVIDUAL
  const [materialesList, setMaterialesList] = useState<PresupuestoDraftItem[]>([
    { id: 'm-1', descripcion: '', cantidad: '1 un', precio: '' }
  ]);

  // Estados de Dictado por Voz con IA para Tareas y Materiales
  const [isListeningTareas, setIsListeningTareas] = useState(false);
  const [isListeningMateriales, setIsListeningMateriales] = useState(false);
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [aiVoiceFeedback, setAiVoiceFeedback] = useState<string | null>(null);
  const voiceRecognitionRef = useRef<any>(null);

  // Valores Económicos (Separación de Mano de Obra y Materiales)
  const [montoManoObra, setMontoManoObra] = useState<string>('');
  const [montoMateriales, setMontoMateriales] = useState<string>('');
  const [montoTotal, setMontoTotal] = useState<string>('');
  const [montoSena, setMontoSena] = useState<string>('');
  const [formaPago, setFormaPago] = useState('Efectivo / Transferencia');

  // Estado del Micrófono (Dictado por Voz) y Feedback de Compartir
  const [isListening, setIsListening] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Modal de Autenticación para Finalizar Presupuesto
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'pdf' | 'whatsapp' | null>(null);

  // Helper para recalcular totales a partir de listas de items
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

  // Manejo de Tareas Individuales
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

  // Manejo de Materiales Individuales
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

  // Dictado por voz inteligente con IA para Tareas o Materiales
  const handleVoiceRecordingWithAi = (targetSection: 'tarea' | 'material') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setAiVoiceFeedback('Tu navegador no admite reconocimiento por voz. Te sugerimos Google Chrome.');
      setTimeout(() => setAiVoiceFeedback(null), 4000);
      return;
    }

    if (isListeningTareas || isListeningMateriales) {
      if (voiceRecognitionRef.current) {
        try { voiceRecognitionRef.current.stop(); } catch {}
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
        setAiVoiceFeedback(`🤖 IA reconociendo: "${cleanTranscript}"...`);

        try {
          // Parsear con IA Gemini 3.8 Flash (o fallback heurístico local)
          const parsedItems = await parseVoiceToItems(cleanTranscript, targetSection);

          if (parsedItems.length === 0) {
            setAiVoiceFeedback('No se detectó el ítem. Probá decir: "4 m de revoque a 20.000 pesos"');
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
                precio: p.precio
              }));

              const updated = isFirstEmpty ? newItems : [...prev, ...newItems];
              recalculateFromItems(updated, materialesList);
              return updated;
            });

            setAiVoiceFeedback(`✨ ¡Tarea agregada con IA! ${parsedItems.map(i => `${i.cantidad} ${i.descripcion} ($${Number(i.precio || 0).toLocaleString('es-AR')})`).join(', ')}`);
          } else {
            setMaterialesList(prev => {
              const isFirstEmpty = prev.length === 1 && !prev[0].descripcion && !prev[0].precio;
              const newItems: PresupuestoDraftItem[] = parsedItems.map(p => ({
                id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                descripcion: p.descripcion,
                cantidad: p.cantidad || '1 un',
                precio: p.precio
              }));

              const updated = isFirstEmpty ? newItems : [...prev, ...newItems];
              recalculateFromItems(tareasList, updated);
              return updated;
            });

            setAiVoiceFeedback(`✨ ¡Material agregado con IA! ${parsedItems.map(i => `${i.cantidad} ${i.descripcion} ($${Number(i.precio || 0).toLocaleString('es-AR')})`).join(', ')}`);
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

      voiceRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListeningTareas(false);
      setIsListeningMateriales(false);
      setAiVoiceFeedback('No se pudo acceder al micrófono en este dispositivo.');
      setTimeout(() => setAiVoiceFeedback(null), 4000);
    }
  };

  // Manejadores manuales de montos
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

  // Recuperar borrador de localStorage si existe
  useEffect(() => {
    if (!isOpen && !isStandalonePage) return;

    // Solo recuperar de draft si no se proporcionaron props iniciales desde la calculadora
    const hasInitialProps = Boolean(initialAmount || initialJobTitle || initialManoObra || initialMateriales);
    
    if (!hasInitialProps) {
      const draft = getPresupuestoDraft();
      if (draft) {
        if (draft.proNombre && !proNombre) setProNombre(draft.proNombre);
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
  }, [isOpen, isStandalonePage]);

  // Guardado persistente automático en localStorage con cada cambio
  useEffect(() => {
    if (!isOpen && !isStandalonePage) return;

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
    isOpen, isStandalonePage, proNombre, proDni, proTelefono, proRubro, proMatricula,
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
      setTareasList([{ id: 't-1', descripcion: '', precio: '' }]);
      setMaterialesList([{ id: 'm-1', descripcion: '', cantidad: '', precio: '' }]);
      setDraftRestored(false);
      setLastAutoSaveTime(null);
    }
  };

  // Inicializar campos con datos de sesión o props
  useEffect(() => {
    if (isOpen || isStandalonePage) {
      if (currentUser?.rol === 'profesional') {
        if (!proNombre) setProNombre(currentUser.nombre || '');
        if (!proTelefono) setProTelefono(currentUser.profesionalInfo?.telefono || '');
        if (!proRubro) setProRubro(currentUser.profesionalInfo?.rubro || PROFESSIONS[0]?.name || 'Servicios Generales');
        if (!proMatricula) setProMatricula((currentUser.profesionalInfo as any)?.matricula || (currentUser.profesionalInfo as any)?.cuit || '');
      } else if (currentUser?.rol === 'cliente') {
        if (!clienteNombre) setClienteNombre(currentUser.nombre || '');
        if (!clienteTelefono) setClienteTelefono(currentUser.profesionalInfo?.telefono || '');
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

      // Fecha de inicio por defecto: Hoy si está vacía
      if (!fechaInicio) {
        const today = new Date().toISOString().split('T')[0];
        setFechaInicio(today);
      }
    }
  }, [isOpen, isStandalonePage, currentUser, initialJobTitle, initialRubro, initialClientName, initialClientPhone, initialClientAddress, initialAmount, initialManoObra, initialMateriales]);

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

      recognition.onerror = () => {
        setIsListening(false);
        setSpeechFeedback('No se pudo captar el audio o se canceló el permiso.');
        setTimeout(() => setSpeechFeedback(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechFeedback('No se pudo iniciar el dictado por voz.');
      setTimeout(() => setSpeechFeedback(null), 3000);
    }
  };

  const addQuickClause = (clause: string) => {
    setDescripcionTrabajo(prev => {
      const cleanPrev = prev.trim();
      if (!cleanPrev) return clause;
      return `${cleanPrev}\n- ${clause}`;
    });
  };

  // Cálculos numéricos seguros
  const numManoObra = parseFloat(montoManoObra) || 0;
  const numMateriales = parseFloat(montoMateriales) || 0;
  const numTotal = montoTotal !== '' ? (parseFloat(montoTotal) || 0) : (numManoObra + numMateriales);
  const numSena = parseFloat(montoSena) || 0;
  const numSaldo = Math.max(0, numTotal - numSena);

  // Lista de items válidos para incluir en el PDF y el historial
  const validTareas = tareasList.filter(t => t.descripcion.trim().length > 0);
  const validMateriales = materialesList.filter(m => m.descripcion.trim().length > 0);

  // Función constructora del PDF
  const buildPdfDoc = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor = [15, 36, 92]; // #0f245c
    const secondaryColor = [37, 99, 235]; // #2563eb
    const darkColor = [30, 41, 59];
    const textMuted = [100, 116, 139];

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

    // Titulo Documento y Número / Fecha a la derecha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('PRESUPUESTO Y CONTRATO DE TRABAJO', pageWidth - 14, 12, { align: 'right' });

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
          `Trabajo a Ejecutar: ${tituloTrabajo || 'Servicio Profesional'}\n\nDetalle / Observaciones:\n${descripcionTrabajo.trim() || 'Conforme a lo acordado e inspeccionado previamente en el domicilio de obra.'}`
        ]
      ]
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;

    // Tabla 3: TAREAS Y MANO DE OBRA DESGLOSADA (si existen)
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

    // Tabla 4: MATERIALES E INSUMOS DESGLOSADOS (si existen)
    if (validMateriales.length > 0) {
      const materialesBody = validMateriales.map((item, idx) => {
        const itemPrice = typeof item.precio === 'string'
          ? (parseFloat(item.precio.replace(/\./g, '').replace(',', '.')) || 0)
          : Number(item.precio);
        return [
          String(idx + 1),
          item.descripcion,
          item.cantidad || '-',
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

    // Tabla 5: Condiciones Económicas Finales y Plazos
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
      head: [['CONDICIONES Y PLAZOS DE ENTREGA', 'RESUMEN ECONÓMICO FINAL']],
      body: [
        [
          `Fecha pactada de inicio: ${fechaInicio || 'A convenir'}\nPlazo estimado de entrega: ${plazoEntrega || 'A convenir'}\nForma de pago acordada: ${formaPago}`,
          valoresBreakdownLines.join('\n')
        ]
      ]
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Cláusulas de Conformidad y Garantía
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

    currentY += 12;

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
    // Mapear items al formato estándar de persistencia
    const itemsFormatted = [
      ...validTareas.map(t => ({
        id: t.id,
        tarea: t.descripcion,
        unidad: 'U',
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

  // Generación del documento PDF oficial (con verificación de usuario autenticado)
  const handleGeneratePdf = () => {
    if (!currentUser) {
      // Guardar borrador explícitamente y abrir modal de registro sin perder datos
      setPendingAction('pdf');
      setShowAuthModal(true);
      return;
    }

    const { doc, cleanFileName } = buildPdfDoc();
    doc.save(cleanFileName);
    persistToHistory();
    setShareFeedback('✅ PDF descargado exitosamente y guardado en Mis Presupuestos.');
    setTimeout(() => setShareFeedback(null), 4000);
  };

  // Enviar resumen por WhatsApp (con verificación de usuario autenticado)
  const handleShareWhatsApp = async () => {
    if (!currentUser) {
      // Guardar borrador explícitamente y abrir modal de registro sin perder datos
      setPendingAction('whatsapp');
      setShowAuthModal(true);
      return;
    }

    executeShareWhatsApp();
  };

  const executeShareWhatsApp = async () => {
    const { doc, cleanFileName } = buildPdfDoc();
    persistToHistory();

    // 1. SIEMPRE generar y descargar el archivo PDF en el dispositivo para que el usuario cuente con el archivo
    try {
      doc.save(cleanFileName);
    } catch (saveErr) {
      console.warn('Error al guardar PDF localmente:', saveErr);
    }

    // Armar desglose textual detallado para WhatsApp
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
    if (numManoObra > 0) desgloseManoMat.push(`  • 🛠️ Costo de Mano de Obra: $${numManoObra.toLocaleString('es-AR')}`);
    if (numMateriales > 0) desgloseManoMat.push(`  • 🧱 Costo de Materiales: $${numMateriales.toLocaleString('es-AR')}`);

    const text = `*BAHÍA OFICIOS • CONTRATO Y PRESUPUESTO OFICIAL*
📋 *Trabajo:* ${tituloTrabajo || proRubro}
👷 *Profesional:* ${proNombre || 'A convenir'} (${proTelefono || 'Sin teléfono'})
👤 *Cliente:* ${clienteNombre || 'A convenir'}
📍 *Lugar:* ${clienteDireccion || 'Bahía Blanca'}
🗓️ *Fecha inicio:* ${fechaInicio || 'A convenir'} | *Plazo:* ${plazoEntrega}

${tareasLines.length > 0 ? tareasLines.join('\n') + '\n\n' : ''}${materialesLines.length > 0 ? materialesLines.join('\n') + '\n\n' : ''}💰 *TOTAL PRESUPUESTADO:* $${numTotal.toLocaleString('es-AR')}
${desgloseManoMat.length > 0 ? desgloseManoMat.join('\n') + '\n' : ''}💵 *Seña acordada:* $${numSena.toLocaleString('es-AR')}
💳 *Saldo contra entrega:* $${numSaldo.toLocaleString('es-AR')}
💳 *Forma de pago:* ${formaPago}

📝 *Condiciones y Observaciones:*
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

  // Callback de éxito del PresupuestoAuthModal
  const handleAuthSuccess = (userData: any) => {
    setShowAuthModal(false);
    if (!proNombre && userData?.nombre) {
      setProNombre(userData.nombre);
    }
    if (!proTelefono && userData?.telefono) {
      setProTelefono(userData.telefono);
    }

    setShareFeedback('🎉 ¡Cuenta conectada con éxito! Generando tu presupuesto oficial...');
    setTimeout(() => {
      if (pendingAction === 'pdf') {
        const { doc, cleanFileName } = buildPdfDoc();
        doc.save(cleanFileName);
        persistToHistory();
        setShareFeedback('✅ PDF descargado exitosamente y guardado en Mis Presupuestos.');
      } else if (pendingAction === 'whatsapp') {
        executeShareWhatsApp();
      }
      setPendingAction(null);
    }, 400);
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
              Presupuesto, Cómputo y Contrato de Trabajo
            </h3>
            <p id="contrato-modal-desc" className="text-xs text-indigo-200">
              Desglosá tareas y materiales con precio individual, calculá subtotales y generá el PDF listo para firmar.
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

      {/* Barra de Notificación de Borrador Auto-Guardado */}
      <div className="bg-slate-100 dark:bg-slate-850 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Save size={13} className="text-emerald-500 shrink-0" />
          <span>
            {draftRestored 
              ? 'Borrador recuperado automáticamente de tu sesión previa.' 
              : lastAutoSaveTime 
                ? `Borrador guardado automáticamente (${lastAutoSaveTime}). No vas a perder datos.`
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
                  placeholder="Tu Nombre y Apellido (o Empresa)"
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
                    placeholder="DNI / CUIT (opcional)"
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
                    placeholder="Rubro (Ej: Plomería, Albañilería)"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="pro-matricula" className="sr-only">Matrícula o Registro</label>
                  <input
                    id="pro-matricula"
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <User size={14} aria-hidden="true" /> Cliente / Locatario
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

        {/* TÍTULO RESUMEN DEL TRABAJO */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText size={15} className="text-indigo-600" aria-hidden="true" />
              Título del Trabajo / Proyecto
            </h4>
            <span className="text-[11px] text-slate-400">Encabezado principal</span>
          </div>
          <input
            id="trabajo-titulo"
            type="text"
            value={tituloTrabajo}
            onChange={(e) => setTituloTrabajo(e.target.value)}
            placeholder="Título resumen del trabajo (Ej: Reparación de cañerías e instalación de bomba presurizadora)"
            className="w-full px-3.5 py-2.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Banner de feedback por voz con IA */}
        {(aiVoiceFeedback || isProcessingAi || isListeningTareas || isListeningMateriales) && (
          <div className="p-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs rounded-xl shadow-md flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className={`shrink-0 text-amber-300 ${isProcessingAi ? 'animate-spin' : 'animate-bounce'}`} />
              <span className="font-semibold">
                {aiVoiceFeedback || (isListeningTareas ? '🎙️ Escuchando tarea... Ej: "4 m de revoque a 20.000 pesos"' : '🎙️ Escuchando material... Ej: "tres codos de termofusión valen cada uno 5.000 pesos"')}
              </span>
            </div>
            {(isListeningTareas || isListeningMateriales) && (
              <button
                type="button"
                onClick={() => {
                  if (voiceRecognitionRef.current) {
                    try { voiceRecognitionRef.current.stop(); } catch {}
                  }
                  setIsListeningTareas(false);
                  setIsListeningMateriales(false);
                }}
                className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                Detener
              </button>
            )}
          </div>
        )}

        {/* SECCIÓN 2: TAREAS / MANO DE OBRA CON PRECIO INDIVIDUAL */}
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Wrench size={15} className="text-indigo-600" aria-hidden="true" />
                1. Tareas y Mano de Obra (Precio Individual por Tarea)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Poné cantidad (m², m, un) y precio individual. O dictá con tu voz: <em>"4 m de revoque a 20.000 pesos"</em>.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleVoiceRecordingWithAi('tarea')}
                disabled={isProcessingAi}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  isListeningTareas
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
                }`}
                title="Dictar tarea por voz (ej: '4 m de revoque a 20.000 pesos')"
              >
                {isListeningTareas ? <MicOff size={13} /> : <Mic size={13} />}
                <span>{isListeningTareas ? 'Escuchando...' : 'Dictar con Voz / IA'}</span>
              </button>

              <button
                type="button"
                onClick={handleAddTarea}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Plus size={13} />
                <span>Agregar Tarea</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {tareasList.map((tarea, idx) => (
              <div 
                key={tarea.id} 
                className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xs"
              >
                <span className="w-5 text-center text-xs font-bold text-slate-400 shrink-0">
                  {idx + 1}
                </span>

                <input
                  type="text"
                  value={tarea.descripcion}
                  onChange={(e) => handleUpdateTarea(tarea.id, 'descripcion', e.target.value)}
                  placeholder="Descripción de la tarea (Ej: Revoque fino a la cal)"
                  className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs bg-transparent border-0 focus:ring-0 focus:outline-none"
                />

                <input
                  type="text"
                  value={tarea.cantidad || ''}
                  onChange={(e) => handleUpdateTarea(tarea.id, 'cantidad', e.target.value)}
                  placeholder="Cant. (4 m, 15 m²)"
                  className="w-24 sm:w-28 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none font-medium text-center"
                  title="Cantidad o medida (ej: 4 m, 12 m², 1 global, 10 ml)"
                />

                <div className="flex items-center gap-1.5 w-32 sm:w-36 shrink-0 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    value={tarea.precio}
                    onChange={(e) => handleUpdateTarea(tarea.id, 'precio', e.target.value)}
                    placeholder="Precio"
                    className="w-full text-xs font-bold text-slate-900 dark:text-white bg-transparent border-0 focus:ring-0 focus:outline-none text-right"
                  />
                </div>

                {tareasList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTarea(tarea.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Eliminar tarea"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Subtotal en vivo de Mano de Obra */}
          <div className="flex items-center justify-between pt-1 px-1 text-xs">
            <span className="text-[11px] text-slate-500">
              {validTareas.length} tarea{validTareas.length !== 1 ? 's' : ''} cargada{validTareas.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-indigo-700 dark:text-indigo-300">
                Suma Mano de Obra:
              </span>
              <span className="font-black text-sm text-indigo-900 dark:text-indigo-200">
                ${numManoObra.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: MATERIALES E INSUMOS CON PRECIO INDIVIDUAL */}
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <ShoppingBag size={15} className="text-emerald-600" aria-hidden="true" />
                2. Materiales e Insumos (Precio Individual por Material)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Detallá materiales o dictá con tu voz: <em>"tres codos de termofusión valen cada uno 5.000 pesos"</em>.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleVoiceRecordingWithAi('material')}
                disabled={isProcessingAi}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  isListeningMateriales
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                }`}
                title="Dictar material por voz (ej: 'tres codos de termofusión valen cada uno 5.000 pesos')"
              >
                {isListeningMateriales ? <MicOff size={13} /> : <Mic size={13} />}
                <span>{isListeningMateriales ? 'Escuchando...' : 'Dictar con Voz / IA'}</span>
              </button>

              <button
                type="button"
                onClick={handleAddMaterial}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Plus size={13} />
                <span>Agregar Material</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {materialesList.map((material, idx) => (
              <div 
                key={material.id} 
                className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xs"
              >
                <span className="w-5 text-center text-xs font-bold text-slate-400 shrink-0">
                  {idx + 1}
                </span>

                <input
                  type="text"
                  value={material.descripcion}
                  onChange={(e) => handleUpdateMaterial(material.id, 'descripcion', e.target.value)}
                  placeholder="Material o insumo (Ej: Caño termofusión 20mm)"
                  className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs bg-transparent border-0 focus:ring-0 focus:outline-none"
                />

                <input
                  type="text"
                  value={material.cantidad || ''}
                  onChange={(e) => handleUpdateMaterial(material.id, 'cantidad', e.target.value)}
                  placeholder="Cant. (Ej: 3 un)"
                  className="w-24 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none"
                />

                <div className="flex items-center gap-1.5 w-32 sm:w-36 shrink-0 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    value={material.precio}
                    onChange={(e) => handleUpdateMaterial(material.id, 'precio', e.target.value)}
                    placeholder="Precio"
                    className="w-full text-xs font-bold text-slate-900 dark:text-white bg-transparent border-0 focus:ring-0 focus:outline-none text-right"
                  />
                </div>

                {materialesList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMaterial(material.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Eliminar material"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Subtotal en vivo de Materiales */}
          <div className="flex items-center justify-between pt-1 px-1 text-xs">
            <span className="text-[11px] text-slate-500">
              {validMateriales.length} material{validMateriales.length !== 1 ? 'es' : ''} cargado{validMateriales.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-800 dark:text-emerald-300">
                Suma Materiales:
              </span>
              <span className="font-black text-sm text-emerald-900 dark:text-emerald-200">
                ${numMateriales.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: OBSERVACIONES GENERALES Y DICTADO POR VOZ */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileText size={15} className="text-indigo-600" aria-hidden="true" />
                Observaciones y Condiciones Especiales
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Podés escribir aclaraciones o presionar el botón para dictar directamente con tu voz.
              </p>
            </div>

            {/* Botón de Dictado por Voz */}
            <button
              type="button"
              onClick={toggleVoiceRecording}
              aria-pressed={isListening}
              aria-label={isListening ? "Detener dictado por voz" : "Iniciar dictado de tareas por voz"}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none self-start sm:self-auto ${
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
            <textarea
              id="trabajo-descripcion"
              rows={3}
              value={descripcionTrabajo}
              onChange={(e) => setDescripcionTrabajo(e.target.value)}
              placeholder="Detallá cualquier condición especial, garantías particulares, partes no contempladas, horario de ingreso a la obra..."
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
        </div>

        {/* SECCIÓN 5: PLAZOS Y CONDICIONES ECONÓMICAS CON SUMA AUTOMÁTICA */}
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

            <div>
              <label htmlFor="forma-pago" className="text-[10px] text-slate-500 font-bold block mb-1">
                Forma de Pago Acordada:
              </label>
              <select
                id="forma-pago"
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              >
                <option value="Efectivo / Transferencia">Efectivo / Transferencia</option>
                <option value="Efectivo al finalizar">Efectivo contra entrega</option>
                <option value="Transferencia bancaria">Transferencia bancaria</option>
                <option value="Seña 50% y saldo contra entrega">Seña 50% y saldo contra entrega</option>
                <option value="A convenir">A convenir según avance</option>
              </select>
            </div>
          </div>

          {/* Montos y Totales con Auto-Suma */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <DollarSign size={14} aria-hidden="true" /> Mano de Obra, Materiales y Total
              </h4>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                Suma Automática
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
              <span className="text-[10px] text-slate-500 font-bold">Seña:</span>
              <button
                type="button"
                onClick={() => applyQuickSenaPercent(30)}
                className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                30%
              </button>
              <button
                type="button"
                onClick={() => applyQuickSenaPercent(50)}
                className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                50%
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="monto-sena" className="text-[10px] text-slate-500 font-bold block mb-1">
                  Seña Acordada ($):
                </label>
                <input
                  id="monto-sena"
                  type="number"
                  value={montoSena}
                  onChange={(e) => setMontoSena(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">
                  Saldo Restante:
                </label>
                <div className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700">
                  ${numSaldo.toLocaleString('es-AR')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen y Feedback */}
        {shareFeedback && (
          <div 
            role="status" 
            aria-live="polite" 
            className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in"
          >
            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
            <span className="font-semibold">{shareFeedback}</span>
          </div>
        )}

        {/* Banner de Registro previo si no está autenticado */}
        {!currentUser && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <Lock size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Descarga protegida</span>
              <span>
                Al presionar <strong>"Descargar PDF"</strong> o <strong>"Enviar por WhatsApp"</strong> se te pedirá registrarte gratis para asociar el presupuesto a tu cuenta y que no pierdas tus datos.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Barra de Acciones */}
      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-400 w-full sm:w-auto text-center sm:text-left">
          <span>Total a cobrar: </span>
          <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
            ${numTotal.toLocaleString('es-AR')}
          </span>
          {numSena > 0 && (
            <span className="text-[11px] text-slate-400 ml-1.5">
              (Seña: ${numSena.toLocaleString('es-AR')})
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {!isStandalonePage && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          )}

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

  return (
    <>
      {isStandalonePage ? (
        cardContent
      ) : (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {cardContent}
        </div>
      )}

      {/* Modal de Registro / Login que mantiene el contexto intacto */}
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
    </>
  );
};
