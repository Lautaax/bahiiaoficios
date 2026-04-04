import React, { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { Upload, User, Briefcase, Phone } from 'lucide-react';
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
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-indigo-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Completa tu Perfil
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Necesitamos algunos datos más para terminar de configurar tu cuenta.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Profile Image */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="relative w-24 h-24 mb-2">
                <img 
                  src={imagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre || 'User')}&background=random`} 
                  alt="Profile Preview" 
                  className="w-24 h-24 rounded-full object-cover border-2 border-indigo-100"
                />
                <label 
                  htmlFor="file-upload" 
                  className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-indigo-700 shadow-sm"
                >
                  <Upload size={14} />
                </label>
                <input 
                  id="file-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange}
                />
              </div>
              <span className="text-xs text-gray-500 font-medium">Foto de perfil (Obligatorio)</span>
            </div>

            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre Completo</label>
              <input
                id="nombre"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono (WhatsApp)</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="telefono"
                  type="tel"
                  required
                  placeholder="Ej: 2915551234"
                  className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Soy...</label>
                <select
                  id="role"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  <option value="cliente">Cliente</option>
                  <option value="profesional">Profesional</option>
                </select>
              </div>

              <div>
                <label htmlFor="zona" className="block text-sm font-medium text-gray-700">Zona</label>
                <select
                  id="zona"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-2 text-indigo-700 mb-2">
                  <Briefcase size={18} />
                  <span className="font-medium text-sm">Datos Profesionales</span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rubros (Selecciona hasta 5)</label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-md bg-white">
                    {rubros.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRubro(r)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          rubrosSeleccionados.includes(r)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">Descripción</label>
                  <textarea
                    id="descripcion"
                    rows={3}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Describe tus servicios..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección (Opcional)</label>
                    <input
                      id="direccion"
                      type="text"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">Email de Contacto</label>
                    <input
                      id="contactEmail"
                      type="email"
                      placeholder={currentUser.email || ''}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cuit" className="block text-sm font-medium text-gray-700">CUIT/CUIL</label>
                    <input
                      id="cuit"
                      type="text"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={cuit}
                      onChange={(e) => setCuit(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="tipoFactura" className="block text-sm font-medium text-gray-700">Tipo de Factura</label>
                    <select
                      id="tipoFactura"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={tipoFactura}
                      onChange={(e) => setTipoFactura(e.target.value as any)}
                    >
                      <option value="">No emito factura</option>
                      <option value="A">Factura A</option>
                      <option value="C">Factura C</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="haceFactura"
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={haceFactura}
                      onChange={(e) => setHaceFactura(e.target.checked)}
                    />
                    <label htmlFor="haceFactura" className="text-sm text-gray-700">Emito factura</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="haceUrgencias"
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={haceUrgencias}
                      onChange={(e) => setHaceUrgencias(e.target.checked)}
                    />
                    <label htmlFor="haceUrgencias" className="text-sm text-gray-700">Atención de Urgencias 24/7</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="disponibilidadInmediata"
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={disponibilidadInmediata}
                      onChange={(e) => setDisponibilidadInmediata(e.target.checked)}
                    />
                    <label htmlFor="disponibilidadInmediata" className="text-sm text-gray-700">Disponibilidad Inmediata</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="matriculado"
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={matriculado}
                      onChange={(e) => setMatriculado(e.target.checked)}
                    />
                    <label htmlFor="matriculado" className="text-sm text-gray-700">Soy Profesional Matriculado</label>
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
