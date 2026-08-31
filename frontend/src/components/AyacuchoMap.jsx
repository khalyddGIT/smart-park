import React from 'react';
import { MapContainer3D } from './map/MapContainer3D';

export const AyacuchoMap = ({ parkings = [], onSelectParking, selectedParkingId }) => {
  return (
    <MapContainer3D
      parkings={parkings}
      onSelectParking={onSelectParking}
      selectedParkingId={selectedParkingId}
    />
  );
};

export default AyacuchoMap;
