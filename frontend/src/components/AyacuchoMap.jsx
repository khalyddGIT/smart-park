import React from 'react';
import { MapContainer3D } from './map/MapContainer3D';

export const AyacuchoMap = ({ 
  parkings, 
  establishments,
  onSelectParking, 
  onQuickReservation,
  selectedParkingId,
  routeTarget,
  onClearRoute
}) => {
  // Soporta tanto 'parkings' como 'establishments' para máxima resiliencia
  const effectiveParkings = Array.isArray(parkings) && parkings.length > 0 
    ? parkings 
    : (Array.isArray(establishments) && establishments.length > 0 ? establishments : (parkings || []));

  return (
    <MapContainer3D
      parkings={effectiveParkings}
      onSelectParking={onSelectParking}
      onQuickReservation={onQuickReservation}
      selectedParkingId={selectedParkingId}
      routeTarget={routeTarget}
      onClearRoute={onClearRoute}
    />
  );
};

export default AyacuchoMap;
