import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs, orderBy, arrayUnion, limit } from 'firebase/firestore';
import { Eye, MessageSquare, Clock, ShieldCheck, AlertCircle, Send, LayoutDashboard, UserCircle, BarChart3, ClipboardList, Star, ChevronRight, Menu, X, Bell, Settings, LogOut, MapPin, CheckCircle, MessageCircle, Briefcase, CreditCard, Tag } from 'lucide-react';
import { VipButton } from './VipButton';
import { Link, useNavigate } from 'react-router-dom';
import { ProfessionalOnboarding } from './ProfessionalOnboarding';
import { Profile } from './Profile';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

type TabType = 'resumen' | 'perfil' | 'estadisticas' | 'pedidos' | 'reseñas';

export const ProfessionalDashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const [activeProfileSection, setActiveProfileSection] = useState<string>('datos');
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [statsData, setStatsData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'usuarios', currentUser.uid, 'stats'),
          orderBy('date', 'desc'),
          limit(7)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            name: new Date(d.date).toLocaleDateString('es-AR', { weekday: 'short' }),
            vistas: d.views || 0,
            clics: d.clicks || 0,
            fullDate: d.date
          };
        }).reverse();
        
        // If no data, provide some empty states for the chart
        if (data.length === 0) {
          setStatsData([
            { name: 'Lun', vistas: 0, clics: 0 },
            { name: 'Mar', vistas: 0, clics: 0 },
            { name: 'Mie', vistas: 0, clics: 0 },
            { name: 'Jue', vistas: 0, clics: 0 },
            { name: 'Vie', vistas: 0, clics: 0 },
            { name: 'Sab', vistas: 0, clics: 0 },
            { name: 'Dom', vistas: 0, clics: 0 },
          ]);
        } else {
          setStatsData(data);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchStats();
  }, [currentUser]);

  if (!currentUser || currentUser.rol !== 'profesional') {
    return <div className="p-8 text-center text-gray-500">Acceso denegado.</div>;
  }

  const { profesionalInfo } = currentUser;
  const isAvailable = profesionalInfo?.disponibilidadInmediata || false;

  const toggleAvailability = async () => {
    setUpdating(true);
    try {
      const userRef = doc(db, 'usuarios', currentUser.uid);
      await updateDoc(userRef, {
        'profesionalInfo.disponibilidadInmediata': !isAvailable
      });
    } catch (error) {
      console.error("Error updating availability:", error);
    } finally {
      setUpdating(false);
    }
  };

  const menuItems = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { 
      id: 'perfil', 
      label: 'Mi Perfil', 
      icon: UserCircle,
      subItems: [
        { id: 'datos', label: 'Datos Básicos', icon: UserCircle },
        { id: 'profesional', label: 'Info Profesional', icon: Briefcase },
        { id: 'portafolio', label: 'Portafolio', icon: Eye },
        { id: 'precios', label: 'Precios', icon: CreditCard },
        { id: 'verificacion', label: 'Verificación', icon: ShieldCheck },
      ]
    },
    { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
    { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
    { id: 'reseñas', label: 'Reseñas', icon: Star },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 -mt-8 -mx-4 sm:-mx-8">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 dark:text-gray-400">
            <Menu size={24} />
          </button>
          <span className="font-bold text-gray-900 dark:text-white">Panel Profesional</span>
        </div>
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-gray-500" />
          <img src={currentUser.fotoUrl} alt="Perfil" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200 dark:shadow-none">
                  B
                </div>
                <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">BahíaServis</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
              {menuItems.map((item) => (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (item.subItems) {
                        setIsProfileExpanded(!isProfileExpanded);
                        setActiveTab(item.id as TabType);
                      } else {
                        setActiveTab(item.id as TabType);
                        setIsSidebarOpen(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      activeTab === item.id && (!item.subItems || !isProfileExpanded)
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} />
                      {item.label}
                    </div>
                    {item.subItems && (
                      <ChevronRight 
                        size={16} 
                        className={`transition-transform duration-200 ${isProfileExpanded ? 'rotate-90' : ''}`} 
                      />
                    )}
                  </button>
                  
                  {item.subItems && isProfileExpanded && (
                    <div className="mt-1 ml-4 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/50 space-y-1 animate-in slide-in-from-top-2 duration-200">
                      {item.subItems.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setActiveTab('perfil');
                            setActiveProfileSection(sub.id);
                            setIsSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                            activeTab === 'perfil' && activeProfileSection === sub.id
                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                              : 'text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-indigo-600'
                          }`}
                        >
                          <sub.icon size={14} />
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-1">
              <Link to="/" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Settings size={20} />
                Ir al Inicio
              </Link>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut size={20} />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-6xl mx-auto w-full">
          {/* Onboarding Tutorial */}
          {!profesionalInfo?.onboardingCompleted && (
            <div className="mb-8">
              <ProfessionalOnboarding userId={currentUser.uid} />
            </div>
          )}

          {activeTab === 'resumen' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hola, {currentUser.nombre} 👋</h1>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">Acá tenés un resumen de tu actividad hoy.</p>
                </div>
                <div className="flex items-center gap-3">
                  {profesionalInfo?.isVerified ? (
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-bold border border-blue-200">
                      <ShieldCheck size={18} />
                      Perfil Verificado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-bold border border-amber-200">
                      <AlertCircle size={18} />
                      Pendiente de Verificación
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Availability Toggle */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${isAvailable ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Clock size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Disponibilidad Inmediata</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Activá esto si podés tomar trabajos ahora mismo.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-bold text-lg ${isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
                    {isAvailable ? 'Disponible' : 'No disponible'}
                  </span>
                  <button
                    onClick={toggleAvailability}
                    disabled={updating}
                    className={`
                      relative inline-flex h-10 w-18 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2
                      ${isAvailable ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
                      ${updating ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <span
                      className={`
                        pointer-events-none inline-block h-9 w-9 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out
                        ${isAvailable ? 'translate-x-8' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 group hover:border-indigo-300 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
                      <Eye size={24} />
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">+12%</span>
                  </div>
                  <h3 className="text-gray-500 dark:text-gray-400 font-medium">Visitas Totales</h3>
                  <p className="text-4xl font-black text-gray-900 dark:text-white mt-2">
                    {profesionalInfo?.profileViews || 0}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 group hover:border-indigo-300 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-2xl text-green-600 dark:text-green-400">
                      <MessageSquare size={24} />
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">+5%</span>
                  </div>
                  <h3 className="text-gray-500 dark:text-gray-400 font-medium">Contactos WhatsApp</h3>
                  <p className="text-4xl font-black text-gray-900 dark:text-white mt-2">
                    {profesionalInfo?.whatsappClicks || 0}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 group hover:border-indigo-300 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl text-amber-600 dark:text-amber-400">
                      <Star size={24} />
                    </div>
                    <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">Sin cambios</span>
                  </div>
                  <h3 className="text-gray-500 dark:text-gray-400 font-medium">Reputación</h3>
                  <p className="text-4xl font-black text-gray-900 dark:text-white mt-2">
                    {profesionalInfo?.ratingAvg?.toFixed(1) || '0.0'}
                  </p>
                </div>
              </div>

              {/* Charts Section */}
              <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Actividad de la Semana</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-indigo-600" />
                      <span className="text-gray-600 dark:text-gray-400">Vistas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-gray-600 dark:text-gray-400">Clics</span>
                    </div>
                  </div>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={statsData}>
                      <defs>
                        <linearGradient id="colorVistas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorClics" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#9ca3af', fontSize: 12}}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#9ca3af', fontSize: 12}}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="vistas" 
                        stroke="#4f46e5" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorVistas)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="clics" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorClics)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* VIP Promotion */}
              {!profesionalInfo?.isVip && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-indigo-200 dark:shadow-none">
                  <div className="text-center md:text-left">
                    <h3 className="text-2xl font-bold mb-2">¡Llegá a más clientes con VIP! 🚀</h3>
                    <p className="text-indigo-100">Aparecé en los primeros resultados y destacá tu perfil con una medalla especial.</p>
                  </div>
                  <VipButton />
                </div>
              )}

              {/* Trade Discounts Info */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-800 rounded-2xl text-indigo-600 dark:text-indigo-400">
                    <Tag size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100">Beneficios para el Gremio</h3>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                      Muchos comercios ofrecen descuentos exclusivos a profesionales de <strong>Bahía Oficios</strong>.
                    </p>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-2 italic">
                    * Para acceder, mencioná que venís de la web y mostrá tu perfil.
                  </p>
                  <Link 
                    to="/beneficios" 
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
                  >
                    Ver Comercios Adheridos
                  </Link>
                </div>
              </div>

              {/* Recent Activity / Pedidos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pedidos Recientes</h2>
                  <button onClick={() => setActiveTab('pedidos')} className="text-indigo-600 font-bold text-sm hover:underline">Ver todos</button>
                </div>
                <QuoteRequestsList limitCount={3} />
              </div>
            </div>
          )}

          {activeTab === 'perfil' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <Profile initialSection={activeProfileSection as any} />
            </div>
          )}

          {activeTab === 'estadisticas' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Estadísticas Detalladas</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-bold mb-6">Vistas vs Clics</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={statsData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="vistas" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.1} />
                        <Area type="monotone" dataKey="clics" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-bold mb-6">Tasa de Conversión</h3>
                  <div className="flex flex-col items-center justify-center h-80">
                    <div className="relative w-48 h-48 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke="currentColor"
                          strokeWidth="16"
                          fill="transparent"
                          className="text-gray-100 dark:text-gray-700"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke="currentColor"
                          strokeWidth="16"
                          fill="transparent"
                          strokeDasharray={552}
                          strokeDashoffset={552 - (552 * (profesionalInfo?.whatsappClicks || 0) / (profesionalInfo?.profileViews || 1))}
                          className="text-indigo-600"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-4xl font-black text-gray-900 dark:text-white">
                          {((profesionalInfo?.whatsappClicks || 0) / (profesionalInfo?.profileViews || 1) * 100).toFixed(1)}%
                        </span>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Conversión</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-8 text-center max-w-xs">
                      De cada 100 personas que ven tu perfil, {((profesionalInfo?.whatsappClicks || 0) / (profesionalInfo?.profileViews || 1) * 100).toFixed(0)} te contactan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pedidos' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Gestión de Pedidos</h2>
              <QuoteRequestsList />
            </div>
          )}

          {activeTab === 'reseñas' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Tus Reseñas</h2>
              <ReviewsList />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const ReviewsList: React.FC = () => {
  const { currentUser } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const fetchReviews = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'resenas'),
          where('profesionalId', '==', currentUser.uid),
          orderBy('fecha', 'desc')
        );
        const snapshot = await getDocs(q);
        setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [currentUser]);

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      const reviewRef = doc(db, 'resenas', reviewId);
      await updateDoc(reviewRef, {
        respuestaProfesional: {
          texto: replyText,
          fecha: new Date().toISOString()
        }
      });
      
      setReviews(reviews.map(r => {
        if (r.id === reviewId) {
          return {
            ...r,
            respuestaProfesional: {
              texto: replyText,
              fecha: new Date().toISOString()
            }
          };
        }
        return r;
      }));
      
      setReplyingTo(null);
      setReplyText('');
    } catch (error) {
      console.error("Error replying to review:", error);
    }
  };

  if (loading) return <div className="text-gray-500">Cargando reseñas...</div>;
  if (reviews.length === 0) return (
    <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
      <Star size={48} className="mx-auto text-gray-300 mb-4" />
      <p className="text-gray-500">Aún no tenés reseñas. ¡Hacé un buen trabajo para recibirlas!</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {reviews.map(review => (
        <div key={review.id} className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold">
                {review.clienteNombre?.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">{review.clienteNombre}</h4>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={14} 
                      className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} 
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-2">
                    {review.fecha?.toDate ? new Date(review.fecha.toDate()).toLocaleDateString() : 'Reciente'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 leading-relaxed italic">
            "{review.comentario}"
          </p>

          {review.fotos && review.fotos.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {review.fotos.map((foto: string, idx: number) => (
                <img 
                  key={idx} 
                  src={foto} 
                  alt={`Trabajo ${idx}`} 
                  className="w-24 h-24 object-cover rounded-xl border border-gray-100 dark:border-gray-700 flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
          )}

          {review.badges && review.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {review.badges.map((badge: string) => (
                <span key={badge} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-100 dark:border-indigo-800">
                  {badge}
                </span>
              ))}
            </div>
          )}

          {review.respuestaProfesional ? (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-l-4 border-indigo-500">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle size={14} className="text-indigo-600" />
                <span className="text-xs font-bold text-indigo-600">Tu respuesta</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{review.respuestaProfesional.texto}</p>
            </div>
          ) : (
            <div className="mt-4">
              {replyingTo === review.id ? (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribí una respuesta amable..."
                    className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReply(review.id)}
                      className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all"
                    >
                      Enviar Respuesta
                    </button>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="px-4 py-2 text-gray-500 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setReplyingTo(review.id)}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <MessageCircle size={14} /> Responder reseña
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const QuoteRequestsList: React.FC<{ limitCount?: number }> = ({ limitCount }) => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [requiresDeposit, setRequiresDeposit] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'quoteRequests'),
          where('profesionalesAsignados', 'array-contains', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        let reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort client-side by fecha desc
        reqs.sort((a: any, b: any) => {
          const dateA = a.fecha?.toDate?.() || new Date(0);
          const dateB = b.fecha?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        if (limitCount) {
          reqs = reqs.slice(0, limitCount);
        }
        
        setRequests(reqs);
      } catch (error) {
        console.error("Error fetching quote requests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [currentUser, limitCount]);

  const handleRespond = async (requestId: string) => {
    if (!currentUser || !price || !message) return;
    try {
      const requestRef = doc(db, 'quoteRequests', requestId);
      await updateDoc(requestRef, {
        respuestas: arrayUnion({
          profesionalId: currentUser.uid,
          profesionalNombre: currentUser.nombre,
          precio: price,
          mensaje: message,
          requiresDeposit: requiresDeposit,
          fecha: new Date().toISOString()
        })
      });
      
      // Update local state
      setRequests(requests.map(req => {
        if (req.id === requestId) {
          return {
            ...req,
            respuestas: [...(req.respuestas || []), { profesionalId: currentUser.uid }]
          };
        }
        return req;
      }));
      
      setRespondingTo(null);
      setPrice('');
      setMessage('');
      setRequiresDeposit(false);
      alert("Respuesta enviada correctamente.");
    } catch (error) {
      console.error("Error responding to quote request:", error);
      alert("Hubo un error al enviar tu respuesta.");
    }
  };

  if (loading) return <div className="text-gray-500">Cargando solicitudes...</div>;
  if (requests.length === 0) return <div className="text-gray-500 p-8 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 text-center">No hay solicitudes nuevas en tu rubro.</div>;

  return (
    <div className="grid grid-cols-1 gap-6">
      {requests.map(req => {
        const respuestasCount = req.respuestas?.length || 0;
        const hasResponded = req.respuestas?.some((r: any) => r.profesionalId === currentUser?.uid);
        const canRespond = respuestasCount < 3 && !hasResponded;

        return (
          <div key={req.id} className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-bold text-xl">
                  {req.clienteNombre?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Solicitud de {req.clienteNombre}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><MapPin size={14} /> {req.zona}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {new Date(req.fecha?.toDate()).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${respuestasCount >= 3 ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {respuestasCount}/3 Respuestas
                </span>
                {hasResponded && (
                  <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <CheckCircle size={12} /> Respondido
                  </span>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl mb-6">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{req.descripcion}</p>
            </div>
            
            {!hasResponded && canRespond && respondingTo !== req.id && (
              <button 
                onClick={() => setRespondingTo(req.id)}
                className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 flex items-center justify-center gap-2"
              >
                <Send size={18} /> Responder Presupuesto
              </button>
            )}

            {!hasResponded && !canRespond && (
              <div className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 p-4 rounded-2xl text-sm font-medium flex items-center gap-2">
                <AlertCircle size={18} />
                Esta solicitud ya alcanzó el límite de 3 respuestas.
              </div>
            )}

            {respondingTo === req.id && (
              <div className="space-y-6 mt-6 border-t border-gray-100 dark:border-gray-700 pt-6 animate-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Precio Estimado ($)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                      <input 
                        type="number" 
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ej. 15000"
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 w-full">
                      <input
                        type="checkbox"
                        checked={requiresDeposit}
                        onChange={(e) => setRequiresDeposit(e.target.checked)}
                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded-lg focus:ring-indigo-500"
                      />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        Pedir seña de $10.000
                      </span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Mensaje al cliente</label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={3}
                    placeholder="Hola, puedo hacer este trabajo. Tengo disponibilidad para el..."
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => handleRespond(req.id)}
                    className="flex-1 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Send size={18} /> Enviar Presupuesto
                  </button>
                  <button 
                    onClick={() => setRespondingTo(null)}
                    className="px-8 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
