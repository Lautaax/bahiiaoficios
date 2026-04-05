import React, { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { Upload, User, Briefcase, Phone, AlertCircle } from 'lucide-react';
import { ZONAS, PROFESSIONS } from '../constants';

export const CompleteProfile: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [nombre, setNombre] = useState('');
  const [role, setRole] = useState<Role>('cliente');
  const [zona, setZona] = useState('Centro');
  const [rubro, setRubro] = useState('Electricista');
  const [rubrosSeleccionados, setRubrosSeleccionados] = useState<string[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [cuit, setCuit] = useState('');
  const [haceFactura, setHaceFactura] = useState(false);
  const [tipoFactura, setTipoFactura] = useState<'A' | 'C' | ''>('');
  const [haceUrgencias, setHaceUrgencias] = useState(false);
  const [disponibilidadInmediata, setDisponibilidadInmediata] = useState(false);
  const [matriculado, setMatriculado] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rubros = PROFESSIONS.map(p => p.name);
  const zonas = ZONAS;

  useEffect(() => {
    if (currentUser) {
      setNombre(currentUser.nombre || '');
      setImagePreview(currentUser.fotoUrl || null);
      if (!currentUser.isNewUser) {
        // If user is not new, redirect to home
        navigate('/');
      }
    }
  }, [currentUser, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const toggleRubro = (r: string) => {
    if (rubrosSeleccionados.includes(r)) {
      setRubrosSeleccionados(rubrosSeleccionados.filter(item => item !== r));
    } else {
      if (rubrosSeleccionados.length < 5) {
        setRubrosSeleccionados([...rubrosSeleccionados, r]);
      } else {
        setError('Puedes seleccionar hasta 5 rubros.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === 'profesional' && rubrosSeleccionados.length === 0) {
      setError('Debes seleccionar al menos un rubro.');
      return;
    }

    setLoading(true);

    if (!currentUser) return;

    // Validar teléfono
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(telefono.replace(/\D/g, ''))) {
      setError('Por favor, ingresa un número de teléfono válido (solo números, mínimo 10 dígitos).');
      setLoading(false);
      return;
    }

    // Validar foto de perfil obligatoria
    if (!imageFile && !currentUser.fotoUrl) {
      setError('La foto de perfil es obligatoria.');
      setLoading(false);
      return;
    }

    try {
      let fotoUrl = currentUser.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`;

      if (imageFile) {
        try {
          const imageCompression = (await import('browser-image-compression')).default;
          const compressed = await imageCompression(imageFile, { maxSizeMB: 0.8, maxWidthOrHeight: 1280, fileType: 'image/webp' });
          const webpFile = new File([compressed], 'profile.webp', { type: 'image/webp' });
          const storageRef = ref(storage, `profile_images/${currentUser.uid}`);
          await uploadBytes(storageRef, webpFile);
          fotoUrl = await getDownloadURL(storageRef);
        } catch (uploadError: any) {
          setError(uploadError.message || "Error al subir la imagen de perfil.");
          setLoading(false);
          return;
        }
      }

      const baseSlug = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const slug = `${baseSlug}-${currentUser.uid.substring(0, 4)}`;

      const userData: any = {
        uid: currentUser.uid,
        nombre,
        email: currentUser.email,
        telefono: telefono.replace(/\D/g, ''),
        rol: role,
        ciudad: 'Bahía Blanca',
        zona,
        createdAt: serverTimestamp(),
        fotoUrl,
        slug,
        isAdmin: currentUser.email === 'lautaroj.aguilera@gmail.com'
      };

      if (role === 'profesional') {
        userData.profesionalInfo = {
          rubro: rubrosSeleccionados[0],
          rubros: rubrosSeleccionados,
          descripcion: descripcion || 'Profesional registrado en Oficios Bahía.',
          isVip: false,
          ratingAvg: 0,
          reviewCount: 0,
          fotosTrabajos: [],
          fotosTrabajosDetalle: [],
          telefono: telefono.replace(/\D/g, ''),
          direccion,
          contactEmail: contactEmail || currentUser.email,
          cuit,
          haceFactura,
          tipoFactura,
          haceUrgencias,
          disponibilidadInmediata,
          matriculado,
          preciosReferencia: [],
          badges: []
        };
      }

      await setDoc(doc(db, 'usuarios', currentUser.uid), userData);
      
      // Force reload or update context (AuthContext should pick up changes on next fetch or we can manually update if needed, 
      // but usually a reload or navigation is enough if AuthContext re-fetches. 
      // However, AuthContext only fetches on auth state change. 
      // We might need to refresh the page to trigger re-fetch or update local state.)
      
      // For now, let's redirect to home. The AuthContext might need a refresh.
      window.location.href = '/'; 

    } catch (err: any) {
      console.error(err);
      setError('Error al guardar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return <div>Cargando...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 mb-4">
            <User className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Completar Perfil
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {role === 'profesional' 
              ? 'Configura tu perfil profesional para empezar a recibir trabajos' 
              : 'Danos unos detalles más para mejorar tu experiencia'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center">
              <AlertCircle className="text-red-400 mr-2" size={18} />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            {/* Profile Image Section */}
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl group-hover:border-indigo-100 transition-all">
                  <img 
                    src={imagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre || 'User')}&background=random`} 
                    alt="Profile Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <label 
                  htmlFor="file-upload" 
                  className="absolute bottom-1 right-1 bg-indigo-600 text-white p-2.5 rounded-full cursor-pointer hover:bg-indigo-700 shadow-lg transform transition-transform hover:scale-110"
                >
                  <Upload size={18} />
                </label>
                <input 
                  id="file-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange}
                />
              </div>
              <span className="mt-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">Foto de perfil obligatoria</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 ml-1">Nombre Completo</label>
                <input
                  id="nombre"
                  type="text"
                  required
                  placeholder="Tu nombre y apellido"
                  className="appearance-none block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm bg-gray-50"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="telefono" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 ml-1">Teléfono (WhatsApp)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="telefono"
                    type="tel"
                    required
                    placeholder="Ej: 2915551234"
                    className="block w-full pl-11 px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm bg-gray-50"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 ml-1">Tipo de Cuenta</label>
                <select
                  id="role"
                  className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  <option value="cliente">Cliente</option>
                  <option value="profesional">Profesional</option>
                </select>
              </div>

              <div>
                <label htmlFor="zona" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 ml-1">Zona</label>
                <select
                  id="zona"
                  className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm"
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                >
                  {zonas.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
            </div>

            {role === 'profesional' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Briefcase className="text-indigo-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-900">Información Profesional</h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 ml-1">Rubros (Selecciona hasta 5)</label>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-xl bg-gray-50 custom-scrollbar">
                    {rubros.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRubro(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          rubrosSeleccionados.includes(r)
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-105'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="descripcion" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 ml-1">Descripción de tus servicios</label>
                  <textarea
                    id="descripcion"
                    rows={4}
                    className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm"
                    placeholder="Contanos sobre tu experiencia y lo que ofrecés..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer group">
                    <input
                      id="haceUrgencias"
                      type="checkbox"
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg transition-all"
                      checked={haceUrgencias}
                      onChange={(e) => setHaceUrgencias(e.target.checked)}
                    />
                    <label htmlFor="haceUrgencias" className="text-xs font-bold text-gray-700 cursor-pointer group-hover:text-indigo-600 transition-colors">Urgencias 24/7</label>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer group">
                    <input
                      id="matriculado"
                      type="checkbox"
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg transition-all"
                      checked={matriculado}
                      onChange={(e) => setMatriculado(e.target.checked)}
                    />
                    <label htmlFor="matriculado" className="text-xs font-bold text-gray-700 cursor-pointer group-hover:text-indigo-600 transition-colors">Matriculado</label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-md transition-all hover:scale-[1.02]"
          >
            {loading ? 'Guardando...' : 'Completar Registro'}
          </button>
        </form>
      </div>
    </div>
  );
};
