/**
 * SEM & Google Ads Conversion Tracker for Bahia Oficios
 * Tracks leads, quote submissions, WhatsApp contacts, and high-intent searches.
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    trackSemConversion?: (eventName: string, eventParams?: Record<string, any>) => void;
  }
}

export type SemConversionType = 
  | 'whatsapp_contact' 
  | 'phone_call' 
  | 'quote_submitted' 
  | 'search_performed' 
  | 'pro_profile_view';

export interface SemConversionPayload {
  rubro?: string;
  profesionalId?: string;
  profesionalNombre?: string;
  zona?: string;
  presupuestoEstimado?: number;
  source?: string;
  searchTerm?: string;
}

export const semTracker = {
  /**
   * Tracks an explicit conversion event for Google Ads / SEM campaigns
   */
  trackConversion: (type: SemConversionType, payload: SemConversionPayload = {}) => {
    if (typeof window === 'undefined') return;

    try {
      // 1. Google Ads / Gtag conversion trigger
      if (typeof window.gtag === 'function') {
        const eventNameMap: Record<SemConversionType, string> = {
          whatsapp_contact: 'contact',
          phone_call: 'phone_call_lead',
          quote_submitted: 'generate_lead',
          search_performed: 'search',
          pro_profile_view: 'view_item'
        };

        const gtmEvent = eventNameMap[type] || 'conversion';

        window.gtag('event', gtmEvent, {
          event_category: 'SEM_Marketing',
          event_label: payload.rubro || payload.profesionalNombre || payload.searchTerm || 'General',
          value: type === 'whatsapp_contact' || type === 'quote_submitted' ? 10 : 1,
          currency: 'ARS',
          rubro: payload.rubro,
          zona: payload.zona,
          pro_id: payload.profesionalId,
          pro_name: payload.profesionalNombre
        });

        // Specific Google Ads Conversion Event if configured
        window.gtag('event', 'conversion', {
          send_to: 'AW-CONVERSION_ID/LABEL', // Placeholder ready for production Google Ads ID
          value: 1.0,
          currency: 'ARS',
          event_category: 'Lead',
          event_label: `${type}:${payload.rubro || 'General'}`
        });
      }

      // 2. Window global fallback
      if (typeof window.trackSemConversion === 'function') {
        window.trackSemConversion(type, payload);
      }

      // 3. Console debug log in development
      if (import.meta.env.DEV) {
        console.log(`[SEM Tracker] Event fired: "${type}"`, payload);
      }
    } catch (err) {
      console.warn('[SEM Tracker] Error recording conversion:', err);
    }
  }
};
