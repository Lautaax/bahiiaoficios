import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceSearchOptions {
  onResult?: (transcript: string) => void;
  lang?: string;
}

export function useVoiceSearch({ onResult, lang = 'es-AR' }: UseVoiceSearchOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const clearFeedbackAfter = useCallback((delayMs: number = 3500) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSpeechFeedback(null);
    }, delayMs);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechFeedback('Tu navegador no soporta búsqueda por voz. Recomendamos Google Chrome.');
      clearFeedbackAfter(4500);
      return;
    }

    // Stop if already running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechFeedback('Escuchando... Decí qué rubro o servicio buscás (ej: Electricista, Plomero)');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          const cleaned = transcript.trim();
          setSpeechFeedback(`Buscando: "${cleaned}"...`);
          if (onResult) {
            onResult(cleaned);
          }
          clearFeedbackAfter(2500);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechFeedback('Permiso de micrófono no otorgado. Habilitá el micrófono en el navegador.');
        } else if (event.error === 'no-speech') {
          setSpeechFeedback('No se detectó audio. Por favor intentá de nuevo.');
        } else {
          setSpeechFeedback('No se pudo reconocer la voz. Intentá nuevamente.');
        }
        clearFeedbackAfter(4000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
      setSpeechFeedback('Error al iniciar el reconocimiento de voz.');
      clearFeedbackAfter(3500);
    }
  }, [lang, onResult, clearFeedbackAfter]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      setSpeechFeedback(null);
    } else {
      startListening();
    }
  }, [isListening, stopListening, startListening]);

  return {
    isListening,
    speechFeedback,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    setSpeechFeedback
  };
}
