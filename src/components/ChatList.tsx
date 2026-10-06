import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDoc, 
  getDocs,
  doc, 
  limit, 
  orderBy 
} from 'firebase/firestore';
import { 
  MessageSquare, 
  User as UserIcon, 
  Clock, 
  Search, 
  FileText, 
  Filter, 
  CheckCircle2, 
  ExternalLink, 
  Phone, 
  ArrowRight, 
  Download, 
  X, 
  Sparkles, 
  Calculator, 
  ShieldCheck,
  Briefcase,
  ChevronRight
} from 'lucide-react';
import { CachedImage } from './CachedImage';
import { getPresupuestos, SavedPresupuesto, downloadPresupuestoPdf } from '../utils/presupuestosStorage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ChatPreview {
  id: string;
  clientId: string;
  workerId: string;
  clientName: string;
  workerName: string;
  lastMessage: string;
  lastMessageTime: any;
  updatedAt: any;
  otherUserId: string;
  otherUserName: string;
  otherUserFotoUrl?: string;
  otherUserRubro?: string;
  otherUserTelefono?: string;
  otherUserVerificado?: boolean;
  hasUnread?: boolean;
  lastMessageSenderId?: string;
  hasQuote?: boolean;
  lastQuoteAmount?: number;
  lastQuoteDescription?: string;
  lastQuoteDate?: any;
  linkedPresupuesto?: SavedPresupuesto;
}

