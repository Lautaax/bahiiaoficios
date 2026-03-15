import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Send, ArrowLeft, User as UserIcon } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
}

export const Chat: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<{ nombre: string, fotoUrl: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser || !chatId) return;

    // Fetch other user info
    const fetchOtherUser = async () => {
      try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          const otherUserId = data.clientId === currentUser.uid ? data.workerId : data.clientId;
          const otherUserDoc = await getDoc(doc(db, 'usuarios', otherUserId));
          if (otherUserDoc.exists()) {
            setOtherUser({
              nombre: otherUserDoc.data().nombre,
              fotoUrl: otherUserDoc.data().fotoUrl
            });
          }
        }
      } catch (error) {
        console.error("Error fetching other user:", error);
      }
    };

    fetchOtherUser();

    // Listen for messages
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [chatId, currentUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !chatId) return;

    try {
      const text = newMessage.trim();
      setNewMessage('');

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUser.uid,
        text,
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (!currentUser) return <div>Por favor, inicia sesión para ver tus mensajes.</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 h-[80vh] flex flex-col mt-8">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 rounded-t-xl">
        <Link to="/chats" className="text-gray-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-3">
          {otherUser?.fotoUrl ? (
            <img src={otherUser.fotoUrl} alt={otherUser.nombre} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <UserIcon size={20} className="text-gray-500 dark:text-gray-400" />
            </div>
          )}
          <h2 className="font-bold text-gray-900 dark:text-white">{otherUser?.nombre || 'Cargando...'}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUser.uid;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  isMine 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-none'
                }`}
              >
                <p>{msg.text}</p>
                <span className={`text-[10px] block mt-1 ${isMine ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
                  {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
