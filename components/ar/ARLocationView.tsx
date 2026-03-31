import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, Navigation, MapPin, Footprints } from 'lucide-react';
import { useGeolocation } from '../../hooks/ar/useGeolocation';

// ── Target location ─────────────────────────────────────────────────────────
const TARGET = {
  lat: 17.065755,
  lng: -96.723224,
  name: 'Santo Domingo de Guzmán',
  description: 'Oaxaca',
};

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function getCardinalDirection(bearing: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(bearing / 45) % 8];
}

// ── Component ───────────────────────────────────────────────────────────────

interface ARLocationViewProps {
  onBack: () => void;
}

export default function ARLocationView({ onBack }: ARLocationViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  const { position } = useGeolocation({ watchPosition: true, enableHighAccuracy: true });

  const distance = position ? calculateDistance(position.lat, position.lng, TARGET.lat, TARGET.lng) : null;
  const bearing = position ? calculateBearing(position.lat, position.lng, TARGET.lat, TARGET.lng) : null;
  const hasArrived = distance != null && distance < 3;
  const isFarAway = distance != null && distance > 500;

  // Hide instructions when user arrives
  useEffect(() => {
    if (hasArrived) setShowInstructions(false);
  }, [hasArrived]);

  // Load A-Frame + AR.js
  const loadScripts = useCallback(async () => {
    try {
      if (!(window as any).AFRAME) {
        await loadScript('https://aframe.io/releases/1.4.2/aframe.min.js');
      }
      if (!(window as any).THREEx) {
        await loadScript('https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js');
      }
      setLoaded(true);
    } catch {
      setError('Error al cargar AR. Verifica tu conexion.');
    }
  }, []);

  useEffect(() => { loadScripts(); }, [loadScripts]);

  // Build A-Frame scene
  useEffect(() => {
    if (!loaded || !containerRef.current) return;
    containerRef.current.innerHTML = '';

    const scene = document.createElement('a-scene');
    scene.setAttribute('vr-mode-ui', 'enabled: false');
    scene.setAttribute('arjs', 'sourceType: webcam; videoTexture: true; debugUIEnabled: false;');
    scene.setAttribute('renderer', 'antialias: true; alpha: true; logarithmicDepthBuffer: true;');
    scene.style.position = 'absolute';
    scene.style.inset = '0';

    // ── 3D GLB Model at target GPS ──────────────────────────────────────
    const marker = document.createElement('a-entity');
    marker.setAttribute('gps-entity-place', `latitude: ${TARGET.lat}; longitude: ${TARGET.lng};`);
    marker.innerHTML = `
      <!-- Floating group (bobs up and down) -->
      <a-entity position="0 30 0"
                animation="property: position; from: 0 30 0; to: 0 33 0; dir: alternate; dur: 2000; loop: true; easing: easeInOutSine;">

        <!-- GLB Model (rotates) -->
        <a-entity animation="property: rotation; from: 0 0 0; to: 0 360 0; dur: 8000; loop: true; easing: linear;">
          <a-gltf-model src="/images/map_location_3d.glb"
                         scale="0.85 0.85 0.85"
                         rotation="0 0 0">
          </a-gltf-model>
        </a-entity>
      </a-entity>

      <!-- Glow underneath the model -->
      <a-circle color="#EF4444" radius="3" position="0 0.2 0" rotation="-90 0 0"
                material="opacity: 0.4; transparent: true; emissive: #EF4444; emissiveIntensity: 0.6; side: double;"
                animation="property: scale; from: 0.8 0.8 0.8; to: 1.4 1.4 1.4; dir: alternate; dur: 1200; loop: true;">
      </a-circle>

      <!-- Second pulse ring -->
      <a-ring color="#FBBF24" radius-inner="3.5" radius-outer="4" position="0 0.1 0" rotation="-90 0 0"
              material="opacity: 0.3; transparent: true; side: double;"
              animation="property: scale; from: 1 1 1; to: 1.8 1.8 1.8; dir: alternate; dur: 1800; loop: true;">
      </a-ring>

      <!-- Light beam -->
      <a-cylinder color="#EF4444" radius="0.08" height="30" position="0 15 0"
                  material="opacity: 0.25; transparent: true; emissive: #EF4444; emissiveIntensity: 1;">
      </a-cylinder>
    `;
    scene.appendChild(marker);

    // ── Camera ──────────────────────────────────────────────────────────
    const camera = document.createElement('a-camera');
    if (previewMode) {
      // Simulate being 20m north of the target so you can see the model
      const simLat = TARGET.lat + 0.00018; // ~20m north
      const simLng = TARGET.lng;
      camera.setAttribute('gps-camera', `simulateLatitude: ${simLat}; simulateLongitude: ${simLng};`);
    } else {
      camera.setAttribute('gps-camera', 'simulateLatitude: 0; simulateLongitude: 0;');
    }
    camera.setAttribute('rotation-reader', '');
    scene.appendChild(camera);

    containerRef.current.appendChild(scene);

    return () => { if (containerRef.current) containerRef.current.innerHTML = ''; };
  }, [loaded, previewMode]);

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* AR Scene */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 pt-8 pointer-events-none">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="p-3 rounded-2xl bg-black/40 backdrop-blur-xl text-white pointer-events-auto active:scale-95 transition">
            <ChevronLeft size={22} />
          </button>
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl px-5 py-2.5 flex items-center gap-2.5">
            <div className={`w-2 h-2 rounded-full ${previewMode ? 'bg-blue-400' : loaded ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
            <span className="text-white text-sm font-semibold">{previewMode ? 'Vista Previa' : 'AR Ubicacion'}</span>
          </div>
          {loaded && (
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-3 py-2 rounded-2xl backdrop-blur-xl text-xs font-semibold pointer-events-auto active:scale-95 transition ${
                previewMode ? 'bg-blue-500 text-white' : 'bg-black/40 text-white'
              }`}
            >
              {previewMode ? 'AR Real' : 'Preview'}
            </button>
          )}
          {!loaded && <div className="w-12" />}
        </div>
      </div>

      {/* ── Far away banner ──────────────────────────────────────────────── */}
      {loaded && isFarAway && !previewMode && (
        <div className="absolute top-24 left-4 right-4 z-50">
          <div className="bg-amber-500/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Navigation size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">Estas a {distance != null ? formatDistance(distance) : ''}</p>
                <p className="text-white/80 text-xs">Activa la vista previa para ver como se ve el AR en el destino</p>
              </div>
              <button
                onClick={() => setPreviewMode(true)}
                className="bg-white text-amber-600 px-3 py-2 rounded-xl text-xs font-bold shrink-0 active:scale-95 transition pointer-events-auto"
              >
                Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview mode indicator ────────────────────────────────────────── */}
      {previewMode && (
        <div className="absolute top-24 left-4 right-4 z-50 pointer-events-none">
          <div className="bg-blue-500/90 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-xl">
            <p className="text-white text-center text-sm">
              <span className="font-bold">Vista Previa</span> — Simulando estar a 20m del destino
            </p>
          </div>
        </div>
      )}

      {/* ── Floating label (HTML overlay, always readable) ─────────────────── */}
      {loaded && !hasArrived && (
        <div className="absolute left-0 right-0 z-50 flex justify-center pointer-events-none" style={{ top: '38%' }}>
          <div className="bg-black/60 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/15 text-center shadow-xl">
            <p className="text-white font-bold text-sm">{TARGET.name}</p>
            <p className="text-amber-400 text-xs mt-0.5">{TARGET.description}</p>
            {distance != null && (
              <p className="text-white/60 text-[10px] mt-1">{formatDistance(distance)}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Instructions toast ────────────────────────────────────────────── */}
      {loaded && showInstructions && (
        <div className="absolute top-24 left-4 right-4 z-50">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0">
                <Navigation size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 dark:text-white text-sm">Como usar</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">
                  Mueve el telefono lentamente mirando a tu alrededor.
                  Busca el <span className="text-red-500 font-semibold">marcador 3D</span> flotando
                  en la direccion del destino.
                </p>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Arrived celebration ────────────────────────────────────────────── */}
      {loaded && hasArrived && (
        <div className="absolute top-24 left-4 right-4 z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Footprints size={24} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-white">Has llegado!</p>
                <p className="text-white/80 text-xs">{TARGET.name} — {distance != null ? formatDistance(distance) : ''}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom panel ──────────────────────────────────────────────────── */}
      {loaded && (
        <div className="absolute bottom-0 left-0 right-0 z-50 p-4 pb-8 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            {/* Target info row */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shrink-0 shadow-lg">
                <MapPin size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm">{TARGET.name}</h3>
                <p className="text-white/50 text-xs">{TARGET.description}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/10 rounded-xl p-2.5 text-center">
                <p className="text-white font-bold text-base">{distance != null ? formatDistance(distance) : '--'}</p>
                <p className="text-white/40 text-[9px] uppercase tracking-wider mt-0.5">Distancia</p>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5 text-center">
                <p className="text-white font-bold text-base">
                  {bearing != null ? getCardinalDirection(bearing) : '--'}
                </p>
                <p className="text-white/40 text-[9px] uppercase tracking-wider mt-0.5">Direccion</p>
              </div>
              <div className={`rounded-xl p-2.5 text-center ${hasArrived ? 'bg-green-500/20' : 'bg-white/10'}`}>
                <p className={`font-bold text-base ${hasArrived ? 'text-green-400' : 'text-white'}`}>
                  {hasArrived ? '✓' : bearing != null ? `${Math.round(bearing)}°` : '--'}
                </p>
                <p className="text-white/40 text-[9px] uppercase tracking-wider mt-0.5">
                  {hasArrived ? 'Llegaste' : 'Rumbo'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {!loaded && !error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black">
          <div className="text-center px-8">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
              <div className="absolute inset-0 border-4 border-transparent border-t-red-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <MapPin size={28} className="text-red-500" />
              </div>
            </div>
            <p className="text-white font-bold text-lg mb-1">Iniciando AR</p>
            <p className="text-white/50 text-sm">Acepta los permisos de camara y ubicacion</p>
          </div>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black">
          <div className="text-center p-8">
            <p className="text-red-400 font-medium mb-4">{error}</p>
            <button onClick={onBack} className="bg-white/10 text-white px-6 py-3 rounded-xl font-medium">
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}