export const ChatList: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedPresupuestos, setSavedPresupuestos] = useState<SavedPresupuesto[]>([]);

  // Filtros y Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'quotes' | 'unread' | 'workers'>('all');

  // Modal de Presupuesto Rápido
  const [selectedQuoteChat, setSelectedQuoteChat] = useState<ChatPreview | null>(null);

  // 1. Cargar historial local y de Firestore de presupuestos guardados para enriquecer
  useEffect(() => {
    if (!currentUser) return;
    getPresupuestos(currentUser.uid).then(pres => {
      setSavedPresupuestos(pres);
    }).catch(err => {
      console.warn("Error cargando presupuestos en ChatList:", err);
    });
  }, [currentUser]);

  // 2. Escuchar chats en tiempo real
  useEffect(() => {
    if (!currentUser) return;

    const isClient = currentUser.rol === 'cliente';
    const field = isClient ? 'clientId' : 'workerId';

    // Query para el rol principal
    const qPrimary = query(
      collection(db, 'chats'),
      where(field, '==', currentUser.uid)
    );

    // También query secundaria por si el usuario actúa como cliente o como profesional en distintas interacciones
    const altField = isClient ? 'workerId' : 'clientId';
    const qAlt = query(
      collection(db, 'chats'),
      where(altField, '==', currentUser.uid)
    );

    let primaryChats: any[] = [];
    let altChats: any[] = [];

    const processAllChats = async () => {
      const combinedMap = new Map<string, any>();
      [...primaryChats, ...altChats].forEach(c => combinedMap.set(c.id, c));
      const rawList = Array.from(combinedMap.values());

      const chatData: ChatPreview[] = [];

      for (const data of rawList) {
        const otherUserId = data.clientId === currentUser.uid ? data.workerId : data.clientId;
        const otherUserName = data.clientId === currentUser.uid ? data.workerName : data.clientName;

        let otherUserFotoUrl = '';
        let otherUserRubro = '';
        let otherUserTelefono = '';
        let otherUserVerificado = false;

        // Intentar obtener datos enriquecidos del otro usuario
        try {
          const otherUserDoc = await getDoc(doc(db, 'usuarios', otherUserId));
          if (otherUserDoc.exists()) {
            const uData = otherUserDoc.data();
            otherUserFotoUrl = uData.fotoUrl || '';
            otherUserRubro = uData.profesionalInfo?.rubro || uData.rubro || uData.profesion || '';
            otherUserTelefono = uData.telefono || '';
            otherUserVerificado = Boolean(uData.verificado || uData.profesionalInfo?.verificado);
          }
        } catch (error) {
          console.warn("Error fetching other user data for chat:", error);
        }

        // Detectar si este chat tiene presupuestos
        let hasQuote = Boolean(data.hasQuote || data.lastQuoteAmount);
        let lastQuoteAmount = data.lastQuoteAmount || 0;
        let lastQuoteDescription = data.lastQuoteDescription || '';
        let lastQuoteDate = data.lastQuoteDate || null;

        // Si no está registrado en el doc raíz del chat, verificar en mensajes recientes
        if (!hasQuote) {
          try {
            const qMsg = query(
              collection(db, 'chats', data.id, 'messages'),
              where('isQuote', '==', true),
              limit(1)
            );
            const msgSnap = await getDocs(qMsg);
            if (!msgSnap.empty) {
              const qData = msgSnap.docs[0].data();
              hasQuote = true;
              lastQuoteAmount = qData.quoteAmount || 0;
              lastQuoteDescription = qData.quoteDescription || '';
              lastQuoteDate = qData.timestamp;
            }
          } catch {
            // fallback
          }
        }

        // Buscar presupuesto vinculado en safeGetPresupuestos
        const linkedPresupuesto = savedPresupuestos.find(sp => {
          const nameToMatch = otherUserName.toLowerCase().trim();
          if (!nameToMatch) return false;
          const matchClient = sp.clienteNombre?.toLowerCase().includes(nameToMatch);
          const matchPro = sp.proNombre?.toLowerCase().includes(nameToMatch);
          return matchClient || matchPro;
        });

        chatData.push({
          ...data,
          otherUserId,
          otherUserName,
          otherUserFotoUrl,
          otherUserRubro,
          otherUserTelefono,
          otherUserVerificado,
          hasQuote: hasQuote || Boolean(linkedPresupuesto),
          lastQuoteAmount: lastQuoteAmount || (linkedPresupuesto ? linkedPresupuesto.montoTotal : undefined),
          lastQuoteDescription: lastQuoteDescription || (linkedPresupuesto ? linkedPresupuesto.titulo : undefined),
          lastQuoteDate: lastQuoteDate || (linkedPresupuesto ? linkedPresupuesto.fecha : undefined),
          linkedPresupuesto
        });
      }

      // Ordenar por última actualización
      chatData.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.lastMessageTime?.toMillis ? a.lastMessageTime.toMillis() : 0);
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.lastMessageTime?.toMillis ? b.lastMessageTime.toMillis() : 0);
        return timeB - timeA;
      });

      setChats(chatData);
      setLoading(false);
    };

    const unsubPrimary = onSnapshot(qPrimary, (snap) => {
      primaryChats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      processAllChats();
    }, (err) => {
      console.error("Error fetching primary chats:", err);
      setLoading(false);
    });

    const unsubAlt = onSnapshot(qAlt, (snap) => {
      altChats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      processAllChats();
    }, (err) => {
      console.warn("Error fetching secondary chats:", err);
    });

    return () => {
      unsubPrimary();
      unsubAlt();
    };
  }, [currentUser, savedPresupuestos]);

  // Filtrado reactivo en cliente
  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      // 1. Filtro por pestañas
      if (activeTab === 'quotes' && !chat.hasQuote) return false;
      if (activeTab === 'unread') {
        const isUnread = chat.hasUnread && chat.lastMessageSenderId !== currentUser?.uid;
        if (!isUnread) return false;
      }
      if (activeTab === 'workers' && !chat.otherUserRubro) return false;

      // 2. Filtro por buscador
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = chat.otherUserName.toLowerCase().includes(q);
        const matchRubro = (chat.otherUserRubro || '').toLowerCase().includes(q);
        const matchMsg = (chat.lastMessage || '').toLowerCase().includes(q);
        const matchDesc = (chat.lastQuoteDescription || '').toLowerCase().includes(q);
        if (!matchName && !matchRubro && !matchMsg && !matchDesc) return false;
      }

      return true;
    });
  }, [chats, activeTab, searchQuery, currentUser]);

  // Contadores para las pestañas
  const stats = useMemo(() => {
    const total = chats.length;
    const withQuotes = chats.filter(c => c.hasQuote).length;
    const unread = chats.filter(c => c.hasUnread && c.lastMessageSenderId !== currentUser?.uid).length;
    return { total, withQuotes, unread };
  }, [chats, currentUser]);

  // Descargar PDF de Presupuesto Rápido
  const handleDownloadQuickPdf = (chat: ChatPreview) => {
    if (chat.linkedPresupuesto) {
      downloadPresupuestoPdf(chat.linkedPresupuesto);
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Encabezado
    doc.setFillColor(15, 36, 92); // #0f245c
    doc.rect(0, 0, pageWidth, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('BAHÍA OFICIOS', 14, 15);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(219, 234, 254);
    doc.text('Directorio Oficial de Profesionales y Servicios • Bahía Blanca', 14, 22);
    doc.text('bahiaoficios.com', 14, 27);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text('PRESUPUESTO FORMAL DE TRABAJO', pageWidth - 14, 15, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(254, 243, 199);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, pageWidth - 14, 22, { align: 'right' });
    doc.text('Validez: 15 días corridos', pageWidth - 14, 27, { align: 'right' });

    // Tabla de Partes
    autoTable(doc, {
      startY: 38,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      head: [['DATOS DEL PROFESIONAL', 'DATOS DEL CLIENTE']],
      body: [
        [
          `Profesional: ${currentUser?.rol === 'profesional' ? currentUser.nombre : chat.otherUserName}\nRubro: ${chat.otherUserRubro || 'Oficios'}\nBahía Blanca`,
          `Cliente: ${currentUser?.rol === 'cliente' ? currentUser.nombre : chat.otherUserName}\nBahía Blanca`
        ]
      ]
    });

    // Detalle
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 5,
      theme: 'grid',
      headStyles: { fillColor: [15, 36, 92], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8.5, cellPadding: 3 },
      head: [['DESCRIPCIÓN DEL TRABAJO O SERVICIO', 'IMPORTE']],
      body: [
        [
          chat.lastQuoteDescription || 'Servicios profesionales acordados en la plataforma Bahía Oficios.',
          `$${(chat.lastQuoteAmount || 0).toLocaleString('es-AR')}`
        ]
      ]
    });

    let currentY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('• Plazos de ejecución aproximados y sujetos a condiciones climáticas e imprevistos de obra.', 14, currentY);
    currentY += 4;
    doc.text('• Este presupuesto fue acordado a través del canal oficial de mensajería de Bahía Oficios.', 14, currentY);

    doc.save(`Presupuesto_${chat.otherUserName.replace(/\s+/g, '_')}_BahiaOficios.pdf`);
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
          <MessageSquare size={30} />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Iniciá sesión para ver tus chats</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Accedé a tu historial organizado de conversaciones, presupuestos acordados y mensajes con profesionales de Bahía Blanca.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#0f245c] hover:bg-blue-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          Iniciar Sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      
      {/* CABECERA PRINCIPAL */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#0f245c] text-white flex items-center justify-center shrink-0 shadow-md">
            <MessageSquare size={24} className="text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                Centro de Mensajes
              </span>
              <span className="text-xs text-slate-400 font-mono">Bahía Oficios</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              Mis Chats y Presupuestos
            </h1>
          </div>
        </div>

        {/* Acciones directas */}
        <div className="flex items-center gap-2">
          <Link
            to="/presupuestar"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0f245c] hover:bg-blue-900 text-white text-xs font-bold transition-all shadow-xs"
            title="Armar presupuesto nuevo"
          >
            <Calculator size={14} className="text-amber-300" />
            <span>Nuevo Presupuesto</span>
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
          >
            <Search size={14} />
            <span className="hidden sm:inline">Buscar Profesionales</span>
          </Link>
        </div>
      </div>

      {/* BARRA DE FILTROS, BÚSQUEDA Y PESTAÑAS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          
          {/* Buscador reactivo */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, rubro (ej. Plomero, Gasista) o mensaje..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                title="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Selector de pestañas */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>Todos</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-600 text-[10px]">
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quotes')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'quotes'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileText size={12} />
              <span>Con Presupuesto</span>
              {stats.withQuotes > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'quotes' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                  {stats.withQuotes}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>No Leídos</span>
              {stats.unread > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                  {stats.unread}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* ESTADO DE CARGA */}
      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 p-5 animate-pulse">
              <div className="w-13 h-13 rounded-2xl bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LISTADO DE CHATS ORGANIZADO */}
      {!loading && (
        <>
          {filteredChats.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-10 sm:p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {searchQuery || activeTab !== 'all' 
                  ? 'No se encontraron conversaciones con los filtros aplicados' 
                  : 'Aún no tenés conversaciones activas'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                {searchQuery || activeTab !== 'all'
                  ? 'Probá ajustando la búsqueda por nombre de profesional o limpiá los filtros activos.'
                  : currentUser.rol === 'cliente'
                    ? 'Contactá a profesionales verificados de Bahía Blanca para solicitar cotizaciones, consultar disponibilidad o enviar pedidos de trabajo.'
                    : 'Tus clientes aparecerán aquí cuando te envíen consultas o solicitudes de presupuesto a través de tu perfil.'}
              </p>
              
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                {(searchQuery || activeTab !== 'all') ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveTab('all');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Restablecer Filtros
                  </button>
                ) : (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f245c] hover:bg-blue-900 text-white font-bold text-xs shadow-md transition-all"
                  >
                    <Search size={14} className="text-amber-300" />
                    <span>Explorar Directorio de Profesionales</span>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {filteredChats.map((chat) => {
                const isUnread = chat.hasUnread && chat.lastMessageSenderId !== currentUser.uid;
                const isSentByMe = chat.lastMessageSenderId === currentUser.uid;
                const formattedTime = chat.lastMessageTime?.toDate 
                  ? chat.lastMessageTime.toDate().toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '';

                return (
                  <div
                    key={chat.id}
                    className={`p-4 sm:p-5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-850/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isUnread ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    {/* Sección Izquierda: Avatar y Datos Principales */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      
                      {/* Avatar con badge no leído */}
                      <div className="relative shrink-0">
                        {chat.otherUserFotoUrl ? (
                          <CachedImage
                            src={chat.otherUserFotoUrl}
                            alt={chat.otherUserName}
                            className="w-13 h-13 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                            containerClassName="w-13 h-13 rounded-2xl shrink-0"
                          />
                        ) : (
                          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#0f245c] to-blue-700 text-white flex items-center justify-center font-bold text-base shadow-xs">
                            {chat.otherUserName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {isUnread && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full animate-ping" />
                        )}
                        {isUnread && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full" />
                        )}
                      </div>

                      {/* Información de la persona */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/chat/${chat.id}`}
                            className="font-black text-sm sm:text-base text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate"
                          >
                            {chat.otherUserName}
                          </Link>

                          {chat.otherUserVerificado && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-black">
                              <ShieldCheck size={11} className="text-blue-600 dark:text-blue-400" />
                              Verificado
                            </span>
                          )}

                          {chat.otherUserRubro && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                              {chat.otherUserRubro}
                            </span>
                          )}
                        </div>

                        {/* Último mensaje */}
                        <p className={`text-xs truncate ${
                          isUnread 
                            ? 'font-bold text-slate-900 dark:text-white' 
                            : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {isSentByMe && <span className="font-semibold text-slate-400 mr-1">Tú:</span>}
                          {chat.lastMessage || 'Conversación iniciada'}
                        </p>

                        {/* Etiqueta de Presupuesto Asociado */}
                        {chat.hasQuote && (
                          <div className="pt-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-black">
                              <FileText size={12} className="text-emerald-600" />
                              <span>Presupuesto acordado:</span>
                              <span className="font-extrabold">
                                ${(chat.lastQuoteAmount || 0).toLocaleString('es-AR')}
                              </span>
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => setSelectedQuoteChat(chat)}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              Ver detalles
                            </button>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Sección Derecha: Horario y Acciones Rápidas */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Clock size={11} />
                        {formattedTime}
                      </span>

                      <div className="flex items-center gap-2">
                        {/* Botón WhatsApp si tiene teléfono */}
                        {chat.otherUserTelefono && (
                          <a
                            href={`https://wa.me/549${chat.otherUserTelefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${chat.otherUserName}, te contacto desde Bahía Oficios sobre nuestra consulta.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                            title="Contactar directo por WhatsApp"
                            aria-label="WhatsApp"
                          >
                            <Phone size={14} />
                          </a>
                        )}

                        {/* Botón rápido para armar presupuesto */}
                        <Link
                          to={`/presupuestar?cliente=${encodeURIComponent(chat.otherUserName)}`}
                          className="hidden md:inline-flex items-center gap-1 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                          title="Crear presupuesto formal para esta persona"
                        >
                          <Calculator size={14} />
                        </Link>

                        {/* Botón Principal: Abrir Chat */}
                        <Link
                          to={`/chat/${chat.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0f245c] hover:bg-blue-900 text-white text-xs font-bold transition-all shadow-xs"
                        >
                          <span>Abrir Chat</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL DETALLES DE PRESUPUESTO ASOCIADO AL CHAT */}
      {selectedQuoteChat && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden space-y-4">
            
            {/* Header del Modal */}
            <div className="p-5 bg-gradient-to-r from-[#0f245c] to-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
                  <FileText size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                    Presupuesto en Conversación
                  </span>
                  <h3 className="text-base font-black leading-tight">
                    {selectedQuoteChat.otherUserName}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedQuoteChat(null)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido del presupuesto */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Monto Acordado</span>
                  <span className="text-xl font-black text-[#0f245c] dark:text-blue-300">
                    ${(selectedQuoteChat.lastQuoteAmount || 0).toLocaleString('es-AR')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Rubro</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedQuoteChat.otherUserRubro || 'Oficios'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase block mb-1">
                  Detalle / Observaciones del trabajo:
                </label>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedQuoteChat.lastQuoteDescription || 'Mano de obra y materiales presupuestados para la obra.'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
                <Sparkles size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Plazo de ejecución aproximado y sujeto a cambios climáticos e imprevistos de obra según las pautas de Bahía Oficios.
                </span>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedQuoteChat(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-100"
              >
                Cerrar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadQuickPdf(selectedQuoteChat)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
                >
                  <Download size={14} />
                  <span>Descargar PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate(`/chat/${selectedQuoteChat.id}`);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0f245c] hover:bg-blue-900 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
                >
                  <span>Ir al Chat</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
