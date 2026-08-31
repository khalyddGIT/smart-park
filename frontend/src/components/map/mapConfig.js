// Configuración global para Mapbox GL JS 3D (Huamanga, Ayacucho)

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || atob('cGsuZXlKMUlqb2lhMmhoYkhsa1pDSXNJbUVpT2lKamJYUm5kMkk0Y21Zd01EbHNNbmh4TlhKcmJ6Qm9PREkzSW4wLjI5dUl0MGZJR2lnYmN6WlpPWmlGMFE=');

export const AYACUCHO_CENTER = {
  lng: -74.2257,
  lat: -13.1606,
  zoom: 16.5,
  pitch: 62, // Inclinación 3D nativa de cámara
  bearing: -15.4 // Rotación azimutal 3D
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
