'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useDashboardPreferences } from '@/components/dashboard/PreferencesProvider';
import { useCurrentTheater, useTheaterDataFeed } from '@/components/dashboard/useTheaterDataFeed';
import { NAVY_COLORS, THEATER_MAP_CONFIG, type TheaterMapConfig } from '@/lib/theater-map';

let L: typeof import('leaflet') | null = null;

interface FlightData {
  total: number;
  military: number;
  flights: {
    icao24: string;
    callsign: string;
    origin: string;
    lat: number;
    lon: number;
    altitude: number;
    heading: number;
    speed: number;
    type: string;
    aircraftType: string;
    registration: string;
    squawk: string;
    isMilitary: boolean;
    isInteresting: boolean;
  }[];
}

interface NavalData {
  ships: {
    name: string;
    hull: string;
    type: string;
    class: string;
    navy: string;
    lat: number;
    lon: number;
    status: string;
    region: string;
    group?: string;
  }[];
}

interface AlertData {
  status: 'ACTIVE' | 'CLEAR';
  alerts: {
    type: string;
    threat: string;
    locations: string[];
    time: string;
    region?: 'middle-east' | 'ukraine';
  }[];
}

interface ConflictEvent {
  id: string;
  date: string;
  type: string;
  location: string;
  lat: number;
  lon: number;
  description: string;
  source: string;
}

interface StrikeData {
  id: string;
  date: string;
  category: string;
  severity: string;
  title: string;
  source: string;
  url: string;
  country: string;
}

interface TelegramData {
  posts: {
    channel: string;
    channelLabel: string;
    color: string;
    postId: number;
    text: string;
    date: string;
    url: string;
  }[];
}

interface MapProps {
  className?: string;
}

const DEEP_STATE_MAP_URL = 'https://deepstatemap.live/en#6/49.4383200/32.0526800';

function getFlightColor(origin: string): string {
  if (origin.includes('US') || origin === 'United States') return '#00aaff';
  if (origin.includes('Ukraine')) return '#66ccff';
  if (origin.includes('Russia')) return '#ff6666';
  if (origin.includes('Israel')) return '#00d4ff';
  if (origin.includes('Iran')) return '#ff3366';
  if (origin.includes('UK') || origin.includes('Royal')) return '#4488cc';
  return '#ffaa00';
}

