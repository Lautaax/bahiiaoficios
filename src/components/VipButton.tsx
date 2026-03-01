import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, CreditCard, X, CheckCircle, Loader2, Calendar, Clock } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import axios from 'axios';

interface Plan {
  id: string;
  months: number;
  price: number;
  originalPrice: number;
  discount: number;
  label: string;
}

const PLANS: Plan[] = [
  { id: '1_month', months: 1, price: 5000, originalPrice: 5000, discount: 0, label: 'Mensual' },
  { id: '3_months', months: 3, price: 13800, originalPrice: 15000, discount: 8, label: 'Trimestral' },
  { id: '6_months', months: 6, price: 25800, originalPrice: 30000, discount: 14, label: 'Semestral' },
  { id: '12_months', months: 12, price: 48000, originalPrice: 60000, discount: 20, label: 'Anual' },
];

export const VipButton: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'init' | 'processing' | 'success'>('init');
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[0]);
  const [remainingTime, setRemainingTime] = useState<string>('');

  useEffect(() => {
    if (currentUser?.profesionalInfo?.vipExpiration) {
      const expiration = currentUser.profesionalInfo.vipExpiration;
      let expirationDate: Date;

      // Handle Firestore Timestamp or Date object
      if (expiration instanceof Timestamp) {
        expirationDate = expiration.toDate();
      } else if (expiration.seconds) {
         // Handle raw object that looks like timestamp
         expirationDate = new Date(expiration.seconds * 1000);
      } else {
        expirationDate = new Date(expiration);
      }

      const now = new Date();
      const diffTime = expirationDate.getTime() - now.getTime();
      
      if (diffTime > 0) {
        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 30) {
          const months = Math.floor(days / 30);
          setRemainingTime(`${months} mes${months > 1 ? 'es' : ''} y ${days % 30} días`);
        } else if (days > 0) {
          setRemainingTime(`${days} día${days > 1 ? 's' : ''}`);
        } else {
          setRemainingTime(`${hours} hora${hours > 1 ? 's' : ''}`);
        }
      } else {
        setRemainingTime('Expirado');
      }
    }
  }, [currentUser]);

  if (!currentUser || currentUser.rol !== 'profesional') {
    return null;
  }

  const isVip = currentUser.profesionalInfo?.isVip;

  const handleBuyVip = async () => {
    setLoading(true);
    setPaymentStep('processing');
    
    try {
      console.log("Iniciando flujo de pago para:", currentUser.uid, "Plan:", selectedPlan.label);

      const response = await axios.post('/api/create_preference', {
        title: `Membresía VIP ${selectedPlan.label} - Portal de Oficios`,
        price: selectedPlan.price,
        quantity: 1,
        userEmail: currentUser.email,
        redirectUrl: window.location.origin,
        metadata: {
          userId: currentUser.uid,
          planId: selectedPlan.id,
          months: selectedPlan.months
        }
      });

      if (response.data.init_point) {
        window.location.href = response.data.init_point;
      } else {
        throw new Error('No se recibió el link de pago');
      }
      
    } catch (error) {
      console.error("Error iniciando pago:", error);
      if (axios.isAxiosError(error)) {
        alert(`Error al iniciar el pago: ${error.response?.data?.error || error.message}`);
      } else {
        alert("Error al iniciar el pago. Asegúrate de configurar el TOKEN de Mercado Pago en el backend.");
      }
      setPaymentStep('init');
      setShowPaymentModal(false);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setShowPaymentModal(true);
    setPaymentStep('init');
  };

  const closeModal = () => {
    setShowPaymentModal(false);
    setPaymentStep('init');
  };

  if (isVip) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-full">
            <ShieldCheck className="text-amber-600" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 flex items-center gap-2">
              Membresía VIP Activa
              <span className="bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
                ACTIVO
              </span>
            </h3>
            <p className="text-amber-700 text-sm mt-1 flex items-center gap-1.5">
              <Clock size={14} />
              Tiempo restante: <span className="font-bold">{remainingTime || 'Calculando...'}</span>
            </p>
          </div>
        </div>
        
        <button
          onClick={openModal}
          className="text-amber-700 text-sm font-medium hover:text-amber-900 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors border border-amber-200 bg-white"
        >
          Extender Membresía
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="text-indigo-600" />
              Destacá tu Perfil
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              Obtené más clientes apareciendo primero en las búsquedas y con un distintivo especial.
            </p>
          </div>
          
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all transform hover:scale-105 active:scale-95"
          >
            <CreditCard size={20} />
            Activar Destacado
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 relative max-h-[90vh] flex flex-col">
            
            {/* Close Button */}
            {paymentStep !== 'processing' && (
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 bg-white/80 rounded-full p-1"
              >
                <X size={20} />
              </button>
            )}

            {/* Header */}
            <div className="bg-[#009EE3] p-6 text-white text-center shrink-0">
              <img 
                src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.18.9/mercadolibre/logo__large_plus.png" 
                alt="Mercado Pago" 
                className="h-8 mx-auto mb-2 filter brightness-0 invert"
              />
              <h3 className="font-bold text-lg">Checkout Pro</h3>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {paymentStep === 'init' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck size={32} className="text-amber-500" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">Elige tu Plan VIP</h4>
                    <p className="text-gray-500 text-sm mt-1">Ahorra hasta un 30% con planes a largo plazo</p>
                  </div>

                  {/* Plan Selection Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PLANS.map((plan) => (
                      <div 
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`
                          relative cursor-pointer p-4 rounded-xl border-2 transition-all duration-200
                          ${selectedPlan.id === plan.id 
                            ? 'border-indigo-600 bg-indigo-50 shadow-md transform scale-[1.02]' 
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}
                        `}
                      >
                        {plan.discount > 0 && (
                          <div className="absolute -top-3 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                            AHORRA {plan.discount}%
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-2">
                          <span className={`font-bold text-sm ${selectedPlan.id === plan.id ? 'text-indigo-700' : 'text-gray-700'}`}>
                            {plan.label}
                          </span>
                          {selectedPlan.id === plan.id && <CheckCircle size={16} className="text-indigo-600" />}
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-2xl font-bold text-gray-900">
                            ${plan.price.toLocaleString()}
                          </span>
                          {plan.discount > 0 && (
                            <span className="text-xs text-gray-400 line-through">
                              ${plan.originalPrice.toLocaleString()}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500 mt-1">
                            ${Math.round(plan.price / plan.months).toLocaleString()} / mes
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Beneficios Incluidos</h5>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle size={14} className="text-green-500" />
                        <span>Posicionamiento prioritario en búsquedas</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle size={14} className="text-green-500" />
                        <span>Insignia "DESTACADO" en tu perfil</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle size={14} className="text-green-500" />
                        <span>Soporte prioritario 24/7</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleBuyVip}
                    className="w-full bg-[#009EE3] hover:bg-[#008ED0] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    Pagar ${selectedPlan.price.toLocaleString()} con Mercado Pago
                  </button>
                  
                  <p className="text-xs text-center text-gray-400">
                    Pago seguro procesado por Mercado Pago. Cancelación en cualquier momento.
                  </p>
                </div>
              )}

              {paymentStep === 'processing' && (
                <div className="text-center py-12">
                  <Loader2 size={48} className="text-[#009EE3] animate-spin mx-auto mb-6" />
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Procesando solicitud...</h4>
                  <p className="text-gray-500 text-sm">
                    Te estamos redirigiendo a la plataforma segura de Mercado Pago para completar tu suscripción {selectedPlan.label.toLowerCase()}.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
