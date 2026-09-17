// Módulo Profesional de Navegación GPS, Trazado Real y Turn-by-Turn en Mapbox GL JS

import { MAPBOX_TOKEN } from './mapConfig';

export class MapRoutesManager {
  constructor(map) {
    this.map = map;
    this.routeSourceId = 'mapbox-3d-route-source';
    this.routeLayerId = 'mapbox-3d-route-layer';
    this.userGpsMarker = null;
    this.destPinMarker = null;
    this.watchId = null;
    this.lastSpokenStep = null;
    this.isMuted = false;
  }

  // Trazar ruta real con Turn-by-Turn y encuadre fitBounds usando Mapbox Directions API
  async drawRoute(originLngLat, destLngLat, destName, profile = 'driving') {
    if (!this.map) return null;

    try {
      const mode = profile === 'walking' ? 'walking' : (profile === 'cycling' ? 'cycling' : 'driving');
      const url = `https://api.mapbox.com/directions/v5/mapbox/${mode}/${originLngLat[0]},${originLngLat[1]};${destLngLat[0]},${destLngLat[1]}?geometries=geojson&steps=true&overview=full&language=es&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.routes || !data.routes[0]) return null;
      const route = data.routes[0];
      const geojson = {
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      };

      this.clearRoute();

      // Agregar fuente GeoJSON de la ruta
      this.map.addSource(this.routeSourceId, {
        type: 'geojson',
        data: geojson
      });

      // Capa 1: Casing suave y elegante estilo Google Maps
      this.map.addLayer({
        id: `${this.routeLayerId}-casing`,
        type: 'line',
        source: this.routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#1d4ed8',
          'line-width': 10,
          'line-opacity': 0.35
        }
      });

      // Capa 2: Línea de navegación continua y sólida HD (Azul Eléctrico)
      this.map.addLayer({
        id: this.routeLayerId,
        type: 'line',
        source: this.routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#2563eb',
          'line-width': 5.5,
          'line-opacity': 1.0
        }
      });

      const mapboxgl = window.mapboxgl;

      // Marcador 1: Puck de Ubicación Real del Usuario (Punto Azul con pulso suave de radar)
      if (mapboxgl) {
        const originEl = document.createElement('div');
        originEl.className = 'user-real-gps-puck pointer-events-none';
        originEl.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <span style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: #3b82f6; opacity: 0.35; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
            <div style="width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 3px 10px rgba(0,0,0,0.35); position: relative; z-index: 2;"></div>
          </div>
        `;
        this.userGpsMarker = new mapboxgl.Marker({ element: originEl })
          .setLngLat(originLngLat)
          .addTo(this.map);
      }

      // Marcador 2: Pin de Llegada en la Cochera Destino (Estilo Limpio y Arquitectónico)
      if (mapboxgl) {
        const destEl = document.createElement('div');
        destEl.className = 'dest-clean-arrival-pin pointer-events-none';
        destEl.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; transform: translateY(-4px);">
            <div style="background: #0f172a; color: #ffffff; padding: 4px 9px; border-radius: 8px; font-size: 11px; font-weight: 800; font-family: system-ui, -apple-system, sans-serif; box-shadow: 0 4px 12px rgba(15,23,42,0.35); white-space: nowrap; border: 1px solid rgba(255,255,255,0.15); display: flex; align-items: center; gap: 5px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; background: #059669; color: white; border-radius: 4px; font-weight: 900; font-size: 9px;">P</span>
              <span style="max-width: 170px; overflow: hidden; text-overflow: ellipsis;">${destName}</span>
            </div>
            <div style="width: 10px; height: 10px; background: #0f172a; transform: rotate(45deg); margin-top: -6px; border-bottom: 2px solid #059669; border-right: 2px solid #059669;"></div>
          </div>
        `;
        this.destPinMarker = new mapboxgl.Marker({ element: destEl, anchor: 'bottom' })
          .setLngLat(destLngLat)
          .addTo(this.map);
      }

      // Extraer maniobras y pasos Turn-by-Turn
      const steps = (route.legs[0]?.steps || []).map(s => ({
        instruction: s.maneuver?.instruction || 'Sigue la ruta principal',
        distance: Math.round(s.distance || 0),
        type: s.maneuver?.type || 'straight',
        modifier: s.maneuver?.modifier || 'straight',
        location: s.maneuver?.location || originLngLat
      }));

      // Encuadre de Cámara suave (fitBounds) con buen margen
      const coords = route.geometry.coordinates;
      if (mapboxgl && coords.length > 0) {
        const bounds = coords.reduce((b, coord) => b.extend(coord), new mapboxgl.LngLatBounds(coords[0], coords[0]));
        this.map.fitBounds(bounds, {
          padding: { top: 60, bottom: 60, left: 50, right: 50 },
          pitch: 0,
          duration: 900
        });
      }

      // Reproducir por voz la primera maniobra si no está silenciado
      const currentStep = steps[0] || { instruction: `Avanza hacia ${destName}`, distance: 100 };
      if (currentStep.instruction && this.lastSpokenStep !== currentStep.instruction && !this.isMuted) {
        this.speakInstruction(currentStep.instruction);
        this.lastSpokenStep = currentStep.instruction;
      }

      const distanceMeters = Math.round(route.distance);
      const distanceFormatted = distanceMeters < 1000 
        ? `${distanceMeters} m` 
        : `${(distanceMeters / 1000).toFixed(1)} km`;

      const durationMin = Math.max(1, Math.round(route.duration / 60));
      const durationFormatted = durationMin < 60
        ? `~${durationMin} min`
        : `~${Math.floor(durationMin / 60)}h ${durationMin % 60}m`;

      return {
        destinationName: destName,
        destCoords: destLngLat,
        distanceKm: distanceFormatted,
        durationMin: durationFormatted,
        steps,
        currentStep,
        coordinates: coords,
        profile
      };
    } catch (err) {
      console.warn('Mapbox 3D directions error:', err);
      return null;
    }
  }

  // Locución de voz para la maniobra (Web Speech API)
  speakInstruction(text) {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-PE';
      u.rate = 1.0;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  // Alternar silencio de audio de navegación
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    return this.isMuted;
  }

  // Activar seguimiento GPS en tiempo real del conductor (HTML5 Geolocation watchPosition)
  startRealtimeTracking(destLngLat, destName, onLocationUpdate) {
    this.stopRealtimeTracking();

    if (!navigator.geolocation) return;

    const mapboxgl = window.mapboxgl;

    this.watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const userLngLat = [pos.coords.longitude, pos.coords.latitude];

        if (this.userGpsMarker) {
          this.userGpsMarker.setLngLat(userLngLat);
        }

        // Trazar/Actualizar la ruta desde las coordenadas GPS en tiempo real
        const routeData = await this.drawRoute(userLngLat, destLngLat, destName);
        if (onLocationUpdate && routeData) {
          onLocationUpdate({ ...routeData, userCoords: userLngLat });
        }
      },
      (err) => {
        console.warn('GPS Realtime watch error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 }
    );
  }

  stopRealtimeTracking() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.userGpsMarker) {
      this.userGpsMarker.remove();
      this.userGpsMarker = null;
    }
  }

  clearRoute() {
    this.stopRealtimeTracking();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (this.destPinMarker) {
      this.destPinMarker.remove();
      this.destPinMarker = null;
    }

    if (!this.map) return;

    try {
      if (this.map.getLayer(this.routeLayerId)) {
        this.map.removeLayer(this.routeLayerId);
      }
      if (this.map.getLayer(`${this.routeLayerId}-casing`)) {
        this.map.removeLayer(`${this.routeLayerId}-casing`);
      }
      if (this.map.getSource(this.routeSourceId)) {
        this.map.removeSource(this.routeSourceId);
      }
    } catch (e) {}
  }
}
