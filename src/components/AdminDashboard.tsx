import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { ShieldCheck, Trash2, Edit, CheckCircle, XCircle, X, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingDni, setViewingDni] = useState<User | null>(null);

  useEffect(() => {
    if (!currentUser?.isAdmin) {
      navigate('/');
      return;
    }

    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'usuarios'));
        const usersData = querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser, navigate]);

  const handleVerify = async (userId: string, currentStatus: boolean) => {
    if (!window.confirm(`¿Estás seguro de que quieres ${currentStatus ? 'quitar la verificación' : 'verificar'} a este profesional?`)) return;
    
    try {
      await updateDoc(doc(db, 'usuarios', userId), {
        'profesionalInfo.isVerified': !currentStatus
      });
      setUsers(users.map(u => u.uid === userId && u.profesionalInfo ? { ...u, profesionalInfo: { ...u.profesionalInfo, isVerified: !currentStatus } } : u));
    } catch (error) {
      console.error("Error updating verification:", error);
      alert("Error al actualizar la verificación.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("¿Estás seguro de que quieres ELIMINAR a este usuario? Esta acción no se puede deshacer.")) return;
    
    try {
      await deleteDoc(doc(db, 'usuarios', userId));
      setUsers(users.filter(u => u.uid !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error al eliminar el usuario.");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updateData: any = {
        nombre: editingUser.nombre,
        telefono: editingUser.telefono,
        rol: editingUser.rol,
        isAdmin: editingUser.isAdmin || false
      };

      if (editingUser.rol === 'profesional' && editingUser.profesionalInfo) {
        updateData.profesionalInfo = editingUser.profesionalInfo;
      }

      await updateDoc(doc(db, 'usuarios', editingUser.uid), updateData);
      setUsers(users.map(u => u.uid === editingUser.uid ? editingUser : u));
      setEditingUser(null);
      alert("Usuario actualizado correctamente.");
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Error al actualizar el usuario.");
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando panel de administración...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
        <ShieldCheck className="text-indigo-600" size={32} />
        Panel de Administración
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Usuario</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Rol</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Email</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Verificado</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-300 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.uid} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={user.fotoUrl || `https://ui-avatars.com/api/?name=${user.nombre}`} alt={user.nombre} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{user.nombre}</p>
                        <p className="text-xs text-gray-500">{user.slug || user.uid}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${user.rol === 'profesional' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                      {user.rol}
                    </span>
                    {user.isAdmin && (
                      <span className="ml-2 px-2 py-1 rounded-full text-xs font-bold uppercase bg-red-100 text-red-700">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{user.email}</td>
                  <td className="p-4">
                    {user.rol === 'profesional' ? (
                      <button 
                        onClick={() => handleVerify(user.uid, !!user.profesionalInfo?.isVerified)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${user.profesionalInfo?.isVerified ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
                      >
                        {user.profesionalInfo?.isVerified ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        {user.profesionalInfo?.isVerified ? 'Verificado' : 'No Verificado'}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {user.rol === 'profesional' && user.profesionalInfo?.fotoDni && (
                        <button 
                          onClick={() => setViewingDni(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver DNI"
                        >
                          <ImageIcon size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => navigate(`/profesional/${user.slug || user.uid}`)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Ver Perfil Público"
                      >
                        <ShieldCheck size={18} />
                      </button>
                      <button 
                        onClick={() => setEditingUser(user)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Editar Usuario"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.uid)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar Usuario"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Editar Usuario</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={editingUser.nombre} 
                  onChange={(e) => setEditingUser({...editingUser, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                <input 
                  type="text" 
                  value={editingUser.telefono || ''} 
                  onChange={(e) => setEditingUser({...editingUser, telefono: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                <select 
                  value={editingUser.rol} 
                  onChange={(e) => setEditingUser({...editingUser, rol: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="cliente">Cliente</option>
                  <option value="profesional">Profesional</option>
                </select>
              </div>
              
              {editingUser.rol === 'profesional' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rubro</label>
                    <input 
                      type="text" 
                      value={editingUser.profesionalInfo?.rubro || ''} 
                      onChange={(e) => setEditingUser({
                        ...editingUser, 
                        profesionalInfo: { ...editingUser.profesionalInfo, rubro: e.target.value } as any
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                    <textarea 
                      value={editingUser.profesionalInfo?.descripcion || ''} 
                      onChange={(e) => setEditingUser({
                        ...editingUser, 
                        profesionalInfo: { ...editingUser.profesionalInfo, descripcion: e.target.value } as any
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      rows={3}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="isAdmin"
                  checked={editingUser.isAdmin || false} 
                  onChange={(e) => setEditingUser({...editingUser, isAdmin: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isAdmin" className="text-sm font-medium text-gray-700 dark:text-gray-300">Es Administrador</label>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingDni && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Verificación de DNI: {viewingDni.nombre}</h3>
              <button onClick={() => setViewingDni(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex flex-col items-center">
              {viewingDni.profesionalInfo?.fotoDni ? (
                <img 
                  src={viewingDni.profesionalInfo.fotoDni} 
                  alt="DNI" 
                  className="max-w-full max-h-[60vh] object-contain rounded-lg border border-gray-200 dark:border-gray-700" 
                />
              ) : (
                <p className="text-gray-500">No hay foto de DNI disponible.</p>
              )}
              
              <div className="flex gap-4 mt-6 w-full justify-center">
                <button 
                  onClick={() => {
                    handleVerify(viewingDni.uid, false);
                    setViewingDni(null);
                  }}
                  className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={18} /> Aceptar y Verificar
                </button>
                <button 
                  onClick={() => {
                    handleVerify(viewingDni.uid, true); // this un-verifies
                    setViewingDni(null);
                  }}
                  className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <XCircle size={18} /> Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