function animateMarker(marker: L.Marker, targetLat: number, targetLon: number, duration: number) {
  const start = marker.getLatLng();
  const startTime = performance.now();
  const dlat = targetLat - start.lat;
  const dlon = targetLon - start.lng;
  if (Math.abs(dlat) < 0.001 && Math.abs(dlon) < 0.001) return;
  function step(now: number) {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    marker.setLatLng([start.lat + dlat * ease, start.lng + dlon * ease]);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Draw an animated arc between two points (missile trajectory) — loops until cancelled
function drawMissileArc(map: L.Map, from: [number, number], to: [number, number], color: string, layerGroup: L.LayerGroup): () => void {
  if (!L) return () => {};
  const points: [number, number][] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = from[0] + (to[0] - from[0]) * t;
    const lon = from[1] + (to[1] - from[1]) * t;
    const arcHeight = Math.sin(t * Math.PI) * 3;
    points.push([lat + arcHeight, lon]);
  }

  let cancelled = false;

  const polyline = L.polyline([], {
    color,
    weight: 2,
    opacity: 0.8,
    dashArray: '6, 4',
    className: 'missile-arc',
  }).addTo(layerGroup);

  const warhead = L.circleMarker(from, {
    radius: 4, color, fillColor: color, fillOpacity: 1, weight: 0,
  }).addTo(layerGroup);

  function animateLoop() {
    if (cancelled) return;
    let currentStep = 0;

    function step() {
      if (cancelled) return;
      if (currentStep >= points.length) {
        // Impact flash
        const impact = L!.circleMarker(to, {
          radius: 15, color: '#ff3366', fillColor: '#ff3366', fillOpacity: 0.6, weight: 2,
          className: 'alert-flash',
        }).addTo(layerGroup);
        setTimeout(() => { try { layerGroup.removeLayer(impact); } catch {} }, 2000);

        // Reset and loop after a pause
        setTimeout(() => {
          if (cancelled) return;
          polyline.setLatLngs([]);
          warhead.setLatLng(from);
          animateLoop();
        }, 3000);
        return;
      }
      polyline.setLatLngs(points.slice(0, currentStep + 1));
      warhead.setLatLng(points[currentStep]);
      currentStep++;
      setTimeout(step, 50);
    }
    step();
  }
  animateLoop();

  // Return cancel function
  return () => {
    cancelled = true;
    try {
      layerGroup.removeLayer(polyline);
      layerGroup.removeLayer(warhead);
    } catch {}
  };
}

// Geocode a strike — ONLY match specific locations, not generic country names
// This prevents "Iran war: day 22" from placing a random pin on the map
function geocodeStrike(description: string, location: string, theaterConfig: TheaterMapConfig): { coords: [number, number]; place: string } | null {
  const text = `${description} ${location}`.toLowerCase();

  // Also require a strike-indicating word to avoid matching city mentions in non-strike articles
  const strikeWords = ['strike', 'struck', 'hit', 'attack', 'bomb', 'missile', 'rocket',
    'drone', 'target', 'destroy', 'intercept', 'fire', 'launch', 'blast', 'explosion',
    'damage', 'killed', 'wounded', 'casualties', 'impact'];
  const hasStrikeWord = strikeWords.some(w => text.includes(w));
  if (!hasStrikeWord) return null;

  for (const [key, place] of theaterConfig.strikeTargets) {
    if (text.includes(key) && theaterConfig.strikeLocations[key]) {
      return { coords: theaterConfig.strikeLocations[key], place };
    }
  }

  return null;
}

export default function ConflictMap({ className }: MapProps) {
  const theater = useCurrentTheater();
  const { preferences, setConflictMapPreferences } = useDashboardPreferences();
  const theaterConfig = THEATER_MAP_CONFIG[theater];
  const [mounted, setMounted] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Layer groups
  const cityLayerRef = useRef<L.LayerGroup | null>(null);
  const airLayerRef = useRef<L.LayerGroup | null>(null);
  const navalLayerRef = useRef<L.LayerGroup | null>(null);
  const alertLayerRef = useRef<L.LayerGroup | null>(null);
  const strikeLayerRef = useRef<L.LayerGroup | null>(null);
  const rangeLayerRef = useRef<L.LayerGroup | null>(null);
  const toolLayerRef = useRef<L.LayerGroup | null>(null);

  // Marker tracking
  const airMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const navalMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const highlightRef = useRef<L.CircleMarker | null>(null);

  // Flight trail tracking: icao24 -> array of past positions
  const flightTrailsRef = useRef<Map<string, [number, number][]>>(new Map());
  const activeTrailRef = useRef<{ id: string; polyline: L.Polyline } | null>(null);

  const measurePointsRef = useRef<L.LatLng[]>([]);
  const measureLayerRef = useRef<L.LayerGroup | null>(null);

  // Previous alert status for detecting new alerts
  const prevAlertStatusRef = useRef<string>('CLEAR');
  const arcCancellersRef = useRef<(() => void)[]>([]);

  // Data feeds
  const { data: flights } = useTheaterDataFeed<FlightData>('/api/flights', 180000);
  const { data: naval } = useTheaterDataFeed<NavalData>('/api/ships', 300000);
  const { data: alerts } = useTheaterDataFeed<AlertData>('/api/alerts', 15000);
  const { data: conflicts } = useTheaterDataFeed<ConflictEvent[]>('/api/conflicts', 180000);
  const { data: strikes } = useTheaterDataFeed<StrikeData[]>('/api/strikes', 120000);
  const { data: telegram } = useTheaterDataFeed<TelegramData>('/api/telegram', 60000);

  const mapPreferences = preferences.uiState.conflictMap[theater];
  const {
    showMilAir,
    showNaval,
    showCities,
    showStrikes,
    showRangeRings,
    measureMode,
  } = mapPreferences;
  const showDeepStateMap = false;
  const showLeafletMap = !showDeepStateMap;

  const updateMapPreferences = useCallback(async (next: Partial<typeof mapPreferences>) => {
    await setConflictMapPreferences(theater, {
      ...mapPreferences,
      ...next,
    });
  }, [mapPreferences, setConflictMapPreferences, theater]);

  useEffect(() => {
    import('leaflet').then(leaflet => { L = leaflet; setMounted(true); });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mounted || !L || !showLeafletMap) return;
    const container = document.getElementById('conflict-map');
    if (!container || mapRef.current) return;

    const map = L.map('conflict-map', {
      center: theaterConfig.center, zoom: theaterConfig.zoom, zoomControl: false, attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    cityLayerRef.current = L.layerGroup().addTo(map);
    airLayerRef.current = L.layerGroup().addTo(map);
    navalLayerRef.current = L.layerGroup().addTo(map);
    alertLayerRef.current = L.layerGroup().addTo(map);
    strikeLayerRef.current = L.layerGroup().addTo(map);
    rangeLayerRef.current = L.layerGroup().addTo(map);
    toolLayerRef.current = L.layerGroup().addTo(map);
    measureLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      cityLayerRef.current = null;
      airLayerRef.current = null;
      navalLayerRef.current = null;
      alertLayerRef.current = null;
      strikeLayerRef.current = null;
      rangeLayerRef.current = null;
      toolLayerRef.current = null;
      measureLayerRef.current = null;
      airMarkersRef.current.clear();
      navalMarkersRef.current.clear();
      flightTrailsRef.current.clear();
    };
  }, [mounted, showLeafletMap, theaterConfig.center, theaterConfig.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo(theaterConfig.center, theaterConfig.zoom, { duration: 1.1 });
    prevAlertStatusRef.current = 'CLEAR';
    arcCancellersRef.current.forEach((cancel) => cancel());
    arcCancellersRef.current = [];
    airLayerRef.current?.clearLayers();
    navalLayerRef.current?.clearLayers();
    alertLayerRef.current?.clearLayers();
    strikeLayerRef.current?.clearLayers();
    rangeLayerRef.current?.clearLayers();
    toolLayerRef.current?.clearLayers();
    airMarkersRef.current.clear();
    navalMarkersRef.current.clear();
    cityMarkersRef.current.clear();
    flightTrailsRef.current.clear();
  }, [theaterConfig, theater]);

  // === DISTANCE MEASUREMENT TOOL ===
  useEffect(() => {
    if (!L || !mapRef.current || !measureLayerRef.current) return;
    const map = mapRef.current;

    if (!measureMode) {
      measurePointsRef.current = [];
      measureLayerRef.current.clearLayers();
      map.getContainer().style.cursor = '';
      return;
    }

    map.getContainer().style.cursor = 'crosshair';

    const onClick = (e: L.LeafletMouseEvent) => {
      if (!measureMode || !L || !measureLayerRef.current) return;

      measurePointsRef.current.push(e.latlng);
      const pts = measurePointsRef.current;

      // Add point marker
      L.circleMarker(e.latlng, {
        radius: 5, color: '#ffaa00', fillColor: '#ffaa00', fillOpacity: 1, weight: 0,
      }).addTo(measureLayerRef.current);

      if (pts.length === 2) {
        const dist = pts[0].distanceTo(pts[1]);
        const distKm = (dist / 1000).toFixed(1);
        const distMi = (dist / 1609.34).toFixed(1);
        const distNm = (dist / 1852).toFixed(1);

        // Draw line
        L.polyline([pts[0], pts[1]], {
          color: '#ffaa00', weight: 2, dashArray: '8, 6', opacity: 0.8,
        }).addTo(measureLayerRef.current);

        // Distance label at midpoint
        const midLat = (pts[0].lat + pts[1].lat) / 2;
        const midLng = (pts[0].lng + pts[1].lng) / 2;
        L.marker([midLat, midLng], {
          icon: L.divIcon({
            className: 'measure-label',
            html: `<div style="background:rgba(10,14,23,0.9);border:1px solid #ffaa00;padding:3px 6px;border-radius:3px;color:#ffaa00;font-family:monospace;font-size:10px;white-space:nowrap;">
              ${distKm} km | ${distMi} mi | ${distNm} nm
            </div>`,
            iconAnchor: [60, 12],
          }),
        }).addTo(measureLayerRef.current);

        // Reset for next measurement
        measurePointsRef.current = [];
      }
    };

    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [measureMode]);

  // === FOCUS events from panels ===
  useEffect(() => {
    if (!L || !mapRef.current) return;
    const handleFocus = (e: Event) => {
      const { id, lat, lon, type } = (e as CustomEvent).detail;
      const map = mapRef.current;
      if (!map || !L) return;

      map.flyTo([lat, lon], 8, { duration: 1.2 });

      if (highlightRef.current) { map.removeLayer(highlightRef.current); highlightRef.current = null; }

      const color = type === 'ship' ? '#00d4ff' : '#00aaff';
      const highlight = L.circleMarker([lat, lon], {
        radius: 20, color, fillColor: color, fillOpacity: 0.15, weight: 2, dashArray: '4, 4', className: 'highlight-pulse',
      });
      highlight.addTo(map);
      highlightRef.current = highlight;

      const markersMap = type === 'aircraft' ? airMarkersRef.current : navalMarkersRef.current;
      const marker = markersMap.get(id);
      if (marker) marker.openPopup();

      setTimeout(() => {
        if (highlightRef.current === highlight && map) { map.removeLayer(highlight); highlightRef.current = null; }
      }, 8000);
    };

    window.addEventListener('map-focus', handleFocus);
    return () => window.removeEventListener('map-focus', handleFocus);
  }, [mounted]);

  // === CITIES — track markers for dynamic popups ===
  const cityMarkersRef = useRef<Map<string, L.CircleMarker>>(new Map());

  useEffect(() => {
    if (!L || !cityLayerRef.current) return;

    cityLayerRef.current.clearLayers();
    cityMarkersRef.current.clear();

    theaterConfig.cities.forEach(city => {
      const size = city.capital ? 5 : 3;
      const color = city.country === 'Iran' || city.country === 'Russia'
        ? '#ff6666'
        : city.country === 'Israel' || city.country === 'Ukraine'
          ? '#66ccff'
          : '#999999';
      const marker = L!.circleMarker([city.lat, city.lon], { radius: size, color, fillColor: color, fillOpacity: 0.6, weight: 1 });
      marker.bindTooltip(city.name, { permanent: city.capital, direction: 'right', offset: [8, 0], className: 'city-label' });
      marker.bindPopup(''); // Will be set dynamically on click
      cityLayerRef.current!.addLayer(marker);
      cityMarkersRef.current.set(city.name, marker);
    });
  }, [mounted, theaterConfig]);

  // Update city popups when conflict/alert data changes
  useEffect(() => {
    if (!cityMarkersRef.current.size) return;

    theaterConfig.cities.forEach(city => {
      const marker = cityMarkersRef.current.get(city.name);
      if (!marker) return;

      // Find recent strikes mentioning this city/country
      const cityKey = city.name.toLowerCase();
      const countryKey = city.country.toLowerCase();
      const recentStrikes = (conflicts || [])
        .filter(e => {
          const text = `${e.description} ${e.location}`.toLowerCase();
          return text.includes(cityKey) || text.includes(countryKey);
        })
        .slice(0, 3);

      // Find active alerts for this city (Israeli cities only)
      const activeAlerts: string[] = [];
      if (alerts?.status === 'ACTIVE') {
        alerts.alerts.forEach(a => {
          a.locations.forEach(loc => {
            if (loc.toLowerCase().trim() === cityKey) {
              activeAlerts.push(`${a.type}: ${a.threat}`);
            }
          });
        });
      }

      // Build popup HTML
      let html = `<div style="font-family:monospace;font-size:11px;color:#000;min-width:220px;max-width:300px;max-height:250px;overflow-y:auto;">`;
      html += `<strong style="font-size:13px;">${city.name}</strong><br/>`;
      html += `<span style="color:#666;">${city.country}${city.capital ? ' (Capital)' : ''}</span>`;

      if (activeAlerts.length > 0) {
        html += `<div style="margin-top:6px;padding:4px 6px;background:#fff0f0;border:1px solid #ff3366;border-radius:3px;">`;
        html += `<strong style="color:#ff3366;">ACTIVE ALERTS</strong><br/>`;
        activeAlerts.forEach(a => { html += `<span style="color:#cc0000;font-size:10px;">${a}</span><br/>`; });
        html += `</div>`;
      }

      if (recentStrikes.length > 0) {
        html += `<div style="margin-top:6px;border-top:1px solid #ddd;padding-top:4px;">`;
        html += `<strong style="color:#ff6600;font-size:10px;">RECENT EVENTS</strong><br/>`;
        recentStrikes.forEach(s => {
          const timeStr = new Date(s.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          html += `<div style="margin:2px 0;font-size:10px;">`;
          html += `<span style="color:${s.type === 'STRIKE' ? '#ff3300' : s.type === 'DRONE' ? '#ff6600' : '#666'};font-weight:bold;">${s.type}</span> `;
          html += `${s.description.substring(0, 80)}${s.description.length > 80 ? '...' : ''}`;
          html += `<br/><span style="color:#999;font-size:9px;">${s.source} • ${timeStr}</span>`;
          html += `</div>`;
        });
        html += `</div>`;
      }

      if (recentStrikes.length === 0 && activeAlerts.length === 0) {
        html += `<div style="margin-top:4px;color:#999;font-size:10px;">No recent events reported</div>`;
      }

      html += `</div>`;
      marker.setPopupContent(html);
    });
  }, [alerts, conflicts, theaterConfig]);

  // City/air/naval visibility toggles
  useEffect(() => { if (mapRef.current && cityLayerRef.current) { showCities ? mapRef.current.addLayer(cityLayerRef.current) : mapRef.current.removeLayer(cityLayerRef.current); } }, [showCities]);
  useEffect(() => { if (mapRef.current && airLayerRef.current) { showMilAir ? mapRef.current.addLayer(airLayerRef.current) : mapRef.current.removeLayer(airLayerRef.current); } }, [showMilAir]);
  useEffect(() => { if (mapRef.current && navalLayerRef.current) { showNaval ? mapRef.current.addLayer(navalLayerRef.current) : mapRef.current.removeLayer(navalLayerRef.current); } }, [showNaval]);
  useEffect(() => { if (mapRef.current && strikeLayerRef.current) { showStrikes ? mapRef.current.addLayer(strikeLayerRef.current) : mapRef.current.removeLayer(strikeLayerRef.current); } }, [showStrikes]);

  // === AIRCRAFT with trail tracking ===
  const showTrailForAircraft = useCallback((icao24: string) => {
    if (!L || !mapRef.current || !toolLayerRef.current) return;

    // Remove existing trail
    if (activeTrailRef.current) {
      try { toolLayerRef.current.removeLayer(activeTrailRef.current.polyline); } catch {}
      activeTrailRef.current = null;
    }

    const trail = flightTrailsRef.current.get(icao24);
    if (!trail || trail.length < 2) return;

    const color = '#00aaff';
    const polyline = L.polyline(trail, {
      color, weight: 1.5, opacity: 0.6, dashArray: '4, 4',
    }).addTo(toolLayerRef.current);

    activeTrailRef.current = { id: icao24, polyline };
  }, []);

  const hideTrail = useCallback(() => {
    if (activeTrailRef.current && toolLayerRef.current) {
      try { toolLayerRef.current.removeLayer(activeTrailRef.current.polyline); } catch {}
      activeTrailRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!L || !airLayerRef.current || !flights?.flights) return;

    const currentIds = new Set<string>();

    flights.flights.forEach(f => {
      const id = f.icao24;
      currentIds.add(id);
      const color = getFlightColor(f.origin);

      // Record position for trail
      if (!flightTrailsRef.current.has(id)) flightTrailsRef.current.set(id, []);
      const trail = flightTrailsRef.current.get(id)!;
      const lastPos = trail[trail.length - 1];
      if (!lastPos || Math.abs(lastPos[0] - f.lat) > 0.001 || Math.abs(lastPos[1] - f.lon) > 0.001) {
        trail.push([f.lat, f.lon]);
        if (trail.length > 100) trail.shift(); // Keep last 100 positions
      }

      // Update active trail polyline if this aircraft is selected
      if (activeTrailRef.current?.id === id) {
        showTrailForAircraft(id);
      }

      const existing = airMarkersRef.current.get(id);
      const popupContent = `
        <div style="font-family:monospace;font-size:11px;color:#000;min-width:180px;">
          <strong style="color:${color}">${f.callsign || f.icao24}</strong><br/>
          <strong>${f.type}</strong><br/>
          ${f.aircraftType ? `Platform: ${f.aircraftType}${f.registration ? ` (${f.registration})` : ''}<br/>` : ''}
          Origin: ${f.origin}<br/>
          Alt: ${f.altitude.toLocaleString()} ft<br/>
          Speed: ${f.speed} kts | Hdg: ${f.heading}°
          ${f.squawk ? `<br/>Squawk: ${f.squawk}` : ''}
          <br/><em style="color:#666;font-size:9px;">Click to show flight trail</em>
        </div>
      `;

      if (existing) {
        animateMarker(existing, f.lat, f.lon, 2000);
        existing.setIcon(L!.divIcon({
          className: 'mil-aircraft-marker',
          html: `<div style="font-size:14px;transform:rotate(${f.heading}deg);filter:drop-shadow(0 0 4px ${color});color:${color};line-height:1;transition:transform 2s ease-out;">✈</div>`,
          iconSize: [18, 18], iconAnchor: [9, 9],
        }));
        existing.setPopupContent(popupContent);
      } else {
        const marker = L!.marker([f.lat, f.lon], {
          icon: L!.divIcon({
            className: 'mil-aircraft-marker',
            html: `<div style="font-size:14px;transform:rotate(${f.heading}deg);filter:drop-shadow(0 0 4px ${color});color:${color};line-height:1;transition:transform 2s ease-out;">✈</div>`,
            iconSize: [18, 18], iconAnchor: [9, 9],
          }),
        });
        marker.bindPopup(popupContent);
        marker.bindTooltip(f.callsign || f.icao24, { direction: 'top', offset: [0, -10], className: 'aircraft-label' });

        // Click to show trail, close to hide
        marker.on('click', () => showTrailForAircraft(id));
        marker.on('popupclose', () => hideTrail());

        airLayerRef.current!.addLayer(marker);
        airMarkersRef.current.set(id, marker);
      }
    });

    // Remove gone aircraft
    airMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        airLayerRef.current!.removeLayer(marker);
        airMarkersRef.current.delete(id);
        flightTrailsRef.current.delete(id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flights, showTrailForAircraft, hideTrail]);

  // === NAVAL ===
  useEffect(() => {
    if (!L || !navalLayerRef.current || !naval?.ships) return;
    const currentNames = new Set<string>();
    naval.ships.forEach(ship => {
      const id = ship.name;
      currentNames.add(id);
      const color = NAVY_COLORS[ship.navy] || '#888888';
      const isSub = ship.type.toLowerCase().includes('submarine');
      const existing = navalMarkersRef.current.get(id);
      if (existing) {
        animateMarker(existing, ship.lat, ship.lon, 3000);
      } else {
        const marker = L!.marker([ship.lat, ship.lon], {
          icon: L!.divIcon({
            className: 'naval-marker',
            html: `<div style="font-size:${isSub ? '10px' : '13px'};filter:drop-shadow(0 0 4px ${color});color:${color};line-height:1;">${isSub ? '▼' : '⛴'}</div>`,
            iconSize: [16, 16], iconAnchor: [8, 8],
          }),
        });
        marker.bindPopup(`
          <div style="font-family:monospace;font-size:11px;color:#000;min-width:180px;">
            <strong style="color:${color}">${ship.name}</strong><br/>
            ${ship.hull} &bull; ${ship.class}<br/>Type: ${ship.type}<br/>Navy: ${ship.navy}<br/>
            Status: ${ship.status}<br/>Region: ${ship.region}${ship.group ? `<br/>Group: ${ship.group}` : ''}
          </div>
        `);
        marker.bindTooltip(ship.name, { direction: 'top', offset: [0, -8], className: 'naval-label' });
        navalLayerRef.current!.addLayer(marker);
        navalMarkersRef.current.set(id, marker);
      }
    });
    navalMarkersRef.current.forEach((marker, id) => {
      if (!currentNames.has(id)) { navalLayerRef.current!.removeLayer(marker); navalMarkersRef.current.delete(id); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naval]);

  // === ALERTS with missile arcs ===
  useEffect(() => {
    if (!L || !alertLayerRef.current || !mapRef.current) return;

    // Only clear layers when transitioning states, not on every poll
    // This prevents missile arcs from being wiped after 5 seconds
    const wasActive = prevAlertStatusRef.current === 'ACTIVE';
    const isActive = alerts?.status === 'ACTIVE' && alerts.alerts.length > 0;

    if (!isActive) {
      // Cancel all looping arcs
      arcCancellersRef.current.forEach(cancel => cancel());
      arcCancellersRef.current = [];
      alertLayerRef.current.clearLayers();
    }

    if (isActive) {
      // Clear and redraw alert markers (but arcs persist from initial draw)
      if (!wasActive) {
        alertLayerRef.current.clearLayers();
      }

      alerts.alerts.forEach(alert => {
        alert.locations.forEach(loc => {
          const key = loc.toLowerCase().trim();
          const coords = theaterConfig.alertCities[key];
          if (coords) {
            const sirens = L!.circleMarker(coords, {
              radius: 12, color: '#ff3366', fillColor: '#ff3366', fillOpacity: 0.4, weight: 2, className: 'alert-flash',
            });
            sirens.bindPopup(`<div style="font-family:monospace;font-size:11px;color:#000;"><strong style="color:red">${alert.type}</strong><br/>${loc}<br/>${alert.threat}</div>`);
            alertLayerRef.current!.addLayer(sirens);
          }
        });
      });

      // Draw missile arcs on NEW alerts — only to specific alert cities
      if (prevAlertStatusRef.current !== 'ACTIVE') {
        const seenTargets = new Set<string>();
        const targetArcs: Array<{ coords: [number, number]; origin: [number, number] }> = [];

        alerts.alerts.forEach((alert) => {
          const threatText = `${alert.type} ${alert.threat}`.toLowerCase();
          const origin: [number, number] = alert.region === 'ukraine'
            ? (threatText.includes('crimea') || threatText.includes('black sea') ? [45.3, 34.2] : [50.6, 36.6])
            : (alert.type === 'MISSILE' || threatText.includes('iran') || threatText.includes('ballistic'))
                ? [33.5, 48.0]
                : (threatText.includes('lebanon') || threatText.includes('hezbollah'))
                    ? [33.89, 35.5]
                    : [33.5, 48.0];

          alert.locations.forEach((loc) => {
            const coords = theaterConfig.alertCities[loc.toLowerCase().trim()];
            if (!coords) {
              return;
            }

            const key = `${origin[0]},${origin[1]}:${coords[0]},${coords[1]}`;
            if (!seenTargets.has(key)) {
              seenTargets.add(key);
              targetArcs.push({ coords, origin });
            }
          });
        });

        if (targetArcs.length === 0) {
          targetArcs.push({ coords: theaterConfig.center, origin: theaterConfig.center });
        }

        targetArcs.forEach(({ coords, origin }, i) => {
          setTimeout(() => {
            if (alertLayerRef.current) {
              const c = drawMissileArc(mapRef.current!, origin, coords, '#ff3366', alertLayerRef.current);
              arcCancellersRef.current.push(c);
            }
          }, i * 500);
        });
      }
    }
    prevAlertStatusRef.current = alerts?.status || 'CLEAR';
  }, [alerts, theater, theaterConfig]);

  // === STRIKE MARKERS from conflict feed, strikes API, AND Telegram ===
  useEffect(() => {
    if (!L || !strikeLayerRef.current || !mapRef.current) return;

    strikeLayerRef.current.clearLayers();

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const plotted = new Set<string>(); // Dedup by title prefix
    const plottedLocations = new Set<string>(); // Dedup Telegram by location

    // Merge news data sources into a common format
    const allStrikes: { title: string; date: string; source: string; type: string; fromTelegram?: boolean }[] = [];

    // From conflicts API (priority — plotted first)
    if (conflicts) {
      conflicts.forEach(e => {
        if (e.type === 'STRIKE' || e.type === 'DRONE') {
          allStrikes.push({ title: e.description, date: e.date, source: e.source, type: e.type });
        }
      });
    }

    // From strikes API (priority — plotted first)
    if (strikes) {
      strikes.forEach(s => {
        if (s.category === 'MISSILE' || s.category === 'STRIKE' || s.category === 'DRONE') {
          allStrikes.push({ title: s.title, date: s.date, source: s.source, type: s.category });
        }
      });
    }

    // From Telegram posts (added last so they only fill gaps)
    if (telegram?.posts) {
      telegram.posts.forEach(post => {
        const t = post.text.toLowerCase();
        // Only include posts that mention strike-related keywords
        const strikeWords = ['strike', 'struck', 'hit', 'attack', 'bomb', 'missile', 'rocket',
          'drone', 'target', 'destroy', 'intercept', 'fire', 'launch', 'blast', 'explosion',
          'airstrike', 'killed', 'impact', 'barrage'];
        if (!strikeWords.some(w => t.includes(w))) return;

        let type = 'STRIKE';
        if (t.match(/missile|ballistic/)) type = 'MISSILE';
        else if (t.match(/drone|uav|shahed/)) type = 'DRONE';
        else if (t.match(/rocket/)) type = 'ROCKET';
        else if (t.match(/airstrike|air strike/)) type = 'AIRSTRIKE';

        allStrikes.push({
          title: post.text.length > 200 ? post.text.substring(0, 200) + '...' : post.text,
          date: post.date,
          source: `Telegram: ${post.channelLabel}`,
          type,
          fromTelegram: true,
        });
      });
    }

    allStrikes.forEach(event => {
      const t = new Date(event.date).getTime();
      if (isNaN(t) || t < cutoff) return;

      // Dedup by title
      const key = event.title.toLowerCase().substring(0, 40);
      if (plotted.has(key)) return;

      const geo = geocodeStrike(event.title, '', theaterConfig);
      if (!geo) return;

      // If this is from Telegram, skip if a news source already has a marker at this location
      if (event.fromTelegram && plottedLocations.has(geo.place.toLowerCase())) return;

      plotted.add(key);
      plottedLocations.add(geo.place.toLowerCase());

      const pos: [number, number] = [
        geo.coords[0] + (Math.random() - 0.5) * 0.15,
        geo.coords[1] + (Math.random() - 0.5) * 0.15,
      ];

      const timeStr = new Date(event.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const typeColor = event.type === 'MISSILE' ? '#ff0044' : event.type === 'DRONE' ? '#ff6600' : '#ff3300';
      const sourceTag = event.fromTelegram ? '📡 ' : '';
      const popupHtml = `
        <div style="font-family:monospace;font-size:11px;color:#000;min-width:220px;max-width:300px;">
          <strong style="color:${typeColor};font-size:12px;">${event.type} — ${geo.place}</strong><br/>
          <div style="margin:4px 0;line-height:1.4;">${event.title}</div>
          <em style="color:#666;font-size:9px;">${sourceTag}${event.source} • ${timeStr}</em>
        </div>
      `;

      const marker = L!.marker(pos, {
        icon: L!.divIcon({
          className: 'strike-marker',
          html: `<div style="width:22px;height:22px;position:relative;cursor:pointer;">
            <div style="position:absolute;inset:0;background:radial-gradient(circle,${typeColor} 25%,${typeColor}44 55%,transparent 70%);border-radius:50%;animation:alert-flash 1.5s ease-in-out infinite;"></div>
            <div style="position:absolute;inset:2px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;text-shadow:0 0 4px ${typeColor};">✦</div>
          </div>`,
          iconSize: [22, 22], iconAnchor: [11, 11],
        }),
      }).addTo(strikeLayerRef.current!);
      marker.bindPopup(popupHtml);
    });

    console.log(`[MAP] Plotted ${plotted.size} strike markers`);
  }, [conflicts, strikes, telegram, theaterConfig]);

  // === MISSILE RANGE RINGS ===
  useEffect(() => {
    if (!L || !rangeLayerRef.current || !mapRef.current) return;
    rangeLayerRef.current.clearLayers();

    if (!showRangeRings) return;

    theaterConfig.launchSites.forEach(site => {
      // Range circle
      const circle = L!.circle([site.lat, site.lon], {
        radius: site.range * 1000,
        color: '#ff336644',
        fillColor: '#ff336611',
        fillOpacity: 0.1,
        weight: 1,
        dashArray: '10, 8',
      });
      circle.bindTooltip(`${site.name}<br/>${site.range}km range`, { className: 'city-label' });
      rangeLayerRef.current!.addLayer(circle);

      // Launch site marker
      const marker = L!.circleMarker([site.lat, site.lon], {
        radius: 4, color: '#ff3366', fillColor: '#ff3366', fillOpacity: 0.8, weight: 1,
      });
      marker.bindTooltip(site.name, { className: 'city-label', direction: 'right', offset: [6, 0] });
      rangeLayerRef.current!.addLayer(marker);
    });
  }, [showRangeRings, theaterConfig]);

  return (
    <div className={`bg-card ${className || ''} flex flex-col overflow-hidden`}>
      <div className="relative z-10 flex items-center justify-between border-b border-border bg-card pl-6 pr-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Map</span>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {showLeafletMap && (
            [
              { label: `Air ${flights?.military || 0}`, active: showMilAir, toggle: () => { void updateMapPreferences({ showMilAir: !showMilAir }); } },
              { label: `Nav ${naval?.ships?.length || 0}`, active: showNaval, toggle: () => { void updateMapPreferences({ showNaval: !showNaval }); } },
              { label: 'Strikes', active: showStrikes, toggle: () => { void updateMapPreferences({ showStrikes: !showStrikes }); } },
              { label: 'Range', active: showRangeRings, toggle: () => { void updateMapPreferences({ showRangeRings: !showRangeRings }); } },
              { label: 'Cities', active: showCities, toggle: () => { void updateMapPreferences({ showCities: !showCities }); } },
              {
                label: 'Dist',
                active: measureMode,
                toggle: () => {
                  const nextMeasureMode = !measureMode;
                  if (!nextMeasureMode && measureLayerRef.current) {
                    measureLayerRef.current.clearLayers();
                  }
                  void updateMapPreferences({ measureMode: nextMeasureMode });
                },
              },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.toggle}
                className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                  btn.active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {btn.label}
              </button>
            ))
          )}
        </div>
      </div>
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {showDeepStateMap ? (
          <iframe
            src={DEEP_STATE_MAP_URL}
            title="DeepStateMap Ukraine Frontline Map"
            className="h-full w-full border-0 bg-black"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : !mounted ? (
          <div className="flex h-full items-center justify-center bg-muted/50">
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        ) : (
          <div id="conflict-map" className="w-full h-full" />
        )}
        {showLeafletMap && measureMode && (
          <div className="absolute top-2 left-2 z-[1000] text-xs px-2 py-1 rounded-md bg-background/90 border text-yellow-500">
            Measure mode — Click points. Click Dist to exit.
          </div>
        )}
      </div>

      <style jsx global>{`
        .city-label, .aircraft-label, .naval-label {
          background: hsl(220 14% 6% / 0.92) !important;
          border: 1px solid hsl(220 10% 16%) !important;
          color: hsl(220 6% 55%) !important;
          font-family: var(--font-geist-mono), monospace !important;
          font-size: 9px !important;
          padding: 1px 4px !important;
          border-radius: 2px !important;
          box-shadow: none !important;
        }
        .city-label::before, .aircraft-label::before, .naval-label::before {
          border-right-color: hsl(220 10% 16%) !important;
        }
        .aircraft-label { color: hsl(210 70% 55%) !important; }
        .naval-label { color: hsl(40 90% 56%) !important; }
        .mil-aircraft-marker, .naval-marker, .strike-marker, .measure-label { background: none !important; border: none !important; }
        .missile-arc { filter: drop-shadow(0 0 4px hsl(0 72% 51%)); }
      `}</style>
    </div>
  );
}
