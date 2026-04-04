import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { Role } from '../types';
import { Upload } from 'lucide-react';
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
  const [disponibilidadInmediata, setDisponibilidadInmediata] = useState(false);
  const [matriculado, setMatriculado] = useState(false);
  const [preciosReferencia, setPreciosReferencia] = useState<{ servicio: string; precio: string }[]>([]);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const [step, setStep] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Crear Cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Únete a la comunidad de oficios de Bahía Blanca
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={step === 1 ? handleNextStep : handleSubmit}>
          {step === 1 ? (
            <div className="rounded-md shadow-sm space-y-4">
              {/* Profile Image Upload */}
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
                <span className="text-xs text-gray-500 font-medium">Subir foto de perfil (Obligatorio)</span>
              </div>

              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="nombreNegocio" className="block text-sm font-medium text-gray-700">Nombre del Negocio (Opcional)</label>
                <input
                  id="nombreNegocio"
                  name="nombreNegocio"
                  type="text"
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={nombreNegocio}
                  onChange={(e) => setNombreNegocio(e.target.value)}
                  placeholder="Ej: Electricidad Bahía"
                />
              </div>

              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={password}
                  onChange={handlePasswordChange}
                />
                {password && (
                  <div className="mt-1 flex gap-1 h-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div 
                        key={i} 
                        className={`flex-1 rounded-full ${
                          i <= passwordStrength 
                            ? (passwordStrength <= 2 ? 'bg-red-400' : passwordStrength <= 4 ? 'bg-yellow-400' : 'bg-green-400') 
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                )}
                <p className="mt-1 text-[10px] text-gray-500">Mínimo 6 caracteres. Usa mayúsculas, números y símbolos para mayor seguridad.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">Soy...</label>
                  <select
                    id="role"
                    name="role"
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
                    name="zona"
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
            </div>
          ) : (
            <div className="rounded-md shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-indigo-600">Datos Profesionales</h3>
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="text-xs text-gray-500 hover:text-indigo-600"
                >
                  ← Volver
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rubros (Selecciona hasta 5)</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-md">
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
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">Descripción de tus servicios</label>
                <textarea
                  id="descripcion"
                  rows={3}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Ej: Gasista matriculado con 10 años de experiencia..."
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
                    placeholder={email}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Precios de Referencia (Opcional)</label>
                <div className="space-y-2">
                  {preciosReferencia.map((p, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Servicio"
                        className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded-md"
                        value={p.servicio}
                        onChange={(e) => {
                          const newPrecios = [...preciosReferencia];
                          newPrecios[index].servicio = e.target.value;
                          setPreciosReferencia(newPrecios);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Precio"
                        className="w-24 px-3 py-1 text-xs border border-gray-300 rounded-md"
                        value={p.precio}
                        onChange={(e) => {
                          const newPrecios = [...preciosReferencia];
                          newPrecios[index].precio = e.target.value;
                          setPreciosReferencia(newPrecios);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setPreciosReferencia(preciosReferencia.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPreciosReferencia([...preciosReferencia, { servicio: '', precio: '' }])}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    + Agregar precio de referencia
                  </button>
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
