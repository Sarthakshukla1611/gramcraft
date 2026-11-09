import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Layers,
  MapPin,
  Crosshair,
  Filter,
  Eye,
  EyeOff,
  Navigation,
  School,
  HeartPulse,
  Droplet,
  Info,
} from 'lucide-react';
import { useGramStore } from '../../store/useGramStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import StatusChip from '../common/StatusChip';

// Helper component to smoothly fly the Leaflet map to targeted coords
function MapFlyController({ targetCoords }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords && Array.isArray(targetCoords) && targetCoords.length === 2) {
      const [lng, lat] = targetCoords;
      map.flyTo([lat, lng], 13, { duration: 1.2 });
    }
  }, [targetCoords, map]);
  return null;
}

export default function MapExplorer({ height = '100%', showControls = true }) {
  const selectedVillage = useGramStore((state) => state.selectedVillage);
  const setSelectedVillage = useGramStore((state) => state.setSelectedVillage);
  const mapTargetCoords = useGramStore((state) => state.mapTargetCoords);
  const activeBlock = useGramStore((state) => state.activeBlock);
  const addToast = useGramStore((state) => state.addToast);

  // Map layer toggles
  const [showSchools, setShowSchools] = useState(true);
  const [showHealth, setShowHealth] = useState(true);
  const [showWater, setShowWater] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [activeSectorMetric, setActiveSectorMetric] = useState('overall'); // 'overall' | 'sanitation' | 'water' ...
  const [radiusFilterKm, setRadiusFilterKm] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);

  // Center on Sehore District, MP: lat 23.08, lng 76.95
  const defaultCenter = [23.08, 76.95];

  // Fetch villages
  const { data: villages = [] } = useQuery({
    queryKey: ['map-villages', activeBlock],
    queryFn: async () => {
      const url = activeBlock && activeBlock !== 'All' ? `/villages?block=${activeBlock}&limit=100` : '/villages?limit=100';
      const res = await api.get(url);
      return res.data?.data || [];
    },
  });

  // Fetch facilities
  const { data: facilities = [] } = useQuery({
    queryKey: ['map-facilities'],
    queryFn: async () => {
      const res = await api.get('/facilities');
      return res.data?.data || [];
    },
  });

  // Mobile "Use My Location" GPS handler
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      addToast('Geolocation is not supported by your browser.', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation([latitude, longitude]);
        setLocationAccuracy(Math.round(accuracy));
        addToast(`GPS locked! Accuracy: ±${Math.round(accuracy)} meters.`, 'success');
      },
      (err) => {
        addToast(`Unable to retrieve location: ${err.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getScoreColor = (village) => {
    let score = village.overallScore;
    if (activeSectorMetric !== 'overall' && village.sectors?.[activeSectorMetric]) {
      score = village.sectors[activeSectorMetric].score;
    }

    if (score >= 80) return '#7BAE7F'; // softgreen
    if (score >= 65) return '#7BAE7F';
    if (score >= 50) return '#2E5A63'; // teal
    if (score >= 35) return '#C4832A'; // turmeric
    return '#9E3A34'; // clay
  };

  // Radius for circle marker based on population
  const getMarkerRadius = (population = 2000) => {
    return Math.max(7, Math.min(18, Math.round(Math.sqrt(population) * 0.22)));
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-paper-muted select-none">
      {/* Map Header / Floating Controls */}
      {showControls && (
        <div className="absolute top-3 left-3 z-30 flex flex-wrap gap-2 pointer-events-auto">
          {/* Layer toggles panel */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-sm bg-paper-base/90 dark:bg-field-panel/90 border border-border-subtle backdrop-blur-sm text-xs font-mono shadow-sm">
            <span className="text-field-dark/60 text-[10px] uppercase font-semibold px-1">Layers:</span>

            <button
              onClick={() => setShowSchools(!showSchools)}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm border transition-colors ${
                showSchools
                  ? 'bg-paper-muted border-border-subtle text-field-dark'
                  : 'border-transparent text-field-dark/40 line-through'
              }`}
            >
              <School className="w-3 h-3 text-teal-gram" />
              <span>Schools</span>
            </button>

            <button
              onClick={() => setShowHealth(!showHealth)}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm border transition-colors ${
                showHealth
                  ? 'bg-paper-muted border-border-subtle text-field-dark'
                  : 'border-transparent text-field-dark/40 line-through'
              }`}
            >
              <HeartPulse className="w-3 h-3 text-clay" />
              <span>Health</span>
            </button>

            <button
              onClick={() => setShowWater(!showWater)}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm border transition-colors ${
                showWater
                  ? 'bg-paper-muted border-border-subtle text-field-dark'
                  : 'border-transparent text-field-dark/40 line-through'
              }`}
            >
              <Droplet className="w-3 h-3 text-teal-gram" />
              <span>Water</span>
            </button>

            <button
              onClick={() => setShowBoundaries(!showBoundaries)}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm border transition-colors ${
                showBoundaries
                  ? 'bg-paper-muted border-border-subtle text-field-dark'
                  : 'border-transparent text-field-dark/40 line-through'
              }`}
            >
              <Layers className="w-3 h-3 text-turmeric" />
              <span>Boundaries</span>
            </button>
          </div>

          {/* Sector color metric selector */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-sm bg-paper-base/90 dark:bg-field-panel/90 border border-border-subtle backdrop-blur-sm text-xs font-mono shadow-sm">
            <Filter className="w-3 h-3 text-turmeric" />
            <select
              value={activeSectorMetric}
              onChange={(e) => setActiveSectorMetric(e.target.value)}
              className="bg-transparent text-xs text-field-dark border-none focus:outline-none font-mono cursor-pointer"
            >
              <option value="overall">Composite Score</option>
              <option value="sanitation">Sanitation</option>
              <option value="water">Clean Water</option>
              <option value="education">Education</option>
              <option value="roads">Roads</option>
              <option value="electricity">Electricity</option>
              <option value="healthcare">Healthcare</option>
            </select>
          </div>

          {/* Mobile GPS "Use My Location" Button */}
          <button
            onClick={handleUseMyLocation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-paper-base/90 dark:bg-field-panel/90 border border-border-subtle backdrop-blur-sm text-xs font-mono text-field-dark hover:bg-paper-muted shadow-sm transition-colors"
            title="Detect GPS coordinates for field entry"
          >
            <Crosshair className="w-3.5 h-3.5 text-turmeric" />
            <span>Use My Location {locationAccuracy ? `(±${locationAccuracy}m)` : ''}</span>
          </button>
        </div>
      )}

      {/* Map Canvas */}
      <div className="flex-1 w-full h-full">
        <MapContainer
          center={defaultCenter}
          zoom={11}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          {/* Smooth Fly To Controller */}
          <MapFlyController targetCoords={mapTargetCoords} />

          {/* CartoDB Positron / OSM Default Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          {/* GPS User Location Pin */}
          {userLocation && (
            <CircleMarker
              center={userLocation}
              radius={8}
              pathOptions={{
                color: '#3B82F6',
                fillColor: '#60A5FA',
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-1 text-xs font-mono">
                  <strong>Your GPS Location</strong>
                  <div>Accuracy: ±{locationAccuracy}m</div>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* Village Boundary Polygons (Choropleth Mode) */}
          {showBoundaries &&
            villages.map((v) => {
              if (!v.boundary) return null;
              const color = getScoreColor(v);
              const isSelected = selectedVillage?._id === v._id;

              return (
                <GeoJSON
                  key={`boundary-${v._id}`}
                  data={v.boundary}
                  style={{
                    color: isSelected ? '#C4832A' : color,
                    weight: isSelected ? 3 : 1.2,
                    fillColor: color,
                    fillOpacity: isSelected ? 0.35 : 0.15,
                  }}
                  eventHandlers={{
                    click: () => setSelectedVillage(v),
                  }}
                />
              );
            })}

          {/* Village Center Markers (Sized by Population, Colored by Score Tier) */}
          {villages.map((v) => {
            const [lng, lat] = v.location.coordinates;
            const color = getScoreColor(v);
            const radius = getMarkerRadius(v.population);
            const isSelected = selectedVillage?._id === v._id;

            return (
              <CircleMarker
                key={`marker-${v._id}`}
                center={[lat, lng]}
                radius={radius}
                pathOptions={{
                  color: isSelected ? '#162922' : color,
                  weight: isSelected ? 3 : 1.5,
                  fillColor: color,
                  fillOpacity: 0.85,
                }}
                eventHandlers={{
                  click: () => setSelectedVillage(v),
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[170px] select-none">
                    <div className="flex items-center justify-between border-b border-border-subtle pb-1 mb-1.5">
                      <strong className="font-serif text-sm text-field-dark">{v.name}</strong>
                      <span className="font-mono text-[10px] text-turmeric font-semibold">{v.code}</span>
                    </div>

                    <div className="text-xs space-y-1 font-mono text-field-dark/80">
                      <div>Block: {v.block}</div>
                      <div>Population: {v.population?.toLocaleString('en-IN')}</div>
                      <div>Score: {v.overallScore}% [{v.level}]</div>
                    </div>

                    <button
                      onClick={() => setSelectedVillage(v)}
                      className="mt-2.5 w-full py-1 text-[11px] font-mono font-medium rounded-sm bg-turmeric text-white hover:bg-turmeric-hover text-center transition-colors"
                    >
                      Open in Scorecard
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Facility Markers: Schools */}
          {showSchools &&
            facilities
              .filter((f) => f.type === 'school')
              .map((f) => (
                <CircleMarker
                  key={f._id}
                  center={[f.location.coordinates[1], f.location.coordinates[0]]}
                  radius={4}
                  pathOptions={{ color: '#2E5A63', fillColor: '#49828E', fillOpacity: 0.9, weight: 1 }}
                >
                  <Popup>
                    <div className="p-1 text-xs font-mono">
                      <div className="font-bold flex items-center gap-1 text-teal-gram">
                        <School className="w-3.5 h-3.5" /> {f.name}
                      </div>
                      <div>Status: {f.operationalStatus}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

          {/* Facility Markers: Health Centres */}
          {showHealth &&
            facilities
              .filter((f) => f.type === 'health centre')
              .map((f) => (
                <CircleMarker
                  key={f._id}
                  center={[f.location.coordinates[1], f.location.coordinates[0]]}
                  radius={4}
                  pathOptions={{ color: '#9E3A34', fillColor: '#C45750', fillOpacity: 0.9, weight: 1 }}
                >
                  <Popup>
                    <div className="p-1 text-xs font-mono">
                      <div className="font-bold flex items-center gap-1 text-clay">
                        <HeartPulse className="w-3.5 h-3.5" /> {f.name}
                      </div>
                      <div>Status: {f.operationalStatus}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

          {/* Facility Markers: Water Sources */}
          {showWater &&
            facilities
              .filter((f) => f.type === 'water source')
              .map((f) => (
                <CircleMarker
                  key={f._id}
                  center={[f.location.coordinates[1], f.location.coordinates[0]]}
                  radius={4}
                  pathOptions={{ color: '#2E5A63', fillColor: '#67A8B7', fillOpacity: 0.9, weight: 1 }}
                >
                  <Popup>
                    <div className="p-1 text-xs font-mono">
                      <div className="font-bold flex items-center gap-1 text-teal-gram">
                        <Droplet className="w-3.5 h-3.5" /> {f.name}
                      </div>
                      <div>Status: {f.operationalStatus}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
        </MapContainer>
      </div>

      {/* Map Legend (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-30 p-2.5 rounded-sm bg-paper-base/95 dark:bg-field-panel/95 border border-border-subtle backdrop-blur-sm text-[11px] font-mono shadow-sm">
        <div className="font-semibold text-field-dark mb-1.5 flex items-center gap-1">
          <Info className="w-3 h-3 text-turmeric" />
          <span>Score Tiers & Size</span>
        </div>
        <div className="space-y-1 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-softgreen inline-block" />
            <span>Model / Thriving (&gt; 65%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-gram inline-block" />
            <span>Growing (50 - 64%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-turmeric inline-block" />
            <span>Sprout (35 - 49%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-clay inline-block" />
            <span>Seedling Critical (&lt; 35%)</span>
          </div>
        </div>
        <div className="mt-2 pt-1 border-t border-border-subtle/50 text-[9px] text-field-dark/60">
          Circle radius proportional to village population.
        </div>
      </div>
    </div>
  );
}
