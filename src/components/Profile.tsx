import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Role } from '../types';
import { Camera, Save, AlertCircle, Upload, UserCog, FileText, Phone, MapPin, Mail, CheckCircle } from 'lucide-react';
import { VipButton } from './VipButton';
import { useSearchParams } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    nombre: '',
    zona: '',
    fotoUrl: '',
    rubro: '',
    descripcion: '',
    rol: 'cliente' as Role,
    telefono: '',
    direccion: '',
    contactEmail: '',
    fotoDni: ''
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [dniFile, setDniFile] = useState<File | null>(null);
  const [dniPreview, setDniPreview] = useState<string | null>(null);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      setSuccess(true);
      // Optimistically update UI or show a specific message
      // In a real app, we might want to poll the backend or wait for the webhook to update the user
    } else if (status === 'failure') {
      setError('El pago no se pudo completar. Por favor, intenta nuevamente.');
    } else if (status === 'pending') {
      setError('El pago está pendiente de confirmación.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        nombre: currentUser.nombre || '',
        zona: currentUser.zona || '',
        fotoUrl: currentUser.fotoUrl || '',
        rubro: currentUser.profesionalInfo?.rubro || 'Electricista',
        descripcion: currentUser.profesionalInfo?.descripcion || '',
        rol: currentUser.rol || 'cliente',
        telefono: currentUser.profesionalInfo?.telefono || '',
        direccion: currentUser.profesionalInfo?.direccion || '',
        contactEmail: currentUser.profesionalInfo?.contactEmail || currentUser.email || '',
        fotoDni: currentUser.profesionalInfo?.fotoDni || ''
      });
      setImagePreview(currentUser.fotoUrl || null);
      setDniPreview(currentUser.profesionalInfo?.fotoDni || null);
    }
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDniFile(file);
      setDniPreview(URL.createObjectURL(file));
    }
  };

  const toggleRole = () => {
    setFormData(prev => ({
      ...prev,
      rol: prev.rol === 'cliente' ? 'profesional' : 'cliente'
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!currentUser) return;

    try {
      const userRef = doc(db, 'usuarios', currentUser.uid);
      
      let newFotoUrl = formData.fotoUrl;
      let newFotoDni = formData.fotoDni;

      // Upload Profile Image
      if (imageFile) {
        try {
          const storageRef = ref(storage, `profile_images/${currentUser.uid}`);
          await uploadBytes(storageRef, imageFile);
          newFotoUrl = await getDownloadURL(storageRef);
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          setError('Error al subir la imagen de perfil.');
        }
      }

      // Upload DNI Image
      if (dniFile) {
        try {
          const storageRef = ref(storage, `dni_images/${currentUser.uid}`);
          await uploadBytes(storageRef, dniFile);
          newFotoDni = await getDownloadURL(storageRef);
        } catch (uploadError) {
          console.error("Error uploading DNI:", uploadError);
          setError('Error al subir la foto del DNI.');
        }
      }

      const updateData: any = {
        nombre: formData.nombre,
        zona: formData.zona,
        fotoUrl: newFotoUrl,
        rol: formData.rol
      };

      if (formData.rol === 'profesional') {
        // Ensure professional info exists or is updated
        updateData.profesionalInfo = {
          rubro: formData.rubro,
          descripcion: formData.descripcion,
          isVip: currentUser.profesionalInfo?.isVip || false,
          ratingAvg: currentUser.profesionalInfo?.ratingAvg || 0,
          reviewCount: currentUser.profesionalInfo?.reviewCount || 0,
          fotosTrabajos: currentUser.profesionalInfo?.fotosTrabajos || [],
          telefono: formData.telefono,
          direccion: formData.direccion,
          contactEmail: formData.contactEmail,
          fotoDni: newFotoDni
        };
      }

      await updateDoc(userRef, updateData);
      
      setSuccess(true);
      
    } catch (err) {
      console.error(err);
      setError('Error al actualizar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  const rubros = ['Electricista', 'Gasista', 'Plomero', 'Albañil', 'Pintor', 'Carpintero', 'Jardinero', 'Mecánico', 'Cerrajero', 'Flete', 'Limpieza', 'Techista'];
  const zonas = ['Centro', 'Universitario', 'Villa Mitre', 'Patagonia', 'Norte', 'Bella Vista', 'Palihue', 'San Andrés', 'Tiro Federal', 'Ingeniero White'];

  if (!currentUser) return <div>Cargando...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Perfil</h2>
        <button 
          type="button"
          onClick={toggleRole}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            formData.rol === 'profesional' 
              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          <UserCog size={14} />
          {formData.rol === 'profesional' ? 'Modo Profesional' : 'Modo Cliente'}
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg flex items-center">
          {searchParams.get('status') === 'success' ? (
             <>
               <CheckCircle size={18} className="mr-2" /> 
               <span>¡Pago exitoso! Tu membresía VIP se activará en breve.</span>
             </>
          ) : (
             <>
               <Save size={18} className="mr-2" /> 
               <span>Perfil actualizado correctamente.</span>
             </>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center">
          <AlertCircle size={18} className="mr-2" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Foto de Perfil */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={imagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.nombre)}&background=random`} 
              alt="Perfil" 
              className="w-20 h-20 rounded-full object-cover border-2 border-indigo-100"
            />
            <label 
              htmlFor="profile-upload" 
              className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-indigo-700 shadow-sm"
            >
              <Camera size={14} />
            </label>
            <input 
              id="profile-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageChange}
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL de Foto (Opcional)</label>
            <input
              type="text"
              name="fotoUrl"
              value={formData.fotoUrl}
              onChange={handleChange}
              placeholder="https://..."
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Sube una foto o pega una URL.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre Completo</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Zona</label>
            <select
              name="zona"
              value={formData.zona}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Seleccionar Zona</option>
              {zonas.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        </div>

        {formData.rol === 'profesional' && (
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCog size={20} /> Información Profesional
              </h3>
            </div>

            {/* VIP Button Section - Only show if actually a professional in DB to avoid confusion or errors */}
            {currentUser.rol === 'profesional' ? (
              <div className="mb-6">
                <VipButton />
              </div>
            ) : (
              <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm mb-4">
                Guarda los cambios para acceder a las opciones VIP.
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rubro</label>
                <select
                  name="rubro"
                  value={formData.rubro}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Seleccionar Rubro</option>
                  {rubros.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono de Contacto</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={14} className="text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="291 1234567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email de Contacto</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={14} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="contacto@ejemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dirección (Opcional)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin size={14} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Calle 123"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción Profesional</label>
              <textarea
                name="descripcion"
                rows={4}
                value={formData.descripcion}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe tus servicios..."
              />
            </div>

            {/* DNI Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Foto del DNI (Verificación)</label>
              <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                {dniPreview ? (
                  <div className="relative h-32 w-auto">
                    <img 
                      src={dniPreview} 
                      alt="DNI Preview" 
                      className="h-full rounded-md object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { setDniFile(null); setDniPreview(null); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600"
                    >
                      <AlertCircle size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full py-4 text-gray-500 dark:text-gray-400">
                    <FileText size={32} className="mb-2 opacity-50" />
                    <span className="text-xs">No hay foto cargada</span>
                  </div>
                )}
                
                <div className="flex-1">
                  <label 
                    htmlFor="dni-upload" 
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <Upload size={16} className="mr-2" />
                    Subir Foto DNI
                  </label>
                  <input 
                    id="dni-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleDniChange}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Sube una foto clara de tu DNI para verificar tu identidad. Esta imagen no será pública.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};
