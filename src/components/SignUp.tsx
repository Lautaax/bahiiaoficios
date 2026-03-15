import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { Role } from '../types';
import { Upload } from 'lucide-react';
import { uploadToImgur } from '../services/imgurService';

export const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [role, setRole] = useState<Role>('cliente');
  const [zona, setZona] = useState('Centro');
  const [rubro, setRubro] = useState('Electricista'); // Default for professionals
  const [descripcion, setDescripcion] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const rubros = ['Electricista', 'Gasista', 'Plomero', 'Albañil', 'Pintor', 'Carpintero', 'Jardinero', 'Mecánico', 'Cerrajero', 'Flete', 'Limpieza', 'Techista'];
  const zonas = ['Centro', 'Universitario', 'Villa Mitre', 'Patagonia', 'Norte', 'Bella Vista', 'Palihue', 'San Andrés', 'Tiro Federal', 'Ingeniero White'];

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

    try {
      // 1. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      let fotoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`;

      // 2. Upload Image if exists
      if (imageFile) {
        try {
          // Try Imgur upload first
          fotoUrl = await uploadToImgur(imageFile);
        } catch (uploadError) {
          console.error("Error uploading image to Imgur:", uploadError);
          
          // Fallback to Firebase Storage if Imgur fails (e.g. missing Client ID)
          try {
             console.log("Falling back to Firebase Storage...");
             const storageRef = ref(storage, `profile_images/${uid}`);
             await uploadBytes(storageRef, imageFile);
             fotoUrl = await getDownloadURL(storageRef);
          } catch (firebaseError) {
             console.error("Error uploading image to Firebase:", firebaseError);
             // Continue without custom image if both fail
          }
        }
      }

      // 3. Prepare User Data for Firestore
      const userData: any = {
        uid,
        nombre,
        email,
        telefono,
        rol: role, // Mapping local state 'role' to DB field 'rol'
        ciudad: 'Bahía Blanca',
        zona,
        createdAt: serverTimestamp(),
        fotoUrl,
      };

      // Add professional specific fields if applicable
      if (role === 'profesional') {
        userData.profesionalInfo = {
          rubro,
          descripcion: descripcion || 'Profesional registrado en Oficios Bahía.',
          isVip: false,
          ratingAvg: 0,
          reviewCount: 0,
          fotosTrabajos: [],
          telefono: telefono
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

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
              <span className="text-xs text-gray-500">Subir foto de perfil (opcional)</span>
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
                onChange={(e) => setPassword(e.target.value)}
              />
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

            {role === 'profesional' && (
              <>
                <div>
                  <label htmlFor="rubro" className="block text-sm font-medium text-gray-700">Rubro Principal</label>
                  <select
                    id="rubro"
                    name="rubro"
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
                  <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">Descripción Profesional</label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    rows={3}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Describe tus servicios..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrarse'}
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
