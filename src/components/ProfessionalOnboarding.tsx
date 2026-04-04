import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Briefcase, Image as ImageIcon, DollarSign, X, ChevronRight, ChevronLeft, Star } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export const ProfessionalOnboarding: React.FC<{ userId: string }> = ({ userId }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  const steps: OnboardingStep[] = [
    {
      title: "¡Bienvenido a Bahía Oficios!",
      description: "Estamos felices de tenerte. Vamos a configurar tu perfil para que consigas más clientes.",
      icon: <Briefcase size={48} />,
      color: "bg-indigo-500"
    },
    {
      title: "Precios de Referencia",
      description: "Agrega precios base para tus servicios más comunes. Esto ayuda a los clientes a tener una idea clara antes de contactarte.",
      icon: <DollarSign size={48} />,
      color: "bg-green-500"
    },
    {
      title: "Tu Portafolio",
      description: "Sube fotos de tus trabajos realizados. Los perfiles con fotos tienen un 80% más de probabilidades de ser contratados.",
      icon: <ImageIcon size={48} />,
      color: "bg-purple-500"
    },
    {
      title: "Imagen Destacada",
      description: "Elige tu mejor foto como 'Imagen de Portada' usando el icono de estrella. Será lo primero que vean los clientes en los resultados de búsqueda.",
      icon: <Star size={48} className="fill-white" />,
      color: "bg-amber-500"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const userRef = doc(db, 'usuarios', userId);
      await updateDoc(userRef, {
        'profesionalInfo.onboardingCompleted': true
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className={`${step.color} p-8 text-white flex flex-col items-center text-center transition-colors duration-500`}>
          <div className="mb-6 p-4 bg-white/20 rounded-2xl backdrop-blur-md">
            {step.icon}
          </div>
          <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
          <div className="flex gap-1 mt-4">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-white' : 'w-2 bg-white/40'}`} 
              />
            ))}
          </div>
        </div>

        <div className="p-8">
          <p className="text-gray-600 dark:text-gray-300 text-center text-lg leading-relaxed mb-8">
            {step.description}
          </p>

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-1 px-4 py-2 rounded-xl font-medium transition-colors ${
                currentStep === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <ChevronLeft size={20} />
              Atrás
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
            >
              {currentStep === steps.length - 1 ? '¡Empezar!' : 'Siguiente'}
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
