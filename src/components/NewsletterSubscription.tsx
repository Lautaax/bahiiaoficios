import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface NewsletterSubscriptionProps {
  variant?: 'footer' | 'standalone' | 'card';
  className?: string;
}

export const NewsletterSubscription: React.FC<NewsletterSubscriptionProps> = ({
  variant = 'footer',
  className = ''
}) => {
  const [email, setEmail] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    'Consejos y mantenimiento',
    'Novedades y promociones en Bahía Blanca'
  ]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already_subscribed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const validateEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim().toLowerCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setStatus('error');
      setErrorMessage('Por favor, ingresá tu correo electrónico.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setStatus('error');
      setErrorMessage('Ingresá un formato de correo electrónico válido.');
      return;
    }

    setStatus('loading');

    try {
      // Check if already subscribed in newsletter collection
      const q = query(collection(db, 'newsletter'), where('email', '==', cleanEmail));
      const existingSnap = await getDocs(q);

      if (!existingSnap.empty) {
        setStatus('already_subscribed');
        return;
      }

      // Add subscriber to Firestore
      await addDoc(collection(db, 'newsletter'), {
        email: cleanEmail,
        ciudad: 'Bahía Blanca',
        intereses: selectedTopics,
        fechaSuscripcion: serverTimestamp(),
        activo: true,
        origen: 'footer_bahia_oficios',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      });

      setStatus('success');
      setEmail('');
    } catch (err: any) {
      console.error('Error al suscribir al newsletter:', err);
      setStatus('error');
      setErrorMessage(
        err?.message || 'Ocurrió un problema al registrar la suscripción. Por favor, intentá nuevamente.'
      );
    }
  };

  return (
    <div className={`w-full ${className}`} id="newsletter-subscription-box">
      <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-6 sm:p-8 transition-colors">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 mb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-2">
                <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
                <span>Novedades Bahía Blanca</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Sumate al Newsletter de Bahía Oficios
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                Recibí en tu correo consejos prácticos de mantenimiento, novedades sobre oficios verificados y promociones exclusivas en Bahía Blanca.
              </p>
            </div>

            <div className="hidden sm:flex items-center justify-center p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
              <Mail size={28} />
            </div>
          </div>

          {/* Success State */}
          {status === 'success' && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 animate-in fade-in duration-300 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-sm font-bold block">
                  ¡Suscripción confirmada con éxito!
                </strong>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Te hemos agregado a nuestra lista de Bahía Blanca. Pronto recibirás las mejores recomendaciones y novedades para tu hogar o comercio.
                </p>
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="mt-2 text-xs font-bold underline hover:text-emerald-950 dark:hover:text-white transition-colors"
                >
                  Suscribir otro correo
                </button>
              </div>
            </div>
          )}

          {/* Already Subscribed State */}
          {status === 'already_subscribed' && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 animate-in fade-in duration-300 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-sm font-bold block">
                  ¡Ya estás registrado en nuestro newsletter!
                </strong>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  El correo <span className="font-semibold">{email || 'ingresado'}</span> ya forma parte de nuestra comunidad en Bahía Blanca. No te preocupes, seguiremos enviándote las novedades.
                </p>
                <button
                  type="button"
                  onClick={() => { setStatus('idle'); setEmail(''); }}
                  className="mt-2 text-xs font-bold underline hover:text-amber-950 dark:hover:text-white transition-colors"
                >
                  Ingresar otro correo
                </button>
              </div>
            </div>
          )}

          {/* Input Form State (idle, loading, error) */}
          {status !== 'success' && status !== 'already_subscribed' && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Tu correo electrónico (ej. juan@gmail.com)"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-2xs"
                    disabled={status === 'loading'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                >
                  {status === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Suscribiendo...</span>
                    </>
                  ) : (
                    <>
                      <span>Suscribirme</span>
                      <Send size={15} />
                    </>
                  )}
                </button>
              </div>

              {/* Topics Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">
                  Temas de interés:
                </span>
                {[
                  'Consejos y mantenimiento',
                  'Novedades y promociones en Bahía Blanca',
                  'Profesionales recomendados'
                ].map((topic) => {
                  const isChecked = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={`text-xs px-2.5 py-1 rounded-xl font-medium transition-colors border ${
                        isChecked
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                          : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}{topic}
                    </button>
                  );
                })}
              </div>

              {/* Error Alert */}
              {status === 'error' && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Privacy note */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                <span>
                  No compartimos tu información. Podés cancelar tu suscripción en cualquier momento.
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
