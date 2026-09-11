import React from 'react';
import { MapContainer3D } from './map/MapContainer3D';

export const AyacuchoMap = ({ 
  parkings = [], 
  onSelectParking, 
  onQuickReservation,
  selectedParkingId,
  routeTarget,
  onClearRoute
}) => {
  return (
    <MapContainer3D
      parkings={parkings}
      onSelectParking={onSelectParking}
      onQuickReservation={onQuickReservation}
      selectedParkingId={selectedParkingId}
      routeTarget={routeTarget}
      onClearRoute={onClearRoute}
    />
  );
};

export default AyacuchoMap;
