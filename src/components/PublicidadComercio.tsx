import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Upload, CreditCard, CheckCircle, X, Loader2, Info, ArrowRight } from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import axios from 'axios';

interface AdPlan {
  id: string;
  months: number;
  price: number;
  originalPrice: number;
  discount: number;
  label: string;
}

const AD_PLANS: AdPlan[] = [
  { id: '1_month', months: 1, price: 15000, originalPrice: 15000, discount: 0, label: 'Mensual' },
  { id: '3_months', months: 3, price: 41400, originalPrice: 45000, discount: 8, label: 'Trimestral' },
  { id: '6_months', months: 6, price: 77400, originalPrice: 90000, discount: 14, label: 'Semestral' },
  { id: '12_months', months: 12, price: 144000, originalPrice: 180000, discount: 20, label: 'Anual' },
];

export const PublicidadComercio: React.FC = () => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [position, setPosition] = useState<'home_carousel' | 'sidebar'>('home_carousel');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<AdPlan>(AD_PLANS[0]);
  const [offersTradeDiscount, setOffersTradeDiscount] = useState(false);
  const [tradeDiscountDetails, setTradeDiscountDetails] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGoToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      setError('Debes subir una imagen para tu publicidad.');
      return;
    }
    setStep('payment');
  };

  const handlePayment = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');

    try {
      // 1. Upload Image
      let imageUrl = '';
      if (imageFile) {
        const storageRef = ref(storage, `ads_pending/${currentUser.uid}_${Date.now()}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      // 2. Create Ad record (pending payment)
      const adData = {
        title,
        description,
        link,
        position,
        imageUrl,
        active: false,
        paymentStatus: 'pending',
        businessUid: currentUser.uid,
        plan: selectedPlan.id,
        price: selectedPlan.price,
        offersTradeDiscount,
        tradeDiscountDetails: offersTradeDiscount ? tradeDiscountDetails : '',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'ads'), adData);

      // 3. Create Mercado Pago Preference
      const response = await axios.post('/api/create_preference', {
        title: `Publicidad ${selectedPlan.label} - Oficios Bahía`,
        price: selectedPlan.price,
        quantity: 1,
        userEmail: currentUser.email,
        redirectUrl: window.location.origin + '/dashboard',
        metadata: {
          userId: currentUser.uid,
          adId: docRef.id,
          type: 'ad_payment',
          months: selectedPlan.months
        }
      });

      if (response.data.init_point) {
        window.location.href = response.data.init_point;
      } else {
        throw new Error('No se pudo generar el link de pago.');
      }

    } catch (err: any) {
      console.error(err);
      setError('Error al procesar la solicitud. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-lg mb-4">
          <Megaphone className="text-white" size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Publicitá tu Comercio</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Llegá a miles de vecinos de Bahía Blanca. Tu marca en el carrusel principal o en banners estratégicos.
        </p>
      </div>

      {step === 'form' ? (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Info className="text-indigo-600" size={24} />
                Datos del Anuncio
              </h2>
              
              <form onSubmit={handleGoToPayment} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">Título del Anuncio</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: Pinturería El Centro - 20% OFF"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">Descripción Corta</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="Contanos qué querés destacar en pocas palabras..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">Link de Destino (Opcional)</label>
                  <input 
                    type="url" 
                    placeholder="https://tuweb.com o tu Instagram"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">Ubicación del Anuncio</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setPosition('home_carousel')}
                      className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${position === 'home_carousel' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-indigo-200'}`}
                    >
                      Carrusel Home
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPosition('sidebar')}
                      className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${position === 'sidebar' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-indigo-200'}`}
                    >
                      Banner Lateral
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className={offersTradeDiscount ? "text-indigo-600" : "text-gray-300"} size={20} />
                      <span className="text-sm font-bold text-gray-700">¿Ofrecés descuento al gremio?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOffersTradeDiscount(!offersTradeDiscount)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${offersTradeDiscount ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${offersTradeDiscount ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  {offersTradeDiscount && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <label className="block text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1 ml-1">Detalle del Descuento</label>
                      <input 
                        type="text" 
                        required={offersTradeDiscount}
                        placeholder="Ej: 10% OFF en materiales a profesionales"
                        className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={tradeDiscountDetails}
                        onChange={(e) => setTradeDiscountDetails(e.target.value)}
                      />
                      <p className="mt-2 text-[10px] text-indigo-600 leading-tight">
                        * Para acceder, el profesional deberá mencionar que viene de <strong>Bahía Oficios</strong> y mostrar su perfil registrado.
                      </p>
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 group"
                >
                  Siguiente: Elegir Plan
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </div>

            <div className="p-8 md:p-12 bg-gray-50/50">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Upload className="text-indigo-600" size={24} />
                Imagen del Anuncio
              </h2>

              <div className="space-y-6">
                <div className="relative aspect-[16/9] bg-white rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden group hover:border-indigo-400 transition-colors">
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                      <Upload className="text-gray-400 mb-2 group-hover:text-indigo-500 transition-colors" size={32} />
                      <span className="text-sm font-bold text-gray-500 group-hover:text-indigo-600 transition-colors">Subir Imagen</span>
                      <span className="text-[10px] text-gray-400 mt-1">Recomendado: 1200x675px</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  )}
                </div>

                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Previsualización</h4>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                    <h5 className="font-bold text-gray-900 text-sm truncate">{title || 'Título de tu anuncio'}</h5>
                    <p className="text-gray-500 text-[10px] line-clamp-1">{description || 'Descripción corta de lo que ofrecés...'}</p>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg flex items-center gap-2">
                    <X size={14} /> {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 max-w-2xl mx-auto border border-gray-100 animate-in zoom-in-95 duration-300">
          <button 
            onClick={() => setStep('form')}
            className="text-gray-500 hover:text-indigo-600 font-bold text-sm mb-8 flex items-center gap-1"
          >
            <X size={16} /> Volver a editar datos
          </button>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Elegí tu Plan de Publicidad</h2>
            <p className="text-gray-500 mt-2">Ahorrá hasta un 20% con planes trimestrales o anuales</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {AD_PLANS.map((plan) => (
              <div 
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`relative cursor-pointer p-5 rounded-2xl border-2 transition-all duration-200 ${selectedPlan.id === plan.id ? 'border-indigo-600 bg-indigo-50 shadow-md scale-[1.02]' : 'border-gray-100 bg-gray-50 hover:border-indigo-200'}`}
              >
                {plan.discount > 0 && (
                  <div className="absolute -top-3 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                    -{plan.discount}% OFF
                  </div>
                )}
                <div className="flex justify-between items-start mb-3">
                  <span className="font-bold text-gray-900">{plan.label}</span>
                  {selectedPlan.id === plan.id && <CheckCircle size={18} className="text-indigo-600" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-gray-900">${plan.price.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-500 mt-1">${Math.round(plan.price / plan.months).toLocaleString()} / mes</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 mb-10 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Plan seleccionado:</span>
              <span className="font-bold text-gray-900">{selectedPlan.label}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Ubicación:</span>
              <span className="font-bold text-gray-900">{position === 'home_carousel' ? 'Carrusel Home' : 'Banner Lateral'}</span>
            </div>
            <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Total a pagar:</span>
              <span className="text-2xl font-black text-indigo-600">${selectedPlan.price.toLocaleString()}</span>
            </div>
          </div>

          <button 
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-[#009EE3] hover:bg-[#008ED0] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <CreditCard size={24} />
                Pagar con Mercado Pago
              </>
            )}
          </button>
          
          <p className="text-center text-[10px] text-gray-400 mt-4">
            Tu anuncio será revisado por un administrador después del pago. <br />
            Al pagar aceptás nuestros términos y condiciones de publicidad.
          </p>
        </div>
      )}
    </div>
  );
};
