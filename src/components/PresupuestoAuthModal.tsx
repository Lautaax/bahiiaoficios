import React, { useState } from 'react';
import { 
  X, Lock, UserPlus, LogIn, CheckCircle2, AlertCircle, 
  Sparkles, ShieldCheck, ArrowRight, Smartphone, Mail, KeyRound
} from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { Link } from 'react-router-dom';

interface PresupuestoAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  pendingBudgetSummary?: {
    titulo?: string;
    cliente?: string;
    total?: number;
    tareasCount?: number;
    materialesCount?: number;
  };
}

export const PresupuestoAuthModal: React.FC<PresupuestoAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  pendingBudgetSummary
}) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState<'profesional' | 'cliente'>('profesional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!nombre.trim()) {
          setError('Por favor ingresá tu nombre y apellido.');
          setLoading(false);
          return;
        }
        if (!email.trim() || !password) {
          setError('Completá email y contraseña.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres.');
          setLoading(false);
          return;
        }

        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: nombre.trim() });

        // Guardar documento inicial en Firestore
        const userDocRef = doc(db, 'usuarios', cred.user.uid);
        const userData = {
          uid: cred.user.uid,
          email: cred.user.email || email.trim(),
          nombre: nombre.trim(),
          rol: rol,
          telefono: telefono.trim() || '',
          ciudad: 'Bahía Blanca',
          zona: 'Todas',
          createdAt: serverTimestamp(),
          profesionalInfo: rol === 'profesional' ? {
            rubro: 'Construcción y Oficios',
            telefono: telefono.trim() || '',
            descripcion: 'Profesional verificado en Bahía Oficios'
          } : undefined
        };

        try {
          await setDoc(userDocRef, userData, { merge: true });
        } catch (dbErr) {
          console.warn('Advertencia guardando perfil en Firestore:', dbErr);
        }

        onSuccess({ ...userData, uid: cred.user.uid });
      } else {
        // Login
        if (!email.trim() || !password) {
          setError('Ingresá tu email y contraseña.');
          setLoading(false);
          return;
        }

        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const userDocRef = doc(db, 'usuarios', cred.user.uid);
        let userData: any = {
          uid: cred.user.uid,
          email: cred.user.email,
          nombre: cred.user.displayName || 'Usuario'
        };

        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            userData = { uid: cred.user.uid, ...snap.data() };
          }
        } catch {
          // ignore
        }

        onSuccess(userData);
      }
    } catch (err: any) {
      console.error('Error de autenticación en modal de presupuesto:', err);
      let msg = 'Ocurrió un error al procesar tu solicitud.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Este email ya está registrado. Por favor cambiá a la pestaña "Iniciar Sesión".';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        msg = 'Email o contraseña incorrectos.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña debe tener mínimo 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'El formato de email no es válido.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userDocRef = doc(db, 'usuarios', result.user.uid);
      const snap = await getDoc(userDocRef);
      
      let userData: any;
      if (!snap.exists()) {
        userData = {
          uid: result.user.uid,
          email: result.user.email || '',
          nombre: result.user.displayName || 'Usuario',
          rol: rol,
          ciudad: 'Bahía Blanca',
          zona: 'Todas',
          createdAt: serverTimestamp()
        };
        try {
          await setDoc(userDocRef, userData);
        } catch (dbErr) {
          console.warn('Error guardando usuario Google:', dbErr);
        }
      } else {
        userData = { uid: result.user.uid, ...snap.data() };
      }

      onSuccess(userData);
    } catch (err: any) {
      console.error('Error Google Sign-In:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('No se pudo iniciar sesión con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-6 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente de Bahía Oficios */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0f245c] via-[#163683] to-slate-900 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-700/80 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
              <Lock size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Paso Final • Guardar Presupuesto
              </span>
              <h3 id="auth-modal-title" className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
                Registrate para Descargar y Enviar
              </h3>
            </div>
          </div>

          <p className="text-xs text-blue-100/90 mt-2.5 leading-relaxed">
            Tu presupuesto y todos los cálculos cargados están <strong>100% seguros</strong> y no se perderán. Creá tu cuenta gratis para vincularlo a tu historial y compartirlo con tu cliente.
          </p>

          {/* Tarjeta resumen del presupuesto pendiente */}
          {pendingBudgetSummary && (
            <div className="mt-3.5 p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 flex items-center justify-between text-xs">
              <div className="truncate pr-2">
                <span className="text-[10px] text-blue-200 block uppercase font-bold">Presupuesto en curso:</span>
                <span className="font-bold text-white truncate block">
                  {pendingBudgetSummary.titulo || 'Presupuesto y Cómputo de Obra'}
                </span>
                {pendingBudgetSummary.cliente && (
                  <span className="text-[11px] text-blue-200/80 block">
                    Cliente: {pendingBudgetSummary.cliente}
                  </span>
                )}
              </div>
              {pendingBudgetSummary.total !== undefined && pendingBudgetSummary.total > 0 && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-amber-300 block font-bold">TOTAL</span>
                  <span className="text-sm font-black text-white">
                    ${pendingBudgetSummary.total.toLocaleString('es-AR')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selector de Pestañas: Registro / Login */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-5 pt-3">
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <UserPlus size={14} />
            <span>Crear Cuenta Gratis</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <LogIn size={14} />
            <span>Ya tengo Cuenta</span>
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-5 sm:p-6 space-y-4 text-slate-800 dark:text-slate-100">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Botón Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continuar con Google</span>
          </button>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span>o con tu correo electrónico</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Tu Nombre y Apellido:
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Marcelo Fernández"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Teléfono / WhatsApp:
                    </label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej: 2914123456"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Soy:
                    </label>
                    <select
                      value={rol}
                      onChange={(e) => setRol(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
                    >
                      <option value="profesional">👷 Trabajador / Profesional</option>
                      <option value="cliente">👤 Cliente / Particular</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Correo Electrónico:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tuemail@ejemplo.com"
                className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Contraseña:
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Guardando y verificando...</span>
              ) : mode === 'register' ? (
                <>
                  <span>Registrarme y Descargar PDF</span>
                  <ArrowRight size={14} />
                </>
              ) : (
                <>
                  <span>Iniciar Sesión y Descargar PDF</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Garantía de retención de datos */}
          <div className="pt-2 text-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck size={13} />
              Tus tareas, precios y cálculos se guardan automáticamente
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
