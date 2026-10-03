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

interface ContratoPresupuestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialJobTitle?: string;
  initialRubro?: string;
  initialClientName?: string;
  initialClientPhone?: string;
  initialClientAddress?: string;
  initialAmount?: number | string;
}

export const ContratoPresupuestoModal: React.FC<ContratoPresupuestoModalProps> = ({
  isOpen,
  onClose,
  initialJobTitle = '',
  initialRubro = '',
  initialClientName = '',
  initialClientPhone = '',
  initialClientAddress = '',
  initialAmount = ''
}) => {
  const { currentUser } = useAuth();

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

  // Valores Económicos
  const [montoTotal, setMontoTotal] = useState<string>('');
  const [montoSena, setMontoSena] = useState<string>('');
  const [formaPago, setFormaPago] = useState('Efectivo / Transferencia');

  // Estado del Micrófono (Dictado por Voz)
  const [isListening, setIsListening] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

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
      if (initialAmount) setMontoTotal(String(initialAmount));

      // Fecha de inicio por defecto: Hoy
      const today = new Date().toISOString().split('T')[0];
      setFechaInicio(today);
    }
  }, [isOpen, currentUser, initialJobTitle, initialRubro, initialClientName, initialClientPhone, initialClientAddress, initialAmount]);

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

  // Cálculo de Saldo
  const numTotal = Number(montoTotal) || 0;
  const numSena = Number(montoSena) || 0;
  const numSaldo = Math.max(0, numTotal - numSena);

  // Generador de PDF con jsPDF y AutoTable
  const handleGeneratePdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo #4F46E5
      const darkColor: [number, number, number] = [15, 23, 42]; // Slate 900
      const grayColor: [number, number, number] = [100, 116, 139]; // Slate 500

      // Encabezado Membretado
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 20, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('BAHÍA OFICIOS • CONTRATO Y RECIBO DE TRABAJO', 105, 12, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Plataforma Comunitaria de Servicios Profesionales • Bahía Blanca, Buenos Aires', 105, 17, { align: 'center' });

      // Fecha y Lugar
      const fechaHoy = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.setFontSize(9);
      doc.text(`Bahía Blanca, ${fechaHoy}`, 20, 28);
      doc.text(`Constancia N°: BO-${Date.now().toString().slice(-6)}`, 190, 28, { align: 'right' });

      // Línea divisoria
      doc.setDrawColor(226, 232, 240);
      doc.line(20, 31, 190, 31);

      // Tabla de Partes Intervinientes
      autoTable(doc, {
        startY: 34,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2, textColor: darkColor },
        body: [
          [
            { content: 'DATOS DEL PROFESIONAL / PRESTADOR', styles: { fontStyle: 'bold', textColor: primaryColor } },
            { content: 'DATOS DEL CLIENTE / LOCATARIO', styles: { fontStyle: 'bold', textColor: primaryColor } }
          ],
          [
            `Nombre: ${proNombre || 'No especificado'}\nDNI/CUIT: ${proDni || 'S/D'}\nTeléfono: ${proTelefono || 'S/D'}\nRubro: ${proRubro || 'Oficios'}${proMatricula ? `\nMatrícula: ${proMatricula}` : ''}`,
            `Nombre: ${clienteNombre || 'No especificado'}\nDNI: ${clienteDni || 'S/D'}\nTeléfono: ${clienteTelefono || 'S/D'}\nDirección Obra: ${clienteDireccion || 'Bahía Blanca'}`
          ]
        ]
      });

      let currentY = (doc as any).lastAutoTable.finalY + 6;

      // Detalle del Trabajo Acordado
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('DETALLE DEL TRABAJO Y TAREAS ACORDADAS', 20, currentY);

      currentY += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`Título / Objeto: ${tituloTrabajo || proRubro || 'Servicio Profesional'}`, 20, currentY);

      currentY += 4;
      autoTable(doc, {
        startY: currentY,
        theme: 'striped',
        headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3 },
        head: [['Descripción de Tareas, Materiales y Alcance']],
        body: [
          [descripcionTrabajo.trim() || 'Mano de obra especializada según especificaciones acordadas en visita previa.']
        ]
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Condiciones Económicas y Plazos
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('CONDICIONES ECONÓMICAS, PLAZOS Y PAGOS', 20, currentY);

      currentY += 4;
      autoTable(doc, {
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
        head: [['Monto Total Acordado', 'Seña / Anticipo', 'Saldo Contra Entrega', 'Plazo de Ejecución']],
        body: [
          [
            `$${numTotal.toLocaleString('es-AR')}`,
            `$${numSena.toLocaleString('es-AR')}`,
            `$${numSaldo.toLocaleString('es-AR')}`,
            plazoEntrega || 'A convenir'
          ]
        ]
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Cláusulas de Conformidad
      autoTable(doc, {
        startY: currentY,
        theme: 'plain',
        styles: { fontSize: 7.5, textColor: grayColor, cellPadding: 1.5 },
        body: [
          [
            '1. El profesional se compromete a realizar las tareas descritas conforme a las reglas del arte y buenas prácticas de su oficio.'
          ],
          [
            '2. Salvo pacto en contrario expreso, los materiales no descritos serán provistos por el cliente en tiempo y forma en el domicilio de obra.'
          ],
          [
            '3. La seña recibida ratifica el inicio del compromiso laboral y la reserva de agenda del profesional en la ciudad de Bahía Blanca.'
          ],
          [
            '4. El saldo restante se abonará de mutuo acuerdo al finalizar satisfactoriamente las tareas contratadas.'
          ]
        ]
      });

      currentY = (doc as any).lastAutoTable.finalY + 22;

      // Espacios de Firma Oficiales
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.5);

      // Firma Profesional
      doc.line(25, currentY, 85, currentY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('FIRMA DEL PROFESIONAL', 55, currentY + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Aclaración: ${proNombre || '......................................'}`, 55, currentY + 8, { align: 'center' });
      doc.text(`DNI/CUIT: ${proDni || '......................................'}`, 55, currentY + 12, { align: 'center' });

      // Firma Cliente
      doc.line(125, currentY, 185, currentY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('FIRMA DEL CLIENTE', 155, currentY + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Aclaración: ${clienteNombre || '......................................'}`, 155, currentY + 8, { align: 'center' });
      doc.text(`DNI: ${clienteDni || '......................................'}`, 155, currentY + 12, { align: 'center' });

      // Pie de página de seguridad
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Documento emitido a través de Bahía Oficios (bahiaoficios.com) • Validez legal como contrato privado entre partes (Código Civil y Comercial de la Nación).',
        105,
        288,
        { align: 'center' }
      );

      // Descargar PDF
      const cleanFileName = `Contrato_Trabajo_${(proNombre || 'Oficios').replace(/\s+/g, '_')}_${Date.now().toString().slice(-4)}.pdf`;
      doc.save(cleanFileName);
    } catch (err) {
      console.error('Error generating contract PDF:', err);
      alert('Hubo un error al generar el PDF. Verificá los campos completados.');
    }
  };

  // Compartir por WhatsApp
  const handleShareWhatsApp = () => {
    const text = `*BAHÍA OFICIOS • RESUMEN DE PRESUPUESTO Y TRABAJO*
📋 *Trabajo:* ${tituloTrabajo || proRubro}
👷 *Profesional:* ${proNombre} (${proTelefono})
👤 *Cliente:* ${clienteNombre}
📍 *Lugar:* ${clienteDireccion || 'Bahía Blanca'}
🗓️ *Fecha inicio:* ${fechaInicio || 'A convenir'} | *Plazo:* ${plazoEntrega}

💰 *Monto Total:* $${numTotal.toLocaleString('es-AR')}
💵 *Seña acordada:* $${numSena.toLocaleString('es-AR')}
💳 *Saldo contra entrega:* $${numSaldo.toLocaleString('es-AR')}

📝 *Detalle acordado:*
${descripcionTrabajo.trim() || 'Mano de obra acordada'}

_Generado a través de Bahía Oficios (bahiaoficios.com)_`;

    const targetPhone = clienteTelefono.replace(/\D/g, '');
    const url = targetPhone
      ? `https://wa.me/549${targetPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Membretado */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
              <FileText size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Modelo Oficial Descargable
              </span>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
                Contrato y Recibo Rápido de Trabajo
              </h3>
              <p className="text-xs text-indigo-200">
                Dejá asentado el presupuesto, seña y plazos en un PDF listo para imprimir y firmar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-100">
          {/* SECCIÓN 1: PARTES INTERVINIENTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profesional */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <User size={14} /> Profesional / Prestador
              </h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={proNombre}
                  onChange={(e) => setProNombre(e.target.value)}
                  placeholder="Nombre y Apellido del Profesional"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={proDni}
                    onChange={(e) => setProDni(e.target.value)}
                    placeholder="DNI o CUIT"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={proTelefono}
                    onChange={(e) => setProTelefono(e.target.value)}
                    placeholder="Teléfono / WhatsApp"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={proRubro}
                    onChange={(e) => setProRubro(e.target.value)}
                    placeholder="Rubro (Plomero, Gasista...)"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={proMatricula}
                    onChange={(e) => setProMatricula(e.target.value)}
                    placeholder="N° Matrícula (opcional)"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Cliente */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <MapPin size={14} /> Cliente / Lugar de Trabajo
              </h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Nombre y Apellido del Cliente"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={clienteDni}
                    onChange={(e) => setClienteDni(e.target.value)}
                    placeholder="DNI del Cliente (opcional)"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    placeholder="Teléfono del Cliente"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
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

          {/* SECCIÓN 2: DETALLE DEL TRABAJO CON DICTADO POR VOZ */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText size={15} className="text-indigo-600" /> Tareas, Alcance y Materiales Acordados
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Podés escribir las tareas o presionar el botón para dictar directamente con tu voz.
                </p>
              </div>

              {/* Botón de Dictado por Voz */}
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff size={14} />
                    <span>Detener Dictado</span>
                  </>
                ) : (
                  <>
                    <Mic size={14} />
                    <span>Dictar con Voz 🎙️</span>
                  </>
                )}
              </button>
            </div>

            {speechFeedback && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-600 dark:text-amber-300 text-xs flex items-center gap-2">
                <Sparkles size={14} />
                <span>{speechFeedback}</span>
              </div>
            )}

            <input
              type="text"
              value={tituloTrabajo}
              onChange={(e) => setTituloTrabajo(e.target.value)}
              placeholder="Título resumen del trabajo (Ej: Reparación de cañerías e instalación de bomba presurizadora)"
              className="w-full px-3.5 py-2.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            <textarea
              rows={4}
              value={descripcionTrabajo}
              onChange={(e) => setDescripcionTrabajo(e.target.value)}
              placeholder="Detallá las tareas a realizar, materiales contemplados, partes no incluidas, condiciones de entrega..."
              className="w-full p-3 text-xs leading-relaxed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

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

          {/* SECCIÓN 3: PLAZOS Y CONDICIONES ECONÓMICAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fechas */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Calendar size={14} /> Fechas y Plazos
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Fecha de Inicio:</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Plazo de Ejecución:</label>
                  <input
                    type="text"
                    value={plazoEntrega}
                    onChange={(e) => setPlazoEntrega(e.target.value)}
                    placeholder="Ej: 3 días hábiles"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Montos y Seña */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <DollarSign size={14} /> Monto, Seña y Saldo
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Monto Total ($):</label>
                  <input
                    type="number"
                    value={montoTotal}
                    onChange={(e) => setMontoTotal(e.target.value)}
                    placeholder="Ej: 80000"
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Seña / Anticipo ($):</label>
                  <input
                    type="number"
                    value={montoSena}
                    onChange={(e) => setMontoSena(e.target.value)}
                    placeholder="Ej: 30000"
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Saldo Calculado */}
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Saldo contra entrega:</span>
                <span className="font-black text-indigo-700 dark:text-indigo-300 text-sm">
                  ${numSaldo.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>Validez de contrato privado según Código Civil y Comercial.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <Share2 size={15} />
              <span>Enviar por WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleGeneratePdf}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs transition-all shadow-md shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Download size={15} />
              <span>Descargar PDF Oficial</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
