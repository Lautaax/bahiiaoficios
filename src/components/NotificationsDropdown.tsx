import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const NotificationsDropdown: React.FC = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'notificaciones'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Sort client-side to avoid composite index requirement
      notifs.sort((a, b) => {
        const timeA = a.fecha?.toMillis ? a.fecha.toMillis() : 0;
        const timeB = b.fecha?.toMillis ? b.fecha.toMillis() : 0;
        return timeB - timeA;
      });
      
      // Limit to 10 most recent
      notifs = notifs.slice(0, 10);
      
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n: any) => !n.leida).length);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      if (error.message.includes('requires an index')) {
        console.warn("Please create the required Firestore index for notifications.");
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notificaciones', id), { leida: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.leida);
      for (const notif of unreadNotifs) {
        await updateDoc(doc(db, 'notificaciones', notif.id), { leida: true });
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 relative"
        title="Notificaciones"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-4 top-20 sm:absolute sm:inset-auto sm:right-0 sm:mt-2 w-auto sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-indigo-600" />
              <h3 className="font-bold text-gray-900 dark:text-white">Notificaciones</h3>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
              >
                Limpiar todas
              </button>
            )}
          </div>
          
          <div className="max-h-[70vh] sm:max-h-96 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="bg-gray-100 dark:bg-gray-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell size={24} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No tienes notificaciones aún</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer relative ${!notif.leida ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                  onClick={() => {
                    if (!notif.leida) markAsRead(notif.id);
                  }}
                >
                  <div className="flex gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notif.leida ? 'bg-indigo-600' : 'bg-transparent'}`} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm font-bold leading-tight ${!notif.leida ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                          {notif.titulo}
                        </h4>
                        <span className="text-[10px] text-gray-400 font-medium ml-2 whitespace-nowrap">
                          {notif.fecha?.toDate ? new Date(notif.fecha.toDate()).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed mb-2 ${!notif.leida ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}`}>
                        {notif.mensaje}
                      </p>
                      {notif.tipo === 'nueva_solicitud' && (
                        <Link 
                          to="/dashboard-profesional" 
                          className="inline-flex items-center text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 transition-colors"
                        >
                          Ver solicitud →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 text-center">
              <button className="text-[11px] font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-widest">
                Ver historial completo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
