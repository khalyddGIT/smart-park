// Módulo de Terreno 3D, Elevation DEM, Atmósfera y Niebla volumétrica en Mapbox GL JS v3

import { TERRAIN_SOURCE, ATMOSPHERE_CONFIG } from './mapConfig';

export class MapTerrainManager {
  constructor(map) {
    this.map = map;
    this.isTerrainEnabled = true;
    this.isAtmosphereEnabled = true;
    this.exaggeration = 1.5;
  }

  // Inicializar fuente DEM de elevación raster y terreno 3D
  setupTerrain() {
    if (!this.map) return;

    if (!this.map.getSource(TERRAIN_SOURCE.id)) {
      this.map.addSource(TERRAIN_SOURCE.id, {
        type: TERRAIN_SOURCE.type,
        url: TERRAIN_SOURCE.url,
        tileSize: TERRAIN_SOURCE.tileSize,
        maxzoom: TERRAIN_SOURCE.maxzoom
      });
    }

    this.enableTerrain(this.exaggeration);
    this.setupAtmosphereAndSky('day');
  }

  // Activar o desactivar Terreno 3D
  enableTerrain(exaggeration = 1.5) {
    if (!this.map) return;
    this.exaggeration = exaggeration;
    this.map.setTerrain({
      source: TERRAIN_SOURCE.id,
      exaggeration: exaggeration
    });
    this.isTerrainEnabled = true;
  }

  disableTerrain() {
    if (!this.map) return;
    this.map.setTerrain(null);
    this.isTerrainEnabled = false;
  }

  // Configurar la niebla (fog) y capa de cielo (sky) 3D
  setupAtmosphereAndSky(mode = 'day') {
    if (!this.map) return;
    const config = ATMOSPHERE_CONFIG[mode] || ATMOSPHERE_CONFIG.day;

    try {
      this.map.setFog(config.fog);
    } catch (e) {
      console.warn('Atmosphere fog notice:', e);
    }

    this.isAtmosphereEnabled = true;
  }

  disableAtmosphere() {
    if (!this.map) return;
    try {
      this.map.setFog(null);
    } catch (e) {}
    this.isAtmosphereEnabled = false;
  }

  // Cambiar exageración de elevación
  setExaggeration(exaggeration) {
    if (this.isTerrainEnabled) {
      this.enableTerrain(exaggeration);
    }
  }
}
