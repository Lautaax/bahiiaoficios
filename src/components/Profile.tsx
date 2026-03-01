import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { User, Role } from '../types';
import { Camera, Save, AlertCircle, Upload, UserCog, FileText, Phone, MapPin, Mail, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { VipButton } from './VipButton';
import { useSearchParams } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [showRoleConfirmation, setShowRoleConfirmation] = useState(false);

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
    fotoDni: '',
    cuit: '',
    haceFactura: false,
    tipoFactura: '' as 'A' | 'C' | ''
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [dniFile, setDniFile] = useState<File | null>(null);
  const [dniPreview, setDniPreview] = useState<string | null>(null);
  const [dniUploadStatus, setDniUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [dniUploadProgress, setDniUploadProgress] = useState(0);

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
        fotoDni: currentUser.profesionalInfo?.fotoDni || '',
        cuit: currentUser.profesionalInfo?.cuit || '',
        haceFactura: currentUser.profesionalInfo?.haceFactura || false,
        tipoFactura: currentUser.profesionalInfo?.tipoFactura || ''
      });
      setImagePreview(currentUser.fotoUrl || null);
      setDniPreview(currentUser.profesionalInfo?.fotoDni || null);
      if (currentUser.profesionalInfo?.fotoDni) {
        setDniUploadStatus('success');
      }
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
    if (formData.rol === 'cliente') {
      setShowRoleConfirmation(true);
    } else {
      setFormData(prev => ({ ...prev, rol: 'cliente' }));
    }
  };

  const confirmRoleChange = () => {
    setFormData(prev => ({ ...prev, rol: 'profesional' }));
    setShowRoleConfirmation(false);
  };

  const cancelRoleChange = () => {
    setShowRoleConfirmation(false);
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
        setDniUploadStatus('uploading');
        setDniUploadProgress(0);
        
        try {
          const storageRef = ref(storage, `dni_images/${currentUser.uid}`);
          const uploadTask = uploadBytesResumable(storageRef, dniFile);

          // Wrap uploadTask in a promise to await completion
          newFotoDni = await new Promise<string>((resolve, reject) => {
            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setDniUploadProgress(progress);
              }, 
              (error) => {
                console.error("Error uploading DNI:", error);
                setDniUploadStatus('error');
                reject(error);
              }, 
              async () => {
                try {
                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                  setDniUploadStatus('success');
                  resolve(downloadURL);
                } catch (err) {
                  reject(err);
                }
              }
            );
          });
        } catch (uploadError) {
          console.error("Error uploading DNI:", uploadError);
          setDniUploadStatus('error');
          setError('Error al subir la foto del DNI.');
          setLoading(false);
          return; // Stop execution if DNI upload fails
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
        // Saving contact info to profesionalInfo as requested: telefono, direccion, contactEmail
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
          fotoDni: newFotoDni,
          cuit: formData.cuit,
          haceFactura: formData.haceFactura,
          tipoFactura: formData.haceFactura ? formData.tipoFactura : null
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

      {showRoleConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-500">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold">¿Cambiar a Profesional?</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Al cambiar tu rol a <strong>Profesional</strong>, se habilitarán campos adicionales para que puedas ofrecer tus servicios, subir fotos de trabajos y verificar tu identidad.
              <br/><br/>
              ¿Deseas continuar?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelRoleChange}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmRoleChange}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md font-medium"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

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
            
            <div className="space-y-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CUIT/CUIL</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText size={14} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="cuit"
                      value={formData.cuit}
                      onChange={handleChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="20-12345678-9"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-600">
                <div className="flex items-center mb-4">
                  <input
                    id="haceFactura"
                    name="haceFactura"
                    type="checkbox"
                    checked={formData.haceFactura}
                    onChange={(e) => setFormData({...formData, haceFactura: e.target.checked})}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="haceFactura" className="ml-2 block text-sm text-gray-900 dark:text-gray-300 font-medium">
                    ¿Realizas Factura?
                  </label>
                </div>

                {formData.haceFactura && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Factura</label>
                    <div className="flex gap-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="tipoFactura"
                          value="A"
                          checked={formData.tipoFactura === 'A'}
                          onChange={(e) => setFormData({...formData, tipoFactura: 'A'})}
                          className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Factura A</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="tipoFactura"
                          value="C"
                          checked={formData.tipoFactura === 'C'}
                          onChange={(e) => setFormData({...formData, tipoFactura: 'C'})}
                          className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Factura C</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DNI Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Foto del DNI (Verificación)</label>
              <div className={`flex items-center gap-4 p-4 border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-800 transition-colors ${
                dniUploadStatus === 'error' ? 'border-red-300 bg-red-50' : 
                dniUploadStatus === 'success' ? 'border-green-300 bg-green-50' : 
                'border-gray-300 dark:border-gray-600'
              }`}>
                {dniPreview ? (
                  <div className="relative h-32 w-auto">
                    <img 
                      src={dniPreview} 
                      alt="DNI Preview" 
                      className="h-full rounded-md object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { 
                        setDniFile(null); 
                        setDniPreview(null); 
                        setDniUploadStatus('idle');
                      }}
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
                  {dniUploadStatus === 'uploading' ? (
                    <div className="w-full">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Subiendo...</span>
                        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{Math.round(dniUploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${dniUploadProgress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label 
                        htmlFor="dni-upload" 
                        className={`cursor-pointer inline-flex items-center px-4 py-2 border shadow-sm text-sm font-medium rounded-md text-white ${
                          dniUploadStatus === 'error' 
                            ? 'bg-red-600 hover:bg-red-700 border-transparent' 
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {dniUploadStatus === 'error' ? (
                          <>
                            <RefreshCw size={16} className="mr-2" />
                            Reintentar Subida
                          </>
                        ) : (
                          <>
                            <Upload size={16} className="mr-2" />
                            {dniFile ? 'Cambiar Foto DNI' : 'Subir Foto DNI'}
                          </>
                        )}
                      </label>
                      <input 
                        id="dni-upload" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleDniChange}
                      />
                      {dniUploadStatus === 'success' && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                          <p className="text-sm text-green-700 dark:text-green-400 font-medium flex items-center">
                            <CheckCircle size={16} className="mr-2" /> 
                            ¡DNI subido correctamente!
                          </p>
                        </div>
                      )}
                      {dniUploadStatus === 'error' && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                          <p className="text-sm text-red-700 dark:text-red-400 font-medium flex items-center">
                            <AlertCircle size={16} className="mr-2" />
                            Error al subir. Intenta nuevamente.
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Sube una foto clara de tu DNI para verificar tu identidad. Esta imagen no será pública.
                      </p>
                    </>
                  )}
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
