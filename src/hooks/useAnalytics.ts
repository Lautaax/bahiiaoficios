import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsService } from '../services/analyticsService';

export const useAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // 1. Google Analytics integration (if gtag loaded)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title,
      });
    }

    // 2. Bahia Oficios internal analytics engine
    analyticsService.trackPageView(location.pathname, document.title);
  }, [location.pathname, location.search]);
};

