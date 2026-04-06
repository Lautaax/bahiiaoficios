import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Send, ArrowLeft, User as UserIcon, FileText, X, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  isQuote?: boolean;
  quoteAmount?: number;
  quoteDescription?: string;
}

export const Chat: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<{ nombre: string, fotoUrl: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteDescription, setQuoteDescription] = useState('');

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
      
      // Mark as read if the last message was not sent by the current user
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.senderId !== currentUser.uid) {
          updateDoc(doc(db, 'chats', chatId), {
            hasUnread: false
          }).catch(err => console.error("Error marking as read:", err));
        }
      }

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
        updatedAt: serverTimestamp(),
        lastMessageSenderId: currentUser.uid,
        hasUnread: true
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteAmount || !quoteDescription.trim() || !currentUser || !chatId) return;

    try {
      const amount = parseFloat(quoteAmount);
      const desc = quoteDescription.trim();
      
      setShowQuoteModal(false);
      setQuoteAmount('');
      setQuoteDescription('');

      const text = `Presupuesto enviado: $${amount}`;

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUser.uid,
        text,
        timestamp: serverTimestamp(),
        isQuote: true,
        quoteAmount: amount,
        quoteDescription: desc
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageSenderId: currentUser.uid,
        hasUnread: true
      });
    } catch (error) {
      console.error("Error sending quote:", error);
    }
  };

  const generatePDF = (msg: Message) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESUPUESTO FORMAL', 20, 25);
    
    doc.setFontSize(10);
    doc.text('Bahía Oficios - Portal de Profesionales', pageWidth - 20, 25, { align: 'right' });
    
    // Content
    doc.setTextColor(31, 41, 55); // Gray-900
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date(msg.timestamp?.toDate()).toLocaleDateString()}`, 20, 55);
    doc.text(`Profesional: ${currentUser?.nombre}`, 20, 65);
    doc.text(`Cliente: ${otherUser?.nombre}`, 20, 75);
    
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.line(20, 85, pageWidth - 20, 85);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle del Trabajo:', 20, 100);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const splitDescription = doc.splitTextToSize(msg.quoteDescription || '', pageWidth - 40);
    doc.text(splitDescription, 20, 110);
    
    const finalY = 110 + (splitDescription.length * 7) + 20;
    
    doc.setFillColor(249, 250, 251); // Gray-50
    doc.rect(20, finalY - 10, pageWidth - 40, 25, 'F');
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(`TOTAL ESTIMADO: $${msg.quoteAmount?.toLocaleString('es-AR')}`, pageWidth / 2, finalY + 7, { align: 'center' });
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text('Este documento es un presupuesto estimativo generado a través de Bahía Oficios.', pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
    doc.text('La validez del mismo queda sujeta a la inspección presencial del profesional.', pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });
    
    doc.save(`Presupuesto-${msg.id.substring(0, 5)}.pdf`);
  };

  if (!currentUser) return <div>Por favor, inicia sesión para ver tus mensajes.</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 h-[80vh] flex flex-col mt-8">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-t-xl">
        <div className="flex items-center gap-4">
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
        {currentUser.rol === 'profesional' && (
          <button
            onClick={() => setShowQuoteModal(true)}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200 text-sm font-medium"
          >
            <FileText size={16} />
            Enviar Presupuesto
          </button>
        )}
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
                } ${msg.isQuote ? 'border-2 border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100' : ''}`}
              >
                {msg.isQuote ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold border-b border-indigo-200 dark:border-indigo-700 pb-2 mb-1">
                      <FileText size={18} />
                      Presupuesto Formal
                    </div>
                    <p className="text-sm">{msg.quoteDescription}</p>
                    <div className="text-lg font-bold mt-2">
                      Total: ${msg.quoteAmount?.toLocaleString('es-AR')}
                    </div>
                    <button 
                      onClick={() => generatePDF(msg)}
                      className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 transition-colors"
                    >
                      <Download size={14} /> Descargar Presupuesto PDF
                    </button>
                  </div>
                ) : (
                  <p>{msg.text}</p>
                )}
                <span className={`text-[10px] block mt-1 ${isMine && !msg.isQuote ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
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

      {/* Quote Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="text-indigo-600" />
                Enviar Presupuesto
              </h3>
              <button onClick={() => setShowQuoteModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSendQuote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monto Estimado ($)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Ej: 15000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción del Trabajo
                </label>
                <textarea
                  required
                  rows={4}
                  value={quoteDescription}
                  onChange={(e) => setQuoteDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="Detalla los materiales, mano de obra y tiempo estimado..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!quoteAmount || !quoteDescription.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Enviar Presupuesto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
