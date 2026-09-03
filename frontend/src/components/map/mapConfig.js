// Configuración global para Mapbox GL JS 3D (Huamanga, Ayacucho)

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || atob('cGsuZXlKMUlqb2lhMmhoYkhsa1pDSXNJbUVpT2lKamJYUm5kMkk0Y21Zd01EbHNNbmh4TlhKcmJ6Qm9PREkzSW4wLjI5dUl0MGZJR2lnYmN6WlpPWmlGMFE=');

export const AYACUCHO_CENTER = {
  lng: -74.2257,
  lat: -13.1606,
  zoom: 15.8,
  pitch: 0,
  bearing: 0
};

export const DEFAULT_PARKING_COORDS = {
  'EST-01': [-74.2259, -13.1604], // Plaza Mayor Planta Baja
  'EST-02': [-74.2252, -13.1612], // Plaza Mayor Sótano 1
  'EST-03': [-74.2215, -13.1565], // Mercado Mariscal Cáceres
  'EST-04': [-74.2210, -13.1718], // Terminal Terrestre
};

export const MAPBOX_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11'
};

// Fuente DEM de Terreno Mapbox Raster
export const TERRAIN_SOURCE = {
  id: 'mapbox-dem',
  type: 'raster-dem',
  url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
  tileSize: 512,
  maxzoom: 14
};

// Configuración de niebla y atmósfera volumétrica 3D
export const ATMOSPHERE_CONFIG = {
  day: {
    fog: {
      'range': [0.5, 10],
      'color': '#dbedff',
      'horizon-blend': 0.1,
      'high-color': '#247ba0',
      'space-color': '#000000',
      'star-intensity': 0.0
    },
    sky: {
      'sky-type': 'atmosphere',
      'sky-atmosphere-sun': [0.0, 90.0],
      'sky-atmosphere-sun-intensity': 15
    }
  },
  night: {
    fog: {
      'range': [0.5, 8],
      'color': '#0d1321',
      'horizon-blend': 0.15,
      'high-color': '#020617',
      'space-color': '#020617',
      'star-intensity': 0.85
    },
    sky: {
      'sky-type': 'atmosphere',
      'sky-atmosphere-sun': [180.0, -90.0],
      'sky-atmosphere-sun-intensity': 2
    }
  }
};

// Limpieza total de POIs innecesarios de Mapbox (comercio, bancos, tiendas, hoteles, comida)
export const cleanPOIsFromMap = (map) => {
  if (!map) return;
  try {
    const style = map.getStyle();
    if (!style || !style.layers) return;
    
    style.layers.forEach(layer => {
      const id = layer.id.toLowerCase();
      // Ocultar capas de iconos/etiquetas de comercios, comida, bancos, tiendas, hoteles, escuelas y transportes
      if (
        id.includes('poi') || 
        id.includes('transit') || 
        id.includes('airport') ||
        id.includes('medical') ||
        id.includes('education') ||
        id.includes('lodging') ||
        id.includes('food') ||
        id.includes('shop') ||
        id.includes('bank') ||
        id.includes('store') ||
        id.includes('services') ||
        id.includes('commercial') ||
        id.includes('attraction')
      ) {
        try {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        } catch (e) {}
      }
    });
  } catch (e) {
    console.warn('Clean POIs warning:', e);
  }
};

export const FALLBACK_PARKING_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500' width='800' height='500'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%230f172a'/%3E%3Cstop offset='100%25' stop-color='%231e293b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ccircle cx='400' cy='210' r='85' fill='%2310b981' fill-opacity='0.15'/%3E%3Cpath d='M345 250 L455 250 L430 175 L370 175 Z' fill='%2310b981' fill-opacity='0.6'/%3E%3Crect x='330' y='250' width='140' height='40' rx='10' fill='%2310b981'/%3E%3Ccircle cx='365' cy='290' r='14' fill='%230f172a'/%3E%3Ccircle cx='435' cy='290' r='14' fill='%230f172a'/%3E%3Ctext x='400' y='370' font-family='system-ui, sans-serif' font-size='22' font-weight='bold' fill='%23f8fafc' text-anchor='middle'%3ESmart Park Huamanga%3C/text%3E%3Ctext x='400' y='402' font-family='system-ui, sans-serif' font-size='14' fill='%2394a3b8' text-anchor='middle'%3EEstacionamiento Seguro y Conectado%3C/text%3E%3C/svg%3E";

