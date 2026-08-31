// Módulo de Control y Animaciones Cinemáticas de Cámara 3D en Mapbox GL JS

import { AYACUCHO_CENTER } from './mapConfig';

export class MapCameraManager {
  constructor(map) {
    this.map = map;
    this.orbitAnimationId = null;
    this.isOrbiting = false;
  }

  // Volar suavemente a una ubicación con animación fluida (flyTo)
  flyToLocation(lngLat, zoom = 17, pitch = 65, bearing = 0) {
    if (!this.map) return;
    this.stopOrbit();
    this.map.flyTo({
      center: lngLat,
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      duration: 2200,
      essential: true
    });
  }

  // Activar perspectiva 3D (pitch 65°, bearing -15°)
  enable3DView() {
    if (!this.map) return;
    this.map.easeTo({
      pitch: 65,
      bearing: -15,
      duration: 1200
    });
  }

  // Activar vista 2D plana (pitch 0°, bearing 0°)
  enable2DView() {
    if (!this.map) return;
    this.stopOrbit();
    this.map.easeTo({
      pitch: 0,
      bearing: 0,
      duration: 1200
    });
  }

  // Restablecer cámara a la vista panorámica de la Plaza Mayor de Huamanga
  resetCamera() {
    if (!this.map) return;
    this.stopOrbit();
    this.map.flyTo({
      center: [AYACUCHO_CENTER.lng, AYACUCHO_CENTER.lat],
      zoom: AYACUCHO_CENTER.zoom,
      pitch: AYACUCHO_CENTER.pitch,
      bearing: AYACUCHO_CENTER.bearing,
      duration: 1800
    });
  }

  // Navegación orbital alrededor de un punto de interés
  orbitAroundLocation(centerCoords = [AYACUCHO_CENTER.lng, AYACUCHO_CENTER.lat], speed = 0.12) {
    if (!this.map) return;
    this.stopOrbit();
    this.isOrbiting = true;

    const map = this.map;
    let bearing = map.getBearing();

    const frame = () => {
      if (!this.isOrbiting) return;
      bearing = (bearing + speed) % 360;
      map.rotateTo(bearing, { duration: 0 });
      this.orbitAnimationId = requestAnimationFrame(frame);
    };

    frame();
  }

  stopOrbit() {
    this.isOrbiting = false;
    if (this.orbitAnimationId) {
      cancelAnimationFrame(this.orbitAnimationId);
      this.orbitAnimationId = null;
    }
  }

  // Recorrido cinematográfico panorámico (Cinematic Tour) por Ayacucho
  startCinematicTour(parkings = []) {
    if (!this.map) return;
    this.stopOrbit();

    const keypoints = [
      { center: [-74.2257, -13.1606], zoom: 17, pitch: 70, bearing: 0, name: 'Plaza Mayor' },
      { center: [-74.2215, -13.1565], zoom: 17.2, pitch: 65, bearing: 90, name: 'Mercado Mariscal' },
      { center: [-74.2210, -13.1718], zoom: 16.8, pitch: 60, bearing: 180, name: 'Terrapuerto' },
      { center: [-74.2259, -13.1604], zoom: 17.5, pitch: 75, bearing: 270, name: 'Centro Histórico' }
    ];

    let idx = 0;
    const playStep = () => {
      if (idx >= keypoints.length) idx = 0;
      const pt = keypoints[idx];
      this.map.flyTo({
        center: pt.center,
        zoom: pt.zoom,
        pitch: pt.pitch,
        bearing: pt.bearing,
        duration: 3500,
        essential: true
      });
      idx++;
    };

    playStep();
    const interval = setInterval(playStep, 4500);

    return () => {
      clearInterval(interval);
      this.resetCamera();
    };
  }
}
