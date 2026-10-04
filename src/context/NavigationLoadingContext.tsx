import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationLoadingContextType {
  isNavigating: boolean;
  startNavigation: () => void;
  finishNavigation: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType>({
  isNavigating: false,
  startNavigation: () => {},
  finishNavigation: () => {},
});

export const useNavigationLoading = () => useContext(NavigationLoadingContext);

/**
 * Top-mounted persistent navigation progress bar that prevents screen flicker
 * and provides responsive visual feedback during route and rubro transitions.
 */
export const PersistentNavigationLoader: React.FC = () => {
  const { isNavigating } = useNavigationLoading();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isNavigating) {
      setVisible(true);
      setProgress(25);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 85) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 85;
          }
          return prev + Math.floor(Math.random() * 15 + 10);
        });
      }, 150);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      const hideTimeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 350);
      return () => clearTimeout(hideTimeout);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isNavigating]);

  if (!visible && progress === 0) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[3px] overflow-hidden transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      role="progressbar"
      aria-label="Cargando página"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div 
        className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export const NavigationLoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();
  const activeRequestsRef = useRef(0);

  const startNavigation = useCallback(() => {
    activeRequestsRef.current += 1;
    setIsNavigating(true);
  }, []);

  const finishNavigation = useCallback(() => {
    activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
    if (activeRequestsRef.current === 0) {
      setIsNavigating(false);
    }
  }, []);

  // Track route changes smoothly
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => {
      if (activeRequestsRef.current === 0) {
        setIsNavigating(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return (
    <NavigationLoadingContext.Provider value={{ isNavigating, startNavigation, finishNavigation }}>
      <PersistentNavigationLoader />
      {children}
    </NavigationLoadingContext.Provider>
  );
};
