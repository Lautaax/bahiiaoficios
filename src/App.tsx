import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  MapPin, LogOut, User as UserIcon, Settings, MessageSquare, Users, Eye, 
  ShieldCheck, Briefcase, Heart, HelpCircle, Smartphone, Bell, Wrench, 
  FileText, Calculator, Menu, ChevronDown, X, Sparkles, Search as SearchIcon,
  FolderOpen, ExternalLink, HardHat, Calendar, LayoutDashboard
} from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { collection, getCountFromServer, doc, getDoc, setDoc, increment, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { NotificationsDropdown } from './components/NotificationsDropdown';
import { Login } from './components/Login';
import { SignUp } from './components/SignUp';
import { PrivateRoute } from './components/PrivateRoute';
import { Home } from './components/Home';
import { Search } from './components/Search';
import { Dashboard } from './components/Dashboard';
import { VipButton } from './components/VipButton';
import { Profile } from './components/Profile';
import { PublicProfile } from './components/PublicProfile';
import { CompleteProfile } from './components/CompleteProfile';
import { Chat } from './components/Chat';
import { ChatList } from './components/ChatList';
import { ProfessionalDashboard } from './components/ProfessionalDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { QuoteRequestForm } from './components/QuoteRequestForm';
import { Blog } from './components/Blog';
import { BlogPost } from './components/BlogPost';
import { Terms } from './components/Terms';
import { Privacy } from './components/Privacy';
import { Help } from './components/Help';
import { TradeDiscounts } from './components/TradeDiscounts';
import { PublicidadComercio } from './components/PublicidadComercio';
import { NotificationListener } from './components/NotificationListener';
import { CachedImage } from './components/CachedImage';
import { SemMarketingKit } from './components/SemMarketingKit';
import { TrabajosSolicitados } from './components/TrabajosSolicitados';
import { Footer } from './components/Footer';
import { triggerNotificationPermissionPrompt } from './components/NotificationPermissionModal';
import { HerramientasMarketplace } from './components/HerramientasMarketplace';
import { ReviewReminderModal } from './components/ReviewReminderModal';
import { CalculadoraCostosManoObra } from './components/CalculadoraCostosManoObra';
import { MisPresupuestos } from './components/MisPresupuestos';
import { PresupuestarPage } from './components/PresupuestarPage';
import { BolsaEmpleoAyudantes } from './components/BolsaEmpleoAyudantes';
import { MantenimientoPreventivo } from './components/MantenimientoPreventivo';
import { ForoConsultasTecnicas } from './components/ForoConsultasTecnicas';
import { NavigationLoadingProvider } from './context/NavigationLoadingContext';
import { ServiceLandingSkeleton } from './components/ServiceLandingSkeleton';

// Lazy-loaded modal and landing sub-components to optimize bundle and avoid navigation flicker
const ContratoPresupuestoModal = React.lazy(() => 
  import('./components/ContratoPresupuestoModal').then(m => ({ default: m.ContratoPresupuestoModal }))
);
const InstallAppModal = React.lazy(() => 
  import('./components/InstallAppModal').then(m => ({ default: m.InstallAppModal }))
);
const ServiceLanding = React.lazy(() => 
  import('./components/ServiceLanding').then(m => ({ default: m.ServiceLanding }))
);

import { ChatBadge } from './components/ChatBadge';
import { HelpChatbot } from './components/HelpChatbot';
import { FeedbackWidget } from './components/FeedbackWidget';
import { GuidedOnboarding, triggerOnboardingTour } from './components/GuidedOnboarding';
import { ErrorBoundary } from './components/ErrorBoundary';
import { safeSessionStorage } from './utils/storage';
import { useAnalytics } from './hooks/useAnalytics';

function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const drawerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setToolsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMobileMenuSmoothly = (callback?: () => void) => {
    if (drawerTimeoutRef.current) {
      clearTimeout(drawerTimeoutRef.current);
    }
    setIsDrawerClosing(true);
    drawerTimeoutRef.current = setTimeout(() => {
      setMobileMenuOpen(false);
      setIsDrawerClosing(false);
      if (callback) callback();
    }, 200);
  };

  const handleDrawerLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    e.preventDefault();
    closeMobileMenuSmoothly(() => {
      navigate(to);
    });
  };

  // Lock body scroll and handle Escape key when mobile menu is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMobileMenuSmoothly();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (drawerTimeoutRef.current) {
        clearTimeout(drawerTimeoutRef.current);
      }
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/70 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="bg-indigo-600 group-hover:bg-indigo-700 text-white p-2 rounded-xl shadow-xs transition-colors shrink-0">
              <MapPin size={18} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                Bahía Oficios
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Bahía Blanca
              </p>
            </div>
          </Link>

          {/* Clean Primary Navigation */}
          <nav className="hidden lg:flex items-center gap-1.5">
            <Link 
              to="/trabajos" 
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
            >
              <Briefcase size={14} strokeWidth={1.8} className="text-slate-400 dark:text-slate-500" />
              <span>Trabajos</span>
            </Link>

            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
            >
              <SearchIcon size={14} strokeWidth={1.8} className="text-slate-400 dark:text-slate-500" />
              <span>Directorio</span>
            </Link>

            {/* Clean Herramientas Popover Dropdown */}
            <div className="relative" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  toolsMenuOpen 
                    ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                }`}
                aria-expanded={toolsMenuOpen}
                aria-haspopup="true"
              >
                <Wrench size={14} strokeWidth={1.8} className="text-slate-400 dark:text-slate-500" />
                <span>Herramientas</span>
                <ChevronDown size={12} strokeWidth={2} className={`transition-transform duration-200 text-slate-400 ${toolsMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {toolsMenuOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Section: Herramientas de Trabajo */}
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Herramientas de Trabajo
                  </div>

                  <Link
                    to="/calculadora-costos"
                    onClick={() => setToolsMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors shrink-0">
                      <Calculator size={14} strokeWidth={1.8} />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Calculadora de Costos
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Mano de obra y tareas en Bahía
                      </span>
                    </div>
                  </Link>

                  <Link
                    to="/ayudantes-obra"
                    onClick={() => setToolsMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 transition-colors shrink-0">
                      <HardHat size={14} strokeWidth={1.8} />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        Bolsa de Ayudantes de Obra
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Peones y aprendices para contratistas y MMO
                      </span>
                    </div>
                  </Link>

                  <Link
                    to="/mantenimiento-preventivo"
                    onClick={() => setToolsMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/50 transition-colors shrink-0">
                      <Calendar size={14} strokeWidth={1.8} />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        Mantenimiento Preventivo
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Alertas estacionales de gas, techos y tanques
                      </span>
                    </div>
                  </Link>

                  <Link
                    to="/herramientas"
                    onClick={() => setToolsMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 transition-colors shrink-0">
                      <Wrench size={14} strokeWidth={1.8} />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        Herramientas Usadas
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Compra y venta entre colegas de oficio
                      </span>
                    </div>
                  </Link>

                  <Link
                    to="/foro-tecnico"
                    onClick={() => setToolsMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors shrink-0">
                      <MessageSquare size={14} strokeWidth={1.8} />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Foro Técnico entre Oficios
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Salinidad en White, pampero y tosca
                      </span>
                    </div>
                  </Link>

                  {/* Section: Recursos y Comunidad */}
                  <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Recursos & Seguridad
                  </div>

                  <Link
                    to="/blog"
                    onClick={() => setToolsMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors shrink-0">
                      <Sparkles size={14} strokeWidth={1.8} />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        Blog de Oficios
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Guías de mantenimiento del hogar
                      </span>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setToolsMenuOpen(false);
                      setShowInstallModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer text-left"
                  >
                    <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/50 transition-colors shrink-0">
                      <Smartphone size={14} strokeWidth={1.8} />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        Instalar App Móvil
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Acceso directo estilo APK en tu celular
                      </span>
                    </div>
                  </button>

                  <Link
                    to="/ayuda"
                    onClick={() => setToolsMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors shrink-0">
                      <HelpCircle size={14} strokeWidth={1.8} />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Seguridad & Ayuda
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Consejos de contratación y mediación
                      </span>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {currentUser ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              {currentUser.isAdmin && (
                <Link 
                  to="/admin" 
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200/80 dark:border-rose-900/60 px-2 py-1 rounded-lg transition-colors"
                >
                  <ShieldCheck size={13} strokeWidth={2} />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}

              <Link
                to="/favoritos"
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 relative rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                title="Mis Profesionales Favoritos"
                aria-label="Mis Favoritos"
              >
                <Heart size={16} strokeWidth={1.8} className={Array.isArray(currentUser.favoritos) && currentUser.favoritos.length > 0 ? "fill-rose-500 text-rose-500" : ""} />
                {Array.isArray(currentUser.favoritos) && currentUser.favoritos.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-rose-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                    {currentUser.favoritos.length}
                  </span>
                )}
              </Link>

              <NotificationsDropdown />
              <ChatBadge />

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold p-1 pr-2 rounded-xl transition-all cursor-pointer ${
                    userMenuOpen
                      ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                      : 'text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                  }`}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  title="Menú de Usuario y Mi Perfil"
                >
                  {currentUser.fotoUrl ? (
                    <CachedImage 
                      src={currentUser.fotoUrl} 
                      alt="Perfil" 
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
                      containerClassName="w-7 h-7 rounded-full shrink-0" 
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <UserIcon size={14} strokeWidth={1.8} />
                    </div>
                  )}
                  <span className="hidden sm:inline max-w-[90px] truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                    {currentUser?.nombre ? currentUser.nombre.split(' ')[0] : 'Mi Perfil'}
                  </span>
                  <ChevronDown size={12} strokeWidth={2} className={`transition-transform duration-200 text-slate-400 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header: User Info Card */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 mb-2">
                      <div className="flex items-center gap-3">
                        {currentUser.fotoUrl ? (
                          <CachedImage 
                            src={currentUser.fotoUrl} 
                            alt={currentUser.nombre || 'Perfil'} 
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
                            containerClassName="w-10 h-10 rounded-full shrink-0" 
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0 font-bold text-sm">
                            {(currentUser.nombre || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-black text-slate-900 dark:text-white truncate">
                            {currentUser.nombre || 'Usuario'}
                          </span>
                          <span className="block text-[11px] text-slate-400 truncate">
                            {currentUser.email}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              currentUser.rol === 'profesional'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                            }`}>
                              {currentUser.rol === 'profesional' ? 'Profesional' : 'Cliente / Vecino'}
                            </span>
                            {currentUser.zona && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {currentUser.zona}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section: Mi Actividad & Presupuestos (PARTE DEL USUARIO) */}
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Mi Actividad & Presupuestos
                    </div>

                    <Link
                      to="/mis-presupuestos"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#0f245c] dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors shrink-0">
                        <FolderOpen size={15} strokeWidth={1.8} />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          Mis Presupuestos
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Historial de cotizaciones, cómputos y PDFs
                        </span>
                      </div>
                    </Link>

                    <Link
                      to="/chats"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors shrink-0">
                        <MessageSquare size={15} strokeWidth={1.8} />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Mis Chats & Consultas
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Historial de mensajes con profesionales
                        </span>
                      </div>
                    </Link>

                    <Link
                      to="/presupuestar"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors shrink-0">
                        <FileText size={15} strokeWidth={1.8} />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          Presupuestar Online
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Crear y calcular presupuesto en línea
                        </span>
                      </div>
                    </Link>

                    <Link
                      to="/favoritos"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/50 transition-colors shrink-0">
                        <Heart size={15} strokeWidth={1.8} />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                          Mis Profesionales Favoritos
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {Array.isArray(currentUser.favoritos) ? currentUser.favoritos.length : 0} profesionales guardados
                        </span>
                      </div>
                    </Link>

                    {/* Section: Configuración de Perfil */}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Mi Perfil
                    </div>

                    {currentUser.rol === 'profesional' && (
                      <>
                        <Link
                          to="/dashboard-profesional"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                        >
                          <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors shrink-0">
                            <LayoutDashboard size={15} strokeWidth={1.8} />
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              Panel Profesional
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              Métricas, solicitudes recibidas y reputación
                            </span>
                          </div>
                        </Link>

                        <Link
                          to={`/profesional/${currentUser.uid}`}
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                        >
                          <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/50 transition-colors shrink-0">
                            <Eye size={15} strokeWidth={1.8} />
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                              Ver Mi Ficha Pública
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              Cómo te encuentran los vecinos en la web
                            </span>
                          </div>
                        </Link>
                      </>
                    )}

                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors shrink-0">
                        <UserIcon size={15} strokeWidth={1.8} />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Editar Mi Perfil & Ajustes
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Zona, teléfono, foto y preferencias
                        </span>
                      </div>
                    </Link>

                    {/* Logout */}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-xs font-bold cursor-pointer"
                      >
                        <LogOut size={15} strokeWidth={1.8} />
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ChatBadge />
              <Link 
                to="/signup" 
                className="hidden sm:inline-flex text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-1.5 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
              >
                Soy Profesional
              </Link>
              <Link 
                to="/login" 
                className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95"
              >
                Ingresar
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Abrir menú de navegación"
          >
            {mobileMenuOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-150 shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Section: Mi Perfil & Actividades del Usuario (PARTE DEL USUARIO) */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3">
              Mi Cuenta & Actividades
            </span>
            {currentUser ? (
              <>
                <Link
                  to={currentUser.rol === 'profesional' ? "/dashboard-profesional" : "/profile"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80"
                >
                  {currentUser.fotoUrl ? (
                    <CachedImage 
                      src={currentUser.fotoUrl} 
                      alt="Perfil" 
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
                      containerClassName="w-8 h-8 rounded-full shrink-0" 
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                      <UserIcon size={16} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.nombre || 'Mi Perfil'}
                    </span>
                    <span className="block text-[10px] text-slate-400 truncate">
                      {currentUser.rol === 'profesional' ? 'Profesional' : 'Cliente / Vecino'} • {currentUser.zona || 'Bahía Blanca'}
                    </span>
                  </div>
                </Link>

                <Link
                  to="/mis-presupuestos"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <FolderOpen size={15} strokeWidth={1.8} className="text-blue-600 shrink-0" />
                  <span>Mis Presupuestos (Historial y PDFs)</span>
                </Link>

                <Link
                  to="/chats"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <MessageSquare size={15} strokeWidth={1.8} className="text-indigo-600 shrink-0" />
                  <span>Mis Chats & Consultas</span>
                </Link>

                <Link
                  to="/presupuestar"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <FileText size={15} strokeWidth={1.8} className="text-emerald-600 shrink-0" />
                  <span>Presupuestar Online</span>
                </Link>

                <Link
                  to="/favoritos"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Heart size={15} strokeWidth={1.8} className="text-rose-500 shrink-0" />
                  <span>Mis Profesionales Favoritos</span>
                </Link>

                {currentUser.rol === 'profesional' && (
                  <Link
                    to="/dashboard-profesional"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <LayoutDashboard size={15} strokeWidth={1.8} className="text-purple-600 shrink-0" />
                    <span>Panel Profesional</span>
                  </Link>
                )}

                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <UserIcon size={15} strokeWidth={1.8} className="text-slate-400 shrink-0" />
                  <span>Editar Mi Perfil & Ajustes</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left transition-colors cursor-pointer"
                >
                  <LogOut size={15} strokeWidth={1.8} className="shrink-0" />
                  <span>Cerrar Sesión</span>
                </button>
              </>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <Link
                  to="/presupuestar"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                >
                  <FileText size={15} strokeWidth={1.8} className="text-emerald-600 shrink-0" />
                  <span>Presupuestar Online</span>
                </Link>
                <Link
                  to="/mis-presupuestos"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                >
                  <FolderOpen size={15} strokeWidth={1.8} className="text-blue-600 shrink-0" />
                  <span>Mis Presupuestos (Historial)</span>
                </Link>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2 px-3 rounded-xl bg-indigo-600 text-white font-bold text-xs text-center"
                  >
                    Ingresar
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs text-center"
                  >
                    Registrarme
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Section: Explorar */}
          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3">
              Explorar
            </span>
            <Link
              to="/trabajos"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Briefcase size={15} strokeWidth={1.8} className="text-indigo-600 shrink-0" />
              <span>Trabajos Solicitados</span>
            </Link>

            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <SearchIcon size={15} strokeWidth={1.8} className="text-slate-500 shrink-0" />
              <span>Directorio de Profesionales</span>
            </Link>
          </div>

          {/* Section: Herramientas de Trabajo */}
          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3">
              Herramientas de Trabajo
            </span>
            <Link
              to="/calculadora-costos"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Calculator size={15} strokeWidth={1.8} className="text-indigo-600 shrink-0" />
              <span>Calculadora de Mano de Obra</span>
            </Link>

            <Link
              to="/ayudantes-obra"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <HardHat size={15} strokeWidth={1.8} className="text-amber-500 shrink-0" />
              <span>Bolsa de Ayudantes de Obra</span>
            </Link>

            <Link
              to="/mantenimiento-preventivo"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Calendar size={15} strokeWidth={1.8} className="text-sky-500 shrink-0" />
              <span>Recordatorios de Mantenimiento</span>
            </Link>

            <Link
              to="/herramientas"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Wrench size={15} strokeWidth={1.8} className="text-amber-500 shrink-0" />
              <span>Bolsa de Herramientas Usadas</span>
            </Link>

            <Link
              to="/foro-tecnico"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <MessageSquare size={15} strokeWidth={1.8} className="text-indigo-600 shrink-0" />
              <span>Foro Técnico entre Oficios</span>
            </Link>
          </div>

          {/* Section: Recursos & Soporte */}
          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3">
              Recursos & Soporte
            </span>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowInstallModal(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-700 dark:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
            >
              <Smartphone size={15} strokeWidth={1.8} className="text-sky-600 shrink-0" />
              <span>Instalar App Móvil / APK</span>
            </button>

            <Link
              to="/blog"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Sparkles size={15} strokeWidth={1.8} className="text-purple-500 shrink-0" />
              <span>Blog de Oficios & Guías</span>
            </Link>

            <Link
              to="/ayuda"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <HelpCircle size={15} strokeWidth={1.8} className="text-slate-500 dark:text-slate-400 shrink-0" />
              <span>Centro de Ayuda & Seguridad</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                triggerOnboardingTour();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
            >
              <HelpCircle size={15} strokeWidth={1.8} className="text-indigo-400 shrink-0" />
              <span>Guía paso a paso: ¿Cómo funciona?</span>
            </button>
          </div>
        </div>
      )}

      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />

      <ContratoPresupuestoModal
        isOpen={showContratoModal}
        onClose={() => setShowContratoModal(false)}
      />
    </header>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState({ users: 46, visits: 3528 });

  useEffect(() => {
    let isMounted = true;
    const HISTORICAL_VISITS_BASELINE = 3528;
    const HISTORICAL_USERS_BASELINE = 46;

    const fetchStats = async () => {
      try {
        const statsRef = doc(db, 'siteStats', 'global');
        const statsDoc = await getDoc(statsRef);
        
        const statsData = statsDoc.exists() ? (statsDoc.data() || {}) : {};
        const recordedVisits = typeof statsData.visits === 'number' ? statsData.visits : 0;
        const baseVisits = Math.max(recordedVisits, HISTORICAL_VISITS_BASELINE);
        
        let currentVisits = baseVisits;
        
        if (!safeSessionStorage.getItem('siteVisited')) {
          currentVisits = baseVisits + 1;
          await setDoc(statsRef, { 
            visits: currentVisits,
            lastVisitAt: serverTimestamp()
          }, { merge: true });
          safeSessionStorage.setItem('siteVisited', 'true');
          
          // Server ping for adblocker resilience
          fetch('/api/analytics/pageview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pathname: window.location.pathname }),
            keepalive: true
          }).catch(() => {});
        }

        // Get user count safely
        let userCount = HISTORICAL_USERS_BASELINE;
        try {
          const coll = collection(db, 'usuarios');
          const snapshot = await getCountFromServer(coll);
          userCount = Math.max(snapshot.data().count || 0, HISTORICAL_USERS_BASELINE);
        } catch {
          // fallback to baseline
        }

        if (isMounted) {
          setStats({ users: userCount, visits: currentVisits });
        }
      } catch (error) {
        console.warn("Notice: could not load site stats:", error);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-x-hidden flex flex-col">
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      <HelpChatbot />
      <GuidedOnboarding />
      {/* Footer */}
      <Footer stats={stats} />
    </div>
  );
}

function AppContent() {
  useAnalytics();
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Consistent callback when authentication succeeds
  const handleAuthSuccess = (_user: any, targetUrl: string) => {
    navigate(targetUrl, { replace: true });
  };

  // Robust loading state: prevents white screen flicker while Firebase Auth state is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-none animate-pulse mb-4">
          B
        </div>
        <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-semibold text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <span>Iniciando sesión segura en Bahía Oficios...</span>
        </div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary>
      <NotificationListener />
      <ReviewReminderModal />
      <FeedbackWidget />
      <Routes>
        <Route path="/login" element={<Login onSuccess={handleAuthSuccess} />} />
        <Route path="/signup" element={<SignUp onSuccess={handleAuthSuccess} />} />
        
        <Route path="/complete-profile" element={
          <PrivateRoute allowNewUser={true}>
            <CompleteProfile />
          </PrivateRoute>
        } />

        <Route path="/" element={
          <Layout>
            <Home />
          </Layout>
        } />

        <Route path="/search" element={
          <Layout>
            <Search />
          </Layout>
        } />

        <Route path="/profesional/:slug" element={
          <Layout>
            <PublicProfile />
          </Layout>
        } />

        <Route path="/rubro/:profession" element={
          <Layout>
            <React.Suspense fallback={<ServiceLandingSkeleton />}>
              <ServiceLanding />
            </React.Suspense>
          </Layout>
        } />

        <Route path="/profesion/:profession" element={
          <Layout>
            <React.Suspense fallback={<ServiceLandingSkeleton />}>
              <ServiceLanding />
            </React.Suspense>
          </Layout>
        } />

        <Route path="/professions/:profession" element={
          <Layout>
            <React.Suspense fallback={<ServiceLandingSkeleton />}>
              <ServiceLanding />
            </React.Suspense>
          </Layout>
        } />

        <Route path="/zona/:profession" element={
          <Layout>
            <React.Suspense fallback={<ServiceLandingSkeleton />}>
              <ServiceLanding />
            </React.Suspense>
          </Layout>
        } />

        <Route path="/sem-marketing" element={
          <PrivateRoute adminOnly={true}>
            <Layout>
              <SemMarketingKit />
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/dashboard" element={
          <Layout>
            <Dashboard />
          </Layout>
        } />
        
        <Route path="/terms" element={
          <Layout>
            <Terms />
          </Layout>
        } />

        <Route path="/privacy" element={
          <Layout>
            <Privacy />
          </Layout>
        } />

        <Route path="/help" element={
          <Layout>
            <Help />
          </Layout>
        } />

        <Route path="/profile" element={
          <PrivateRoute>
            <Layout>
              <div className="max-w-7xl mx-auto px-4 py-8">
                <Profile />
              </div>
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/favoritos" element={
          <PrivateRoute>
            <Layout>
              <div className="max-w-7xl mx-auto px-4 py-8">
                <Profile initialSection="favoritos" />
              </div>
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/chats" element={
          <PrivateRoute>
            <Layout>
              <ChatList />
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/chat/:chatId" element={
          <PrivateRoute>
            <Layout>
              <Chat />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/dashboard-profesional" element={
          <PrivateRoute>
            <Layout>
              <ProfessionalDashboard />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/admin" element={
          <PrivateRoute>
            <Layout>
              <AdminDashboard />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/solicitar-presupuesto" element={
          <Layout>
            <div className="py-8">
              <QuoteRequestForm />
            </div>
          </Layout>
        } />
        
        <Route path="/blog" element={
          <Layout>
            <Blog />
          </Layout>
        } />
        
        <Route path="/blog/:id" element={
          <Layout>
            <BlogPost />
          </Layout>
        } />
        
        <Route path="/beneficios" element={
          <Layout>
            <TradeDiscounts />
          </Layout>
        } />
        
        <Route path="/publicitar" element={
          <Layout>
            <PublicidadComercio />
          </Layout>
        } />

        <Route path="/trabajos" element={
          <Layout>
            <TrabajosSolicitados />
          </Layout>
        } />

        <Route path="/herramientas" element={
          <Layout>
            <HerramientasMarketplace />
          </Layout>
        } />

        <Route path="/calculadora-costos" element={
          <Layout>
            <CalculadoraCostosManoObra />
          </Layout>
        } />

        <Route path="/calculadora" element={
          <Layout>
            <CalculadoraCostosManoObra />
          </Layout>
        } />

        <Route path="/mis-presupuestos" element={
          <Layout>
            <MisPresupuestos />
          </Layout>
        } />

        <Route path="/presupuestar" element={
          <Layout>
            <PresupuestarPage />
          </Layout>
        } />

        <Route path="/ayudantes-obra" element={
          <Layout>
            <BolsaEmpleoAyudantes />
          </Layout>
        } />

        <Route path="/bolsa-empleo" element={
          <Layout>
            <BolsaEmpleoAyudantes />
          </Layout>
        } />

        <Route path="/mantenimiento-preventivo" element={
          <Layout>
            <MantenimientoPreventivo />
          </Layout>
        } />

        <Route path="/foro-tecnico" element={
          <Layout>
            <ForoConsultasTecnicas />
          </Layout>
        } />

        <Route path="/foro-consultas" element={
          <Layout>
            <ForoConsultasTecnicas />
          </Layout>
        } />
      </Routes>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <NavigationLoadingProvider>
              <AppContent />
            </NavigationLoadingProvider>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
