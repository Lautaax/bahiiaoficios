import React, { useState, useMemo, useEffect } from 'react';
import { MapPin, LogOut, User as UserIcon, Settings, MessageSquare, Users, Eye, ShieldCheck, Briefcase, Heart, HelpCircle } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { collection, getCountFromServer, doc, getDoc, setDoc, increment, updateDoc } from 'firebase/firestore';
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
import { ProfessionLanding } from './components/ProfessionLanding';
import { TrabajosSolicitados } from './components/TrabajosSolicitados';
import { Footer } from './components/Footer';

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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    try {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
    } catch (e) {
      console.warn('Install prompt error:', e);
    } finally {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/70 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Main Navigation */}
        <div className="flex items-center gap-3 sm:gap-6">
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

          <nav className="hidden sm:flex items-center gap-1 sm:gap-2">
            <Link 
              to="/trabajos" 
              id="onboarding-nav-jobs" 
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              <Briefcase size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span>Trabajos Solicitados</span>
            </Link>

            <Link 
              to="/blog" 
              className="hidden md:inline-flex items-center text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              Blog y Consejos
            </Link>
          </nav>
        </div>

        {/* Right: Actions, Tour Trigger & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Friendly, non-invasive tutorial helper */}
          <button
            type="button"
            id="btn-nav-onboarding-tour"
            onClick={triggerOnboardingTour}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100/80 hover:bg-indigo-50 dark:bg-slate-800/80 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-xl transition-all"
            title="Ver guía interactiva de bienvenida"
          >
            <HelpCircle size={15} className="text-indigo-600 dark:text-indigo-400" />
            <span className="hidden md:inline">¿Cómo funciona?</span>
          </button>

          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="hidden lg:inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-200/60 dark:border-indigo-800/60"
            >
              🚀 Instalar App
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link 
                to="/dashboard" 
                className="hidden md:inline-flex text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 rounded-lg transition-colors"
              >
                Directorio
              </Link>

              {currentUser.rol === 'profesional' && (
                <Link 
                  to="/beneficios" 
                  className="hidden md:inline-flex text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 rounded-lg transition-colors"
                >
                  Beneficios
                </Link>
              )}

              {currentUser.isAdmin && (
                <Link 
                  to="/admin" 
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900 px-2.5 py-1 rounded-xl transition-colors"
                >
                  <ShieldCheck size={14} />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}

              <Link 
                to="/profile" 
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60"
              >
                <div className="relative">
                  {currentUser.fotoUrl ? (
                    <CachedImage 
                      src={currentUser.fotoUrl} 
                      alt="Perfil" 
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
                      containerClassName="w-8 h-8 rounded-full shrink-0" 
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      <UserIcon size={16} className="text-slate-600 dark:text-slate-300" />
                    </div>
                  )}
                </div>
                <span className="hidden lg:inline">{currentUser?.nombre ? currentUser.nombre.split(' ')[0] : 'Mi Cuenta'}</span>
              </Link>
              
              <div className="flex items-center gap-1">
                <Link
                  to="/favoritos"
                  className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 relative rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                  title="Mis Profesionales Favoritos"
                >
                  <Heart size={18} className={Array.isArray(currentUser.favoritos) && currentUser.favoritos.length > 0 ? "fill-rose-500 text-rose-500" : ""} />
                  {Array.isArray(currentUser.favoritos) && currentUser.favoritos.length > 0 && (
                    <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                      {currentUser.favoritos.length}
                    </span>
                  )}
                </Link>

                <NotificationsDropdown />
                <ChatBadge />

                <Link 
                  to={currentUser.rol === 'profesional' ? "/dashboard-profesional" : "/profile"} 
                  className="hidden sm:inline-flex p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors" 
                  title={currentUser.rol === 'profesional' ? "Mi Panel Profesional" : "Editar Perfil"}
                >
                  <Settings size={18} />
                </Link>

                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link 
                to="/signup" 
                className="hidden sm:inline-flex text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
              >
                Soy Profesional
              </Link>
              <Link 
                to="/login" 
                className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-95"
              >
                Ingresar
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState({ users: 0, visits: 0 });

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        // Increment site visits safely
        const statsRef = doc(db, 'siteStats', 'global');
        const statsDoc = await getDoc(statsRef);
        
        let currentVisits = 0;
        if (!statsDoc.exists()) {
          await setDoc(statsRef, { visits: 1 });
          currentVisits = 1;
        } else {
          const statsData = statsDoc.data() || {};
          const prevVisits = typeof statsData.visits === 'number' ? statsData.visits : 0;
          if (!safeSessionStorage.getItem('siteVisited')) {
            await updateDoc(statsRef, { visits: increment(1) });
            currentVisits = prevVisits + 1;
            safeSessionStorage.setItem('siteVisited', 'true');
          } else {
            currentVisits = prevVisits;
          }
        }

        // Get user count safely
        const coll = collection(db, 'usuarios');
        const snapshot = await getCountFromServer(coll);
        const userCount = snapshot.data().count;

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
  
  return (
    <>
      <NotificationListener />
      <FeedbackWidget />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        
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

        <Route path="/professions/:profession" element={
          <Layout>
            <ProfessionLanding />
          </Layout>
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
      </Routes>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <AppContent />
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
