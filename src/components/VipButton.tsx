import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, CreditCard, X, CheckCircle, Loader2 } from 'lucide-react';

export const VipButton: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'init' | 'processing' | 'success'>('init');

  if (!currentUser || currentUser.rol !== 'profesional') {
    return null;
  }

  const isVip = currentUser.profesionalInfo?.isVip;

  const handleBuyVip = async () => {
    setLoading(true);
    setPaymentStep('processing');
    
    try {
      console.log("Iniciando flujo de pago para:", currentUser.uid);

      const response = await fetch('/api/create_preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: "Membresía VIP - Portal de Oficios",
          price: 5000,
          quantity: 1,
          userEmail: currentUser.email,
          redirectUrl: window.location.origin
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear la preferencia de pago');
      }

      const data = await response.json();
      
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error('No se recibió el link de pago');
      }
      
    } catch (error) {
      console.error("Error iniciando pago:", error);
      alert("Error al iniciar el pago. Asegúrate de configurar el TOKEN de Mercado Pago en el backend.");
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
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-center justify-between animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-full">
            <ShieldCheck className="text-amber-600" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-amber-900">Membresía VIP Activa</h3>
            <p className="text-amber-700 text-sm">Tu perfil aparece destacado en las búsquedas.</p>
          </div>
        </div>
        <span className="bg-amber-200 text-amber-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
          ACTIVO
        </span>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 relative">
            
            {/* Close Button */}
            {paymentStep !== 'processing' && (
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
              >
                <X size={20} />
              </button>
            )}

            {/* Header */}
            <div className="bg-[#009EE3] p-6 text-white text-center">
              <img 
                src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.18.9/mercadolibre/logo__large_plus.png" 
                alt="Mercado Pago" 
                className="h-8 mx-auto mb-2 filter brightness-0 invert"
              />
              <h3 className="font-bold text-lg">Checkout Pro</h3>
            </div>

            <div className="p-8">
              {paymentStep === 'init' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck size={32} className="text-amber-500" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">Membresía VIP Mensual</h4>
                    <p className="text-gray-500 text-sm mt-1">Acceso a destacados y más visibilidad</p>
                    <div className="mt-4 text-3xl font-bold text-gray-900">$5.000 <span className="text-sm font-normal text-gray-500">/ mes</span></div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <CheckCircle size={16} className="text-green-500" />
                      <span>Posicionamiento prioritario en búsquedas</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <CheckCircle size={16} className="text-green-500" />
                      <span>Insignia "DESTACADO" en tu perfil</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <CheckCircle size={16} className="text-green-500" />
                      <span>Soporte prioritario</span>
                    </div>
                  </div>

                  <button
                    onClick={handleBuyVip}
                    className="w-full bg-[#009EE3] hover:bg-[#008ED0] text-white font-bold py-3 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    Pagar con Mercado Pago
                  </button>
                  
                  <p className="text-xs text-center text-gray-400">
                    Serás redirigido a Mercado Pago para completar la compra.
                  </p>
                </div>
              )}

              {paymentStep === 'processing' && (
                <div className="text-center py-8">
                  <Loader2 size={48} className="text-[#009EE3] animate-spin mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-gray-900">Iniciando pago...</h4>
                  <p className="text-gray-500 text-sm mt-2">Te estamos redirigiendo a Mercado Pago.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
