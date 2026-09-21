import React, { useState, useEffect } from 'react';
import { User, PaymentRecord } from '../types';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  X, 
  CreditCard, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  MessageCircle, 
  Plus, 
  ShieldCheck, 
  RefreshCw, 
  FileText,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { getVipExpirationDate, getVipStatus, getVipDiffInfo, checkAndExpireUserVip } from '../utils/vipUtils';

interface ProfessionalPaymentHistoryModalProps {
  user: User;
  onClose: () => void;
  onUserUpdated?: (updatedUser: User) => void;
}

export const ProfessionalPaymentHistoryModal: React.FC<ProfessionalPaymentHistoryModalProps> = ({
  user,
  onClose,
  onUserUpdated
}) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<User>(user);

  // Form state for manual payment registration
  const [newMonths, setNewMonths] = useState(1);
  const [newAmount, setNewAmount] = useState(5000);
  const [newMethod, setNewMethod] = useState<'mercadopago' | 'transferencia' | 'efectivo' | 'bonificacion'>('transferencia');
  const [newNotes, setNewNotes] = useState('');

  const pInfo = currentUserData.profesionalInfo;
  const vipStatus = getVipStatus(pInfo);
  const diffInfo = getVipDiffInfo(pInfo);
  const expirationDate = diffInfo.expirationDate;
  const today = new Date();

  // Load payment records from Firestore
  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'pagos'),
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const list: PaymentRecord[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRecord));
        
        // Sort by createdAt descending
        list.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

        setPayments(list);
      } catch (err) {
        console.error("Error fetching payment history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user.uid]);

  // Handle immediate sync/expire if inconsistent
  const handleForceExpire = async () => {
    if (!window.confirm("¿Dar de baja la suscripción VIP de este usuario?")) return;
    try {
      await updateDoc(doc(db, 'usuarios', currentUserData.uid), {
        'profesionalInfo.isVip': false,
        'profesionalInfo.vipExpiredAt': new Date()
      });
      const updated = {
        ...currentUserData,
        profesionalInfo: {
          ...currentUserData.profesionalInfo,
          isVip: false,
          vipExpiredAt: new Date()
        } as any
      };
      setCurrentUserData(updated);
      onUserUpdated?.(updated);
      alert("Suscripción VIP dada de baja correctamente.");
    } catch (e) {
      console.error("Error updating VIP status:", e);
      alert("Error al actualizar el estado VIP.");
    }
  };

  // Handle manual extension or new payment
  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayment(true);
    try {
      // Calculate new expiration date
      let baseDate = new Date();
      // If currently active and not expired, extend from existing expiration
      if (vipStatus === 'active' && expirationDate && expirationDate > baseDate) {
        baseDate = new Date(expirationDate);
      }

      const newExp = new Date(baseDate);
      newExp.setMonth(newExp.getMonth() + Number(newMonths));

      // 1. Add payment record to Firestore
      const paymentDocData = {
        userId: currentUserData.uid,
        type: 'vip_subscription',
        months: Number(newMonths),
        amount: Number(newAmount),
        status: 'approved',
        statementDescriptor: `Pago ${newMethod.toUpperCase()}`,
        planTitle: `Membresía VIP (${newMonths} mes${newMonths > 1 ? 'es' : ''}) - ${newMethod}`,
        createdAt: Timestamp.now(),
        expirationDate: Timestamp.fromDate(newExp),
        notes: newNotes.trim() || `Registrado manualmente por administración (${newMethod})`
      };

      const docRef = await addDoc(collection(db, 'pagos'), paymentDocData);

      // 2. Update user profile in Firestore
      await updateDoc(doc(db, 'usuarios', currentUserData.uid), {
        'profesionalInfo.isVip': true,
        'profesionalInfo.vipExpiration': Timestamp.fromDate(newExp),
        'updatedAt': Timestamp.now()
      });

      const updatedUser: User = {
        ...currentUserData,
        profesionalInfo: {
          ...currentUserData.profesionalInfo,
          isVip: true,
          vipExpiration: newExp
        } as any
      };

      setCurrentUserData(updatedUser);
      setPayments([{ id: docRef.id, ...paymentDocData } as PaymentRecord, ...payments]);
      onUserUpdated?.(updatedUser);
      setShowAddPayment(false);
      setNewNotes('');
      alert(`Membresía extendida exitosamente hasta el ${newExp.toLocaleDateString()}`);
    } catch (err) {
      console.error("Error adding payment:", err);
      alert("Error al registrar el pago.");
    } finally {
      setSavingPayment(false);
    }
  };

  // Prepare commercial WhatsApp link
  const cleanPhone = (currentUserData.telefono || pInfo?.telefono || '').replace(/\D/g, '');
  const formatPhone = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone}`;
  
  let defaultMessage = `Hola ${currentUserData.nombre}, te contactamos desde TodoServicios. `;
  if (vipStatus === 'expired') {
    defaultMessage += `Vemos que tu suscripción VIP finalizó el ${expirationDate ? expirationDate.toLocaleDateString() : 'hace unos meses'}. ¿Te gustaría renovarla con las nuevas promociones vigentes para recuperar visibilidad destacada?`;
  } else if (vipStatus === 'expiring_soon') {
    defaultMessage += `Te recordamos que tu membresía VIP finaliza pronto (el ${expirationDate?.toLocaleDateString()}). ¿Deseas renovarla para no perder tu posición destacada?`;
  } else {
    defaultMessage += `Nos comunicamos para consultar si todo marcha bien con tu perfil VIP en TodoServicios.`;
  }
  const whatsappUrl = `https://wa.me/${formatPhone}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-4">
            <img 
              src={currentUserData.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserData.nombre)}`} 
              alt={currentUserData.nombre} 
              className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {currentUserData.nombre}
                </h3>
                {currentUserData.nombreNegocio && (
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md font-medium">
                    {currentUserData.nombreNegocio}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {currentUserData.email} • {pInfo?.rubro || 'Profesional'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Comparativa de Vigencia / Status Card */}
          <div className="rounded-2xl p-5 border transition-all shadow-sm bg-white dark:bg-gray-850">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Estado de Membresía</span>
                <div className="flex items-center gap-2 mt-1">
                  {vipStatus === 'active' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      <CheckCircle size={14} /> VIP Activo
                    </span>
                  )}
                  {vipStatus === 'expiring_soon' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      <AlertTriangle size={14} /> Próximo a Vencer
                    </span>
                  )}
                  {vipStatus === 'expired' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                      <XCircle size={14} /> Membresía Vencida
                    </span>
                  )}
                  {vipStatus === 'none' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      Sin Suscripción VIP
                    </span>
                  )}

                  {/* Warning if isVip flag was true but expired */}
                  {pInfo?.isVip && vipStatus === 'expired' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200">
                      Figuraba VIP (Caducado)
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {cleanPhone && (
                  <a 
                    href={whatsappUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <MessageCircle size={15} /> WhatsApp Comercial
                  </a>
                )}
                {pInfo?.isVip && vipStatus === 'expired' && (
                  <button 
                    onClick={handleForceExpire}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
                  >
                    Actualizar a No-VIP
                  </button>
                )}
                <button 
                  onClick={() => setShowAddPayment(!showAddPayment)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Plus size={15} /> {showAddPayment ? 'Cancelar' : 'Registrar Pago / Renovar'}
                </button>
              </div>
            </div>

            {/* Visual comparison grid: Expiration vs Today */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-[11px] font-semibold text-gray-500 uppercase flex items-center gap-1">
                  <Calendar size={13} /> Fecha de Vencimiento
                </span>
                <p className="text-base font-bold text-gray-900 dark:text-white mt-1">
                  {expirationDate ? expirationDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No registrada'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {expirationDate ? expirationDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'Sin registro'}
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-[11px] font-semibold text-gray-500 uppercase flex items-center gap-1">
                  <Clock size={13} /> Fecha Actual (Hoy)
                </span>
                <p className="text-base font-bold text-gray-900 dark:text-white mt-1">
                  {today.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Tiempo en tiempo real</p>
              </div>

              <div className={`p-3 rounded-xl border ${
                diffInfo.isPast 
                  ? 'bg-red-50/70 border-red-200 dark:bg-red-950/30 dark:border-red-900' 
                  : vipStatus === 'expiring_soon'
                  ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900'
                  : 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900'
              }`}>
                <span className="text-[11px] font-semibold uppercase flex items-center gap-1 text-gray-600 dark:text-gray-300">
                  <HourglassIcon className="w-3.5 h-3.5" /> Diagnóstico de Vigencia
                </span>
                <p className={`text-base font-bold mt-1 ${
                  diffInfo.isPast 
                    ? 'text-red-700 dark:text-red-400' 
                    : vipStatus === 'expiring_soon'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}>
                  {diffInfo.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {diffInfo.isPast 
                    ? 'El usuario no debe contar con prioridad VIP' 
                    : 'Usuario con beneficios y posición preferencial'}
                </p>
              </div>
            </div>
          </div>

          {/* Form to add manual payment or extend */}
          {showAddPayment && (
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 animate-in slide-in-from-top-4 duration-200">
              <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-4 flex items-center gap-2">
                <CreditCard size={18} /> Registrar Cobro / Otorgar Membresía VIP
              </h4>
              <form onSubmit={handleAddPaymentSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Período / Duración
                    </label>
                    <select 
                      value={newMonths} 
                      onChange={e => {
                        const m = Number(e.target.value);
                        setNewMonths(m);
                        if (m === 1) setNewAmount(5000);
                        else if (m === 3) setNewAmount(13800);
                        else if (m === 6) setNewAmount(25800);
                        else if (m === 12) setNewAmount(48000);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={1}>1 Mes ($5.000)</option>
                      <option value={3}>3 Meses ($13.800)</option>
                      <option value={6}>6 Meses ($25.800)</option>
                      <option value={12}>12 Meses ($48.000)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Monto Pagado ($ ARS)
                    </label>
                    <input 
                      type="number" 
                      value={newAmount} 
                      onChange={e => setNewAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Método de Pago
                    </label>
                    <select 
                      value={newMethod} 
                      onChange={e => setNewMethod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="mercadopago">Mercado Pago</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="bonificacion">Bonificación / Promo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Nota interna o Referencia de comprobante
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: Transf. Santander Río comprobante #482910 - Renovación trimestral" 
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddPayment(false)}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={savingPayment}
                    className="px-5 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {savingPayment ? 'Guardando...' : 'Confirmar y Activar VIP'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Historial de Pagos y Transacciones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" /> Historial de Pagos y Movimientos
              </h4>
              <span className="text-xs text-gray-500">
                {payments.length} {payments.length === 1 ? 'registro encontrado' : 'registros encontrados'}
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-indigo-600" /> Cargando historial de pagos...
              </div>
            ) : payments.length > 0 ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                        <th className="p-3.5">Fecha</th>
                        <th className="p-3.5">Concepto / Plan</th>
                        <th className="p-3.5">Monto</th>
                        <th className="p-3.5">Vigencia Otorgada</th>
                        <th className="p-3.5">Estado</th>
                        <th className="p-3.5 text-right">Referencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {payments.map(p => {
                        const date = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || 0);
                        const exp = p.expirationDate?.toDate ? p.expirationDate.toDate() : (p.expirationDate ? new Date(p.expirationDate) : null);
                        
                        return (
                          <tr key={p.id || Math.random()} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                            <td className="p-3.5 text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
                              {date.toLocaleDateString('es-AR')}
                              <span className="block text-[11px] text-gray-400">
                                {date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="p-3.5 text-gray-900 dark:text-white font-semibold">
                              {p.planTitle || (p.months ? `Suscripción VIP (${p.months}m)` : 'Membresía VIP')}
                              {p.notes && (
                                <span className="block text-xs font-normal text-gray-500">{p.notes}</span>
                              )}
                            </td>
                            <td className="p-3.5 text-gray-900 dark:text-white font-bold whitespace-nowrap">
                              ${p.amount?.toLocaleString('es-AR') || '0'}
                            </td>
                            <td className="p-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                              {exp ? exp.toLocaleDateString('es-AR') : '-'}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                p.status === 'approved' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {p.status === 'approved' ? 'Aprobado' : p.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-mono text-xs text-gray-500 whitespace-nowrap">
                              {p.paymentId || p.id?.substring(0, 8) || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800/60 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center space-y-2">
                <AlertCircle className="mx-auto text-amber-500" size={28} />
                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                  Sin transacciones registradas en la colección de pagos
                </p>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  {expirationDate ? (
                    <>
                      El usuario tiene registrada una fecha de vencimiento VIP ({expirationDate.toLocaleDateString('es-AR')}) asignada históricamente en su perfil, pero no cuenta con tickets en la base de datos de pagos.
                    </>
                  ) : (
                    <>Este profesional aún no ha registrado pagos de suscripción VIP.</>
                  )}
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            ID Usuario: <span className="font-mono">{currentUserData.uid}</span>
          </span>
          <button 
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

function HourglassIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      {...props} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      viewBox="0 0 24 24"
    >
      <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </svg>
  );
}
