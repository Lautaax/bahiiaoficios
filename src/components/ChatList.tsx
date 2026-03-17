import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { MessageSquare, User as UserIcon, Clock } from 'lucide-react';

interface ChatPreview {
  id: string;
  clientId: string;
  workerId: string;
  clientName: string;
  workerName: string;
  lastMessage: string;
  lastMessageTime: any;
  updatedAt: any;
  otherUserFotoUrl?: string;
  hasUnread?: boolean;
  lastMessageSenderId?: string;
}

export const ChatList: React.FC = () => {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const isClient = currentUser.rol === 'cliente';
    const field = isClient ? 'clientId' : 'workerId';

    const q = query(
      collection(db, 'chats'),
      where(field, '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatData: ChatPreview[] = [];
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data() as ChatPreview;
        data.id = docSnapshot.id;

        // Fetch other user's photo
        const otherUserId = isClient ? data.workerId : data.clientId;
        try {
          const otherUserDoc = await getDoc(doc(db, 'usuarios', otherUserId));
          if (otherUserDoc.exists()) {
            data.otherUserFotoUrl = otherUserDoc.data().fotoUrl;
          }
        } catch (error) {
          console.error("Error fetching other user photo:", error);
        }

        chatData.push(data);
      }
      
      // Sort client-side to avoid composite index requirement
      chatData.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return timeB - timeA;
      });

      setChats(chatData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching chats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (!currentUser) return <div className="p-8 text-center text-gray-500">Por favor, inicia sesión para ver tus mensajes.</div>;

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando mensajes...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-xl text-indigo-600 dark:text-indigo-400">
          <MessageSquare size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Mensajes</h1>
      </div>

      {chats.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <div className="bg-gray-50 dark:bg-gray-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <MessageSquare size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No tienes mensajes</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {currentUser.rol === 'cliente' 
              ? 'Contacta a un profesional desde su perfil para iniciar una conversación.'
              : 'Los clientes te contactarán por este medio para realizar consultas.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          {chats.map((chat) => {
            const isClient = currentUser.rol === 'cliente';
            const otherName = isClient ? chat.workerName : chat.clientName;
            const isUnread = chat.hasUnread && chat.lastMessageSenderId !== currentUser.uid;
            
            return (
              <Link 
                key={chat.id} 
                to={`/chat/${chat.id}`}
                className={`flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isUnread ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
              >
                <div className="relative">
                  {chat.otherUserFotoUrl ? (
                    <img src={chat.otherUserFotoUrl} alt={otherName} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <UserIcon size={24} />
                    </div>
                  )}
                  {isUnread && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`truncate ${isUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
                      {otherName}
                    </h3>
                    <span className={`text-xs whitespace-nowrap ml-2 flex items-center gap-1 ${isUnread ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      <Clock size={10} />
                      {chat.lastMessageTime?.toDate ? chat.lastMessageTime.toDate().toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${isUnread ? 'font-medium text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                    {chat.lastMessage || 'Nuevo chat'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
