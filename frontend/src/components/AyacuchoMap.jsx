import React from 'react';
import { MapContainer3D } from './map/MapContainer3D';

export const AyacuchoMap = ({ 
  parkings = [], 
  onSelectParking, 
  selectedParkingId,
  routeTarget,
  onClearRoute
}) => {
  return (
    <MapContainer3D
      parkings={parkings}
      onSelectParking={onSelectParking}
      selectedParkingId={selectedParkingId}
      routeTarget={routeTarget}
      onClearRoute={onClearRoute}
    />
  );
};

export default AyacuchoMap;
