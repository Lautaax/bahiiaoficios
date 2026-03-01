import React, { useState, useMemo } from 'react';
import { MapPin, LogOut, User as UserIcon, Moon, Sun, Settings } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
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

function Navbar() {
  const { currentUser, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <MapPin className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Bahia Oficios</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Portal de Profesionales</p>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            title={resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {currentUser ? (
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Dashboard
              </Link>
              <Link to="/profile" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                <div className="relative">
                  {currentUser.fotoUrl ? (
                    <img src={currentUser.fotoUrl} alt="Perfil" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <UserIcon size={20} />
                  )}
                </div>
                <span className="hidden sm:inline">Hola, {currentUser.nombre}</span>
              </Link>
              
              <Link to="/profile" className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400" title="Editar Perfil">
                <Settings size={20} />
              </Link>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-2"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/signup" className="hidden sm:block text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Soy Profesional</Link>
              <Link to="/login" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
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
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Navbar />
      {children}
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-12 py-8 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>© 2026 Bahia Oficios. Todos los derechos reservados.</p>
          <p className="mt-1 text-xs">
            Diseñado por <a href="https://www.instagram.com/_lautaaj/?__pwa=1" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 transition-colors">@_lautaaj</a>
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <span className="hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">Términos</span>
            <span className="hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">Privacidad</span>
            <span className="hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">Ayuda</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
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

            <Route path="/profesional/:id" element={
              <Layout>
                <PublicProfile />
              </Layout>
            } />

            <Route path="/dashboard" element={
              <Layout>
                <Dashboard />
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
            
            {/* Placeholder for professional dashboard */}
            <Route path="/dashboard-profesional" element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-4xl mx-auto p-8">
                    <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard Profesional</h1>
                    
                    <div className="grid gap-6">
                      <VipButton />
                      
                      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Mis Estadísticas</h3>
                        <p className="text-gray-500 dark:text-gray-400">Aquí verás tus métricas de visitas y contactos.</p>
                      </div>
                    </div>

                    <Link to="/" className="text-indigo-600 dark:text-indigo-400 underline mt-8 block text-center">Volver al inicio</Link>
                  </div>
                </Layout>
              </PrivateRoute>
            } />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
