import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { Role } from '../types';
import { Upload, User, Briefcase, AlertCircle } from 'lucide-react';
import { ZONAS, PROFESSIONS } from '../constants';

export const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [telefono, setTelefono] = useState('');
  const [role, setRole] = useState<Role>('cliente');
  const [zona, setZona] = useState('Centro');
  const [rubro, setRubro] = useState('Electricista'); // Default for professionals
  const [rubrosSeleccionados, setRubrosSeleccionados] = useState<string[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [cuit, setCuit] = useState('');
  const [haceFactura, setHaceFactura] = useState(false);
  const [tipoFactura, setTipoFactura] = useState<'A' | 'C' | ''>('');
  const [haceUrgencias, setHaceUrgencias] = useState(false);
  const [disponibilidadInmediata, setDisponibilidadInmediata] = useState(true);
  const [matriculado, setMatriculado] = useState(false);
  const [preciosReferencia, setPreciosReferencia] = useState<{ servicio: string; precio: string }[]>([]);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const [step, setStep] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ['places']
  });

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        setDireccion(place.formatted_address);
      }
      
      // Try to extract neighborhood/sublocality for the "zona"
      const addressComponents = place.address_components;
      if (addressComponents) {
        const neighborhood = addressComponents.find(c => 
          c.types.includes('neighborhood') || 
          c.types.includes('sublocality') || 
          c.types.includes('sublocality_level_1')
        );
        if (neighborhood) {
          setZona(neighborhood.long_name);
        }
      }
    }
  };

  const rubros = PROFESSIONS.map(p => p.name);
  const zonas = ZONAS;

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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    
    // Simple strength calculation
    let strength = 0;
    if (val.length >= 6) strength += 1;
    if (val.length >= 10) strength += 1;
    if (/[A-Z]/.test(val)) strength += 1;
    if (/[0-9]/.test(val)) strength += 1;
    if (/[^A-Za-z0-9]/.test(val)) strength += 1;
    setPasswordStrength(strength);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar datos del paso 1
    if (!nombre || !email || !password || !telefono) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(telefono.replace(/\D/g, ''))) {
      setError('Por favor, ingresa un número de teléfono válido.');
      return;
    }

    if (!imageFile) {
      setError('La foto de perfil es obligatoria.');
      return;
    }

    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones.');
      return;
    }

    if (role === 'profesional') {
      setStep(2);
    } else {
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    
    if (role === 'profesional' && rubrosSeleccionados.length === 0) {
      setError('Debes seleccionar al menos un rubro.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      let fotoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`;

      // 2. Upload Image (Mandatory)
      if (imageFile) {
        try {
          const storageRef = ref(storage, `profile_images/${uid}`);
          await uploadBytes(storageRef, imageFile);
          fotoUrl = await getDownloadURL(storageRef);
        } catch (uploadError: any) {
          setError(uploadError.message || "Error al subir la imagen de perfil.");
          setLoading(false);
          return;
        }
      }

      // 3. Prepare User Data for Firestore
      const userData: any = {
        uid,
        nombre,
        nombreNegocio: nombreNegocio || null,
        email,
        telefono: telefono.replace(/\D/g, ''),
        rol: role, // Mapping local state 'role' to DB field 'rol'
        ciudad: 'Bahía Blanca',
        zona,
        createdAt: serverTimestamp(),
        fotoUrl,
      };

      // Add professional specific fields if applicable
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
          contactEmail: contactEmail || email,
          cuit,
          haceFactura,
          tipoFactura,
          haceUrgencias,
          disponibilidadInmediata,
          matriculado,
          nombreNegocio: nombreNegocio || null,
          preciosReferencia,
          badges: []
        };
      }

      // 4. Create Document in Firestore
      await setDoc(doc(db, 'usuarios', uid), userData);

      // 5. Redirect
      navigate('/');
      
    } catch (err: any) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('⚠️ Error de permisos en Firestore. Tu cuenta de autenticación se creó, pero no se pudo guardar tu perfil. \n\nSOLUCIÓN: Ve a la consola de Firebase -> Firestore Database -> Reglas, y pega el contenido del archivo "firestore.rules" de este proyecto.');
      } else {
        setError(err.message || 'Error al registrarse');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
              <User className="text-white" size={32} />
            </div>
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
            Crear Cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Únete a la comunidad de oficios de Bahía Blanca
          </p>
        </div>

        {/* Progress Bar */}
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-100">
                Paso {step} de {role === 'profesional' ? '2' : '1'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-indigo-600">
                {step === 1 ? (role === 'profesional' ? '50%' : '100%') : '100%'}
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-100">
            <div 
              style={{ width: step === 1 ? (role === 'profesional' ? '50%' : '100%') : '100%' }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-500"
            ></div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-r-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center">
              <AlertCircle className="text-red-400 mr-2" size={18} />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={step === 1 ? handleNextStep : handleSubmit}>
          {step === 1 ? (
            <div className="space-y-5">
              {/* Profile Image Upload */}
              <div className="flex flex-col items-center justify-center mb-8">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl group-hover:border-indigo-100 transition-all">
                    <img 
                      src={imagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre || 'User')}&background=random`} 
                      alt="Profile Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <label 
                    htmlFor="file-upload" 
                    className="absolute bottom-1 right-1 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 shadow-lg transform transition-transform hover:scale-110"
                  >
                    <Upload size={16} />
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

              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label htmlFor="nombre" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 ml-1">Nombre Completo</label>
                  <input
                    id="nombre"
                    name="nombre"
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
                  <input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    required
                    placeholder="Ej: 2915551234"
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm bg-gray-50"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 ml-1">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="tu@email.com"
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm bg-gray-50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 ml-1">Contraseña</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm bg-gray-50"
                    value={password}
                    onChange={handlePasswordChange}
                  />
                  {password && (
                    <div className="mt-2 flex gap-1.5 h-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div 
                          key={i} 
                          className={`flex-1 rounded-full transition-all duration-500 ${
                            i <= passwordStrength 
                              ? (passwordStrength <= 2 ? 'bg-red-400' : passwordStrength <= 4 ? 'bg-yellow-400' : 'bg-green-400') 
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="role" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 ml-1">Soy...</label>
                    <select
                      id="role"
                      name="role"
                      className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm"
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                    >
                      <option value="cliente">Cliente</option>
                      <option value="profesional">Profesional</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="zona" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 ml-1">Zona (Barrio)</label>
                    <input
                      id="zona"
                      type="text"
                      placeholder="Ej: Centro, Patagonia..."
                      className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm"
                      value={zona}
                      onChange={(e) => setZona(e.target.value)}
                      list="zonas-list"
                    />
                    <datalist id="zonas-list">
                      {zonas.map((z) => (
                        <option key={z} value={z} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <Briefcase className="text-indigo-600" size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Datos Profesionales</h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  ← Volver
                </button>
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
                <div>
                  <label htmlFor="direccion" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 ml-1">Dirección (Usa el buscador)</label>
                  {isLoaded ? (
                    <Autocomplete
                      onLoad={onLoad}
                      onPlaceChanged={onPlaceChanged}
                      options={{
                        componentRestrictions: { country: "ar" },
                        fields: ["address_components", "geometry", "formatted_address"],
                      }}
                    >
                      <input
                        id="direccion"
                        type="text"
                        placeholder="Busca tu dirección..."
                        className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                      />
                    </Autocomplete>
                  ) : (
                    <input
                      id="direccion"
                      type="text"
                      className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <label htmlFor="contactEmail" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 ml-1">Email de Contacto</label>
                  <input
                    id="contactEmail"
                    type="email"
                    placeholder={email}
                    className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

          <div>
            <div className="flex items-start gap-2 mb-4">
              <input
                id="acceptTerms"
                type="checkbox"
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <label htmlFor="acceptTerms" className="text-xs text-gray-600">
                Acepto los <Link to="/terms" className="text-indigo-600 hover:underline">Términos y Condiciones</Link> y la <Link to="/privacy" className="text-indigo-600 hover:underline">Política de Privacidad</Link>.
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : (step === 1 && role === 'profesional' ? 'Siguiente' : 'Registrarse')}
            </button>
          </div>
          
          <div className="text-center mt-4">
            <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
