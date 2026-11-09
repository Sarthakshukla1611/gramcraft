import React from 'react';
import MapExplorer from '../components/map/MapExplorer';

export default function MapPage() {
  return (
    <div className="relative w-full h-full flex-1">
      <MapExplorer height="100%" showControls={true} />
    </div>
  );
}
