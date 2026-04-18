import React, { useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '400px'
};

const center = {
  lat: -38.7183,
  lng: -62.2663
};

const ZONA_COORDINATES: Record<string, { lat: number, lng: number }> = {
  'Centro': { lat: -38.7183, lng: -62.2663 },
  'Patagonia': { lat: -38.6850, lng: -62.2250 },
  'Villa Mitre': { lat: -38.7150, lng: -62.2450 },
  'Universitario': { lat: -38.6980, lng: -62.2680 },
  'Noroeste': { lat: -38.7050, lng: -62.2950 },
  'General Daniel Cerri': { lat: -38.7150, lng: -62.3850 },
  'Ingeniero White': { lat: -38.7850, lng: -62.2650 },
  'Punta Alta': { lat: -38.8820, lng: -62.0750 },
  'Palihue': { lat: -38.6950, lng: -62.2450 },
  'Bella Vista': { lat: -38.7250, lng: -62.2250 },
  'Villa Rosas': { lat: -38.7450, lng: -62.2550 },
  'Harding Green': { lat: -38.7050, lng: -62.2050 },
  'Villa Belgrano': { lat: -38.7100, lng: -62.2750 },
  'Villa Floresta': { lat: -38.7300, lng: -62.2400 },
  'San Roque': { lat: -38.7200, lng: -62.2300 },
  'Pacífico': { lat: -38.7250, lng: -62.2750 },
  'Napostá': { lat: -38.7100, lng: -62.2600 },
};

interface ZonaMapProps {
  selectedZona: string;
  onSelectZona: (zona: string) => void;
}

export const ZonaMap: React.FC<ZonaMapProps> = ({ selectedZona, onSelectZona }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
  });

  const [activeMarker, setActiveMarker] = useState<string | null>(null);

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  if (!isLoaded) return <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center text-gray-400">Cargando Google Maps...</div>;

  return (
    <div className="h-[400px] w-full rounded-2xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700 relative group">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            {
              "featureType": "poi",
              "elementType": "labels",
              "stylers": [{ "visibility": "off" }]
            }
          ]
        }}
      >
        {Object.entries(ZONA_COORDINATES).map(([name, coords]) => (
          <Marker
            key={name}
            position={coords}
            onClick={() => {
              onSelectZona(name);
              setActiveMarker(name);
            }}
            icon={selectedZona === name ? {
              url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            } : undefined}
          >
            {activeMarker === name && (
              <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                <div className="p-1">
                  <p className="font-bold text-indigo-600 mb-1">{name}</p>
                  <button 
                    onClick={() => onSelectZona(name)}
                    className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                  >
                    Seleccionar
                  </button>
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}
      </GoogleMap>
      
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-w-[200px]">
        <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1 uppercase tracking-wider flex items-center gap-1">
          <MapPin size={12} className="text-indigo-600" />
          Zona Seleccionada
        </h4>
        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
          {selectedZona === 'Todas' ? 'Todas las zonas' : selectedZona}
        </p>
        {selectedZona !== 'Todas' && (
          <button 
            onClick={() => onSelectZona('Todas')}
            className="mt-2 text-[10px] font-bold text-gray-500 hover:text-red-500 uppercase tracking-tighter"
          >
            Limpiar filtro
          </button>
        )}
      </div>
    </div>
  );
};
