import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db, storage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { User as UserType, Role } from '../types';
import { Camera, Save, AlertCircle, Upload, UserCog, FileText, Phone, MapPin, Mail, CheckCircle, AlertTriangle, RefreshCw, User, Briefcase, Trash2, Image as IconImage, ShieldCheck, Star, LayoutDashboard, CreditCard, BadgeCheck, Sun, Moon, Settings } from 'lucide-react';
import { VipButton } from './VipButton';
import { useSearchParams } from 'react-router-dom';
import { PROFESSIONS, ZONAS } from '../constants';
import { motion } from 'motion/react';

interface ProfileProps {
  initialSection?: 'datos' | 'profesional' | 'portafolio' | 'precios' | 'verificacion' | 'preferencias';
}

export const Profile: React.FC<ProfileProps> = ({ initialSection }) => {
  const { currentUser } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<'datos' | 'profesional' | 'portafolio' | 'precios' | 'verificacion' | 'preferencias'>(initialSection || 'datos');

  const [formData, setFormData] = useState({
    nombre: '',
    nombreNegocio: '',
    zona: '',
    fotoUrl: '',
    rubro: '',
    rubros: [] as string[],
    descripcion: '',
    rol: 'cliente' as Role,
    telefono: '',
    direccion: '',
    contactEmail: '',
    fotoDni: '',
    cuit: '',
    haceFactura: false,
    tipoFactura: '' as 'A' | 'C' | '',
    haceUrgencias: false,
    disponibilidadInmediata: false,
    matriculado: false,
    preciosReferencia: [] as { servicio: string; precio: string }[],
    badges: [] as string[],
    fotoPortada: ''
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [dniFile, setDniFile] = useState<File | null>(null);
  const [dniPreview, setDniPreview] = useState<string | null>(null);
  const [dniUploadStatus, setDniUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [dniUploadProgress, setDniUploadProgress] = useState(0);

  // Works Images State
  const [existingWorkImages, setExistingWorkImages] = useState<{ url: string; descripcion: string }[]>([]);
  const [newWorkFiles, setNewWorkFiles] = useState<{ file: File; descripcion: string }[]>([]);
  const [newWorkPreviews, setNewWorkPreviews] = useState<string[]>([]);
  const [uploadingWorks, setUploadingWorks] = useState(false);
  const [worksUploadProgress, setWorksUploadProgress] = useState<{ [key: number]: number }>({});
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      setSuccess(true);
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
        rubros: currentUser.profesionalInfo?.rubros || (currentUser.profesionalInfo?.rubro ? [currentUser.profesionalInfo.rubro] : []),
        descripcion: currentUser.profesionalInfo?.descripcion || '',
        rol: currentUser.rol || 'cliente',
        telefono: currentUser.profesionalInfo?.telefono || '',
        direccion: currentUser.profesionalInfo?.direccion || '',
        contactEmail: currentUser.profesionalInfo?.contactEmail || currentUser.email || '',
        fotoDni: currentUser.profesionalInfo?.fotoDni || '',
        cuit: currentUser.profesionalInfo?.cuit || '',
        haceFactura: currentUser.profesionalInfo?.haceFactura || false,
        tipoFactura: currentUser.profesionalInfo?.tipoFactura || '',
        haceUrgencias: currentUser.profesionalInfo?.haceUrgencias || false,
        disponibilidadInmediata: currentUser.profesionalInfo?.disponibilidadInmediata || false,
        matriculado: currentUser.profesionalInfo?.matriculado || false,
        nombreNegocio: currentUser.profesionalInfo?.nombreNegocio || currentUser.nombreNegocio || '',
        preciosReferencia: currentUser.profesionalInfo?.preciosReferencia || [],
        badges: currentUser.profesionalInfo?.badges || [],
        fotoPortada: currentUser.profesionalInfo?.fotoPortada || ''
      });
      setImagePreview(currentUser.fotoUrl || null);
      setDniPreview(currentUser.profesionalInfo?.fotoDni || null);
      if (currentUser.profesionalInfo?.fotoDni) {
        setDniUploadStatus('success');
      }
      
      const existing = currentUser.profesionalInfo?.fotosTrabajosDetalle || 
                       (currentUser.profesionalInfo?.fotosTrabajos || []).map(url => ({ url, descripcion: '' }));
      setExistingWorkImages(existing);
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

  const handleWorkImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      processWorkFiles(files);
    }
  };

  const processWorkFiles = (files: File[]) => {
    const totalCurrent = existingWorkImages.length + newWorkFiles.length;
    const remaining = 20 - totalCurrent;
    
    if (remaining <= 0) {
      setError('Has alcanzado el límite máximo de 20 fotos para tu portafolio.');
      return;
    }

    const filesToAdd = files.slice(0, remaining);
    const newEntries = filesToAdd.map(file => ({ file, descripcion: '' }));
    setNewWorkFiles(prev => [...prev, ...newEntries]);
    
    const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
    setNewWorkPreviews(prev => [...prev, ...newPreviews]);

    if (files.length > remaining) {
      setError(`Solo se agregaron ${remaining} fotos. El límite es de 20.`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files) as File[];
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      processWorkFiles(imageFiles);
    }
  };

  const removeExistingWorkImage = (index: number) => {
    setExistingWorkImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewWorkImage = (index: number) => {
    setNewWorkFiles(prev => prev.filter((_, i) => i !== index));
    setNewWorkPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const addPriceReference = () => {
    setFormData(prev => ({
      ...prev,
      preciosReferencia: [...prev.preciosReferencia, { servicio: '', precio: '' }]
    }));
  };

  const removePriceReference = (index: number) => {
    setFormData(prev => ({
      ...prev,
      preciosReferencia: prev.preciosReferencia.filter((_, i) => i !== index)
    }));
  };

  const updatePriceReference = (index: number, field: 'servicio' | 'precio', value: string) => {
    const updated = [...formData.preciosReferencia];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, preciosReferencia: updated }));
  };

  const updateExistingWorkDescription = (index: number, descripcion: string) => {
    const updated = [...existingWorkImages];
    updated[index] = { ...updated[index], descripcion };
    setExistingWorkImages(updated);
  };

  const updateNewWorkDescription = (index: number, descripcion: string) => {
    const updated = [...newWorkFiles];
    updated[index] = { ...updated[index], descripcion };
    setNewWorkFiles(updated);
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
      let finalWorkImages = [...existingWorkImages];

      if (imageFile) {
        try {
          const imageCompression = (await import('browser-image-compression')).default;
          const compressed = await imageCompression(imageFile, { maxSizeMB: 0.8, maxWidthOrHeight: 1280, fileType: 'image/webp' });
          const webpFile = new File([compressed], 'profile.webp', { type: 'image/webp' });
          const storageRef = ref(storage, `profile_images/${currentUser.uid}`);
          await uploadBytes(storageRef, webpFile);
          newFotoUrl = await getDownloadURL(storageRef);
        } catch (uploadError) {
          setError('Error al subir la imagen de perfil.');
          setLoading(false);
          return;
        }
      }

      if (dniFile) {
        setDniUploadStatus('uploading');
        setDniUploadProgress(0);
        try {
          const imageCompression = (await import('browser-image-compression')).default;
          const compressedFile = await imageCompression(dniFile, { maxSizeMB: 1, maxWidthOrHeight: 1920, fileType: 'image/webp' });
          const webpFile = new File([compressedFile], 'dni.webp', { type: 'image/webp' });
          const storageRef = ref(storage, `dni_images/${currentUser.uid}`);
          const uploadTask = uploadBytesResumable(storageRef, webpFile);
          newFotoDni = await new Promise<string>((resolve, reject) => {
            uploadTask.on('state_changed', 
              (snap) => setDniUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
              (err) => reject(err),
              async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
            );
          });
          setDniUploadStatus('success');
        } catch (err) {
          setDniUploadStatus('error');
          setError('Error al subir el DNI.');
          setLoading(false);
          return;
        }
      }

      if (newWorkFiles.length > 0) {
        setUploadingWorks(true);
        try {
          const imageCompression = (await import('browser-image-compression')).default;
          const uploadPromises = newWorkFiles.map(async (item, index) => {
            const compressed = await imageCompression(item.file, { maxSizeMB: 0.8, maxWidthOrHeight: 1280, fileType: 'image/webp' });
            const webpFile = new File([compressed], `${Date.now()}_${index}.webp`, { type: 'image/webp' });
            const storageRef = ref(storage, `work_images/${currentUser.uid}/${webpFile.name}`);
            const uploadTask = uploadBytesResumable(storageRef, webpFile);
            const url = await new Promise<string>((resolve, reject) => {
              uploadTask.on('state_changed',
                (snap) => setWorksUploadProgress(prev => ({ ...prev, [index]: (snap.bytesTransferred / snap.totalBytes) * 100 })),
                (err) => reject(err),
                async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
              );
            });
            return { url, descripcion: item.descripcion };
          });
          const results = await Promise.all(uploadPromises);
          finalWorkImages = [...finalWorkImages, ...results];
        } catch (err) {
          setError('Error al subir imágenes del portafolio.');
        } finally {
          setUploadingWorks(false);
        }
      }

      const updateData: any = {
        nombre: formData.nombre,
        nombreNegocio: formData.nombreNegocio || null,
        zona: formData.zona,
        fotoUrl: newFotoUrl,
        rol: formData.rol,
        isAdmin: currentUser.email === 'lautaroj.aguilera@gmail.com'
      };

      if (formData.rol === 'profesional') {
        updateData.profesionalInfo = {
          rubro: formData.rubros[0] || formData.rubro,
          rubros: formData.rubros,
          descripcion: formData.descripcion,
          isVip: currentUser.profesionalInfo?.isVip || false,
          ratingAvg: currentUser.profesionalInfo?.ratingAvg || 0,
          reviewCount: currentUser.profesionalInfo?.reviewCount || 0,
          fotosTrabajos: finalWorkImages.map(img => img.url),
          fotosTrabajosDetalle: finalWorkImages,
          fotoPortada: formData.fotoPortada,
          telefono: formData.telefono,
          direccion: formData.direccion,
          contactEmail: formData.contactEmail,
          fotoDni: newFotoDni,
          cuit: formData.cuit,
          haceFactura: formData.haceFactura,
          tipoFactura: formData.haceFactura ? formData.tipoFactura : null,
          haceUrgencias: formData.haceUrgencias,
          disponibilidadInmediata: formData.disponibilidadInmediata,
          matriculado: formData.matriculado,
          nombreNegocio: formData.nombreNegocio || null,
          preciosReferencia: formData.preciosReferencia,
          badges: formData.badges
        };
      }

      await updateDoc(userRef, updateData);
      setNewWorkFiles([]);
      setNewWorkPreviews([]);
      setExistingWorkImages(finalWorkImages);
      setSuccess(true);
    } catch (err) {
      setError('Error al actualizar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  const calculateCompleteness = () => {
    let score = 0;
    let total = 5;
    if (formData.nombre) score++;
    if (formData.zona) score++;
    if (formData.fotoUrl) score++;
    if (formData.telefono) score++;
    
    if (formData.rol === 'profesional') {
      total += 4;
      if (formData.rubros.length > 0) score++;
      if (formData.descripcion) score++;
      if (existingWorkImages.length > 0) score++;
      if (formData.fotoDni) score++;
    } else {
      score++; // Placeholder for client-only fields if any
    }
    
    return Math.round((score / total) * 100);
  };

  const completeness = calculateCompleteness();

  const sections = [
    { id: 'datos', label: 'Datos Básicos', icon: User },
    { id: 'profesional', label: 'Info Profesional', icon: Briefcase, hide: formData.rol !== 'profesional' },
    { id: 'portafolio', label: 'Portafolio', icon: IconImage, hide: formData.rol !== 'profesional' },
    { id: 'precios', label: 'Precios', icon: CreditCard, hide: formData.rol !== 'profesional' },
    { id: 'verificacion', label: 'Verificación', icon: BadgeCheck, hide: formData.rol !== 'profesional' },
    { id: 'preferencias', label: 'Preferencias', icon: Settings },
  ];

  if (!currentUser) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="relative mb-8 rounded-3xl overflow-hidden bg-indigo-600 h-32 sm:h-48 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-90"></div>
        <div className="absolute inset-0 flex items-end p-6 sm:p-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative">
              <img 
                src={imagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.nombre)}&background=random`} 
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white dark:border-gray-800 shadow-xl" 
              />
              <label htmlFor="profile-upload-header" className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 text-indigo-600 p-2 rounded-xl cursor-pointer shadow-lg hover:scale-110 transition-transform">
                <Camera size={16} />
              </label>
              <input id="profile-upload-header" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
            <div className="text-white">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{formData.nombre || 'Tu Perfil'}</h1>
              <p className="text-indigo-100 text-sm sm:text-base font-medium opacity-90">
                {formData.rol === 'profesional' ? (formData.rubros[0] || 'Profesional') : 'Cliente'} • {formData.zona || 'Bahía Blanca'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Menu */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden lg:sticky lg:top-24">
            <div className="hidden lg:block p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">Configuración</h3>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Perfil Completo</span>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{completeness}%</span>
                </div>
                <div className="w-full bg-indigo-200 dark:bg-indigo-900/40 rounded-full h-1.5">
                  <div 
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-1000" 
                    style={{ width: `${completeness}%` }}
                  ></div>
                </div>
                {completeness < 100 && (
                  <p className="text-[9px] text-indigo-500/80 dark:text-indigo-400/60 mt-1.5 font-medium leading-tight">
                    Completa tu perfil para ganar más confianza de los clientes.
                  </p>
                )}
              </div>
            </div>
            <nav className="p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible custom-scrollbar">
              {sections.filter(s => !s.hide).map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as any)}
                  className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeSection === section.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <section.icon size={18} />
                  <span className="whitespace-nowrap">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {sections.find(s => s.id === activeSection)?.label}
            </h2>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
              Guardar
            </button>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl flex items-center border border-green-100 dark:border-green-800">
              <CheckCircle size={20} className="mr-3" /> Perfil actualizado correctamente.
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl flex items-center border border-red-100 dark:border-red-800">
              <AlertCircle size={20} className="mr-3" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {activeSection === 'datos' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setFormData({...formData, rol: 'cliente'})}
                    className={`cursor-pointer p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${formData.rol === 'cliente' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-100 dark:border-gray-700'}`}
                  >
                    <User size={32} />
                    <span className="font-bold">Soy Cliente</span>
                  </div>
                  <div 
                    onClick={() => setFormData({...formData, rol: 'profesional'})}
                    className={`cursor-pointer p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${formData.rol === 'profesional' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-100 dark:border-gray-700'}`}
                  >
                    <Briefcase size={32} />
                    <span className="font-bold">Soy Profesional</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre Completo</label>
                    <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre del Negocio (Opcional)</label>
                    <input type="text" name="nombreNegocio" value={formData.nombreNegocio} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej: Electricidad Bahía" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Zona</label>
                    <select name="zona" value={formData.zona} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Seleccionar Zona</option>
                      {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'profesional' && formData.rol === 'profesional' && (
              <div className="space-y-8">
                <VipButton />
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Rubros (Hasta 5)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 custom-scrollbar">
                      {PROFESSIONS.map(p => {
                        const isSelected = formData.rubros.includes(p.name);
                        return (
                          <button key={p.name} type="button" onClick={() => setFormData({...formData, rubros: isSelected ? formData.rubros.filter(r => r !== p.name) : formData.rubros.length < 5 ? [...formData.rubros, p.name] : formData.rubros})} className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                            <p.icon size={16} /> <span className="truncate">{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Descripción</label>
                    <textarea name="descripcion" rows={5} value={formData.descripcion} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="WhatsApp" className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700" />
                    <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} placeholder="Email de contacto" className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700" />
                    <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Dirección" className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700" />
                    <input type="text" name="cuit" value={formData.cuit} onChange={handleChange} placeholder="CUIT/CUIL" className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 cursor-pointer">
                      <input type="checkbox" checked={formData.haceFactura} onChange={(e) => setFormData({...formData, haceFactura: e.target.checked})} className="w-5 h-5 text-indigo-600" />
                      <span className="font-bold text-gray-700 dark:text-gray-300">Emito Factura</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 cursor-pointer">
                      <input type="checkbox" checked={formData.haceUrgencias} onChange={(e) => setFormData({...formData, haceUrgencias: e.target.checked})} className="w-5 h-5 text-red-600" />
                      <span className="font-bold text-gray-700 dark:text-gray-300">Urgencias 24hs</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 cursor-pointer">
                      <input type="checkbox" checked={formData.matriculado} onChange={(e) => setFormData({...formData, matriculado: e.target.checked})} className="w-5 h-5 text-blue-600" />
                      <span className="font-bold text-gray-700 dark:text-gray-300">Matriculado</span>
                    </label>
                  </div>
                  <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><CreditCard /> Mercado Pago</h3>
                    <p className="text-sm text-gray-600 mb-6">Vinculá tu cuenta para cobrar señas.</p>
                    {currentUser?.mpConnect?.access_token ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 font-bold">Cuenta Vinculada</div>
                    ) : (
                      <button type="button" onClick={() => window.location.href = `https://auth.mercadopago.com.ar/authorization?client_id=6870942065529124&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(window.location.origin + '/profile')}`} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">Vincular MP</button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'portafolio' && formData.rol === 'profesional' && (
              <div className="space-y-8">
                <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`border-2 border-dashed rounded-2xl p-12 text-center ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                  <input type="file" id="work-images" multiple accept="image/*" className="hidden" onChange={handleWorkImagesChange} />
                  <label htmlFor="work-images" className="cursor-pointer flex flex-col items-center gap-4">
                    <Upload size={32} className="text-indigo-600" />
                    <p className="font-bold">Arrastrá tus fotos acá o hacé clic</p>
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {existingWorkImages.map((item, idx) => (
                    <div key={`ex-${idx}`} className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200">
                      <img src={item.url} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeExistingWorkImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                      <button type="button" onClick={() => setFormData({...formData, fotoPortada: item.url})} className={`absolute bottom-1 right-1 p-1 rounded-full ${formData.fotoPortada === item.url ? 'bg-yellow-500 text-white' : 'bg-white text-gray-600 opacity-0 group-hover:opacity-100'}`}><Star size={12} fill={formData.fotoPortada === item.url ? "currentColor" : "none"} /></button>
                    </div>
                  ))}
                  {newWorkPreviews.map((url, idx) => (
                    <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-indigo-500">
                      <img src={url} className="w-full h-full object-cover" />
                      {worksUploadProgress > 0 && worksUploadProgress < 100 && (
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-2">
                          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-1">
                            <motion.div 
                              className="h-full bg-indigo-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${worksUploadProgress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold">{Math.round(worksUploadProgress)}%</span>
                        </div>
                      )}
                      <button type="button" onClick={() => removeNewWorkImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'precios' && formData.rol === 'profesional' && (
              <div className="space-y-6">
                {formData.preciosReferencia.map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <input type="text" value={item.servicio} onChange={(e) => updatePriceReference(idx, 'servicio', e.target.value)} placeholder="Servicio" className="flex-1 px-4 py-2 rounded-xl border" />
                    <input type="text" value={item.precio} onChange={(e) => updatePriceReference(idx, 'precio', e.target.value)} placeholder="Precio" className="w-32 px-4 py-2 rounded-xl border" />
                    <button type="button" onClick={() => removePriceReference(idx)} className="text-red-500"><Trash2 size={20} /></button>
                  </div>
                ))}
                <button type="button" onClick={addPriceReference} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:text-indigo-600 transition-all font-bold">+ Agregar Precio</button>
              </div>
            )}

            {activeSection === 'verificacion' && formData.rol === 'profesional' && (
              <div className="space-y-8">
                <div className="flex flex-col items-center gap-6 p-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="relative w-full max-w-md aspect-[1.6/1] bg-white dark:bg-gray-700 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center">
                    {dniPreview ? <img src={dniPreview} className="w-full h-full object-cover" /> : <FileText size={48} className="text-gray-300" />}
                    {dniUploadStatus === 'uploading' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
          <div className="w-full max-w-[200px] h-2 bg-white/20 rounded-full overflow-hidden mb-2">
            <motion.div 
              className="h-full bg-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${dniUploadProgress}%` }}
            />
          </div>
          <span className="text-sm font-bold">Subiendo {Math.round(dniUploadProgress)}%</span>
        </div>
      )}
                  </div>
                  <label className="cursor-pointer bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <Camera size={20} /> {dniPreview ? 'Cambiar Foto' : 'Subir Foto DNI'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleDniChange} />
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'preferencias' && (
              <div className="space-y-8">
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Sun size={20} className="text-indigo-600" />
                    Apariencia
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-200">Modo Oscuro</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cambia entre el tema claro y oscuro de la aplicación.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${resolvedTheme === 'dark' ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${resolvedTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
