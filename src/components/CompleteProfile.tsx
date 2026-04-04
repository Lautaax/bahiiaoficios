import React, { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { Upload, User, Briefcase, Phone } from 'lucide-react';
import { ZONAS, PROFESSIONS } from '../constants';

import { uploadToImgur } from '../services/imgurService';

export const CompleteProfile: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [nombre, setNombre] = useState('');
  const [role, setRole] = useState<Role>('cliente');
  const [zona, setZona] = useState('Centro');
  const [rubro, setRubro] = useState('Electricista');
  const [descripcion, setDescripcion] = useState('');
  const [telefono, setTelefono] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!currentUser) return;

    // Validar teléfono
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(telefono.replace(/\D/g, ''))) {
      setError('Por favor, ingresa un número de teléfono válido (solo números, mínimo 10 dígitos).');
      setLoading(false);
      return;
    }

    try {
      let fotoUrl = currentUser.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`;

      if (imageFile) {
        try {
           // Try Imgur upload first
           fotoUrl = await uploadToImgur(imageFile);
        } catch (uploadError) {
           console.error("Error uploading image to Imgur:", uploadError);
           
           // Fallback to Firebase Storage
           try {
              console.log("Falling back to Firebase Storage...");
              const storageRef = ref(storage, `profile_images/${currentUser.uid}`);
              await uploadBytes(storageRef, imageFile);
              fotoUrl = await getDownloadURL(storageRef);
           } catch (firebaseError) {
              console.error("Error uploading image to Firebase:", firebaseError);
           }
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
          rubro,
          descripcion: descripcion || 'Profesional registrado en Oficios Bahía.',
          isVip: false,
          ratingAvg: 0,
          reviewCount: 0,
          fotosTrabajos: [],
          telefono: telefono.replace(/\D/g, ''),
          matriculado: false
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
              <span className="text-xs text-gray-500">Foto de perfil</span>
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
                  <label htmlFor="rubro" className="block text-sm font-medium text-gray-700">Rubro Principal</label>
                  <select
                    id="rubro"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={rubro}
                    onChange={(e) => setRubro(e.target.value)}
                  >
                    {rubros.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
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
