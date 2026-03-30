import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  Star,
  MapPin,
  Scan,
  Trophy,
  Locate,
  CheckCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { ViewState } from '../../types';
import type { ARPoint, Region } from '../../types/ar';
import { useGeolocation } from '../../hooks/ar/useGeolocation';
import { useNearbyPoints } from '../../hooks/ar/useNearbyPoints';
import { useUserCollection } from '../../hooks/ar/useUserCollection';
import { useDeviceId } from '../../hooks/ar/useDeviceId';
import { useMotionDetection } from '../../hooks/ar/useMotionDetection';
import { useAudioGuide } from '../../hooks/ar/useAudioGuide';
import { ARPermissions } from './ARPermissions';
import { SafeModeOverlay } from './SafeModeOverlay';
import { QRScanner } from './QRScanner';

// ============================================================================
// CONSTANTS
// ============================================================================

const OAXACA_CENTER: [number, number] = [17.0608, -96.725];

// Demo quest state (static until quest hook exists)
const DEMO_QUEST = {
  nombre: 'La Busqueda de Donaji',
  totalItems: 4,
  itemsCollected: 1,
  emoji: '🌺',
};

// ============================================================================
// TYPES
// ============================================================================

interface ARHomeViewProps {
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

type ActiveTab = 'explorar' | 'coleccion';

// ============================================================================
// HELPER: create a custom Leaflet divIcon for an AR point
// ============================================================================

function createARPointIcon(
  color: string,
  emoji: string,
  isMonument: boolean,
  isCollected: boolean,
  isNear: boolean
): L.DivIcon {
  const size = isMonument ? 44 : 36;
  const opacity = isCollected ? 0.5 : 1;
  const pulse = isNear && !isCollected
    ? `box-shadow: 0 0 0 0 ${color}80; animation: ar-pulse 1.5s infinite;`
    : '';
  const checkmark = isCollected
    ? `<span style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;
                    background:#22c55e;border-radius:50%;display:flex;align-items:center;
                    justify-content:center;font-size:9px;color:white;font-weight:bold;">✓</span>`
    : '';

  return L.divIcon({
    className: 'ar-point-marker',
    html: `
      <div style="
        position:relative;
        width:${size}px;
        height:${size}px;
        background:${color};
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:${isMonument ? 20 : 16}px;
        opacity:${opacity};
        ${pulse}
      ">
        ${emoji}
        ${checkmark}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

// ============================================================================
// SUB-COMPONENT: map recenter button
// ============================================================================

function RecenterControl({
  position,
}: {
  position: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  function handleClick() {
    if (position) {
      map.flyTo([position.lat, position.lng], 15, { duration: 1 });
    } else {
      map.flyTo(OAXACA_CENTER, 14, { duration: 1 });
    }
  }

  return (
    <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '16px', marginRight: '12px' }}>
      <button
        onClick={handleClick}
        aria-label="Centrar en mi ubicacion"
        className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 focus:outline-none
                   focus:ring-2 focus:ring-red-500 transition-colors"
        style={{ zIndex: 1000 }}
      >
        <Locate className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: Skeleton for loading state
// ============================================================================

function PointSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="w-10 h-4 bg-gray-200 rounded" />
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: Quick action card
// ============================================================================

interface QuickActionProps {
  image: string;
  label: string;
  sublabel: string;
  color: string;
  onClick: () => void;
}

function QuickActionCard({ image, label, sublabel, color, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 p-5 bg-white rounded-2xl shadow-lg
                 border-2 border-transparent hover:border-purple-400 hover:shadow-xl
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                 active:scale-95 transition-all duration-200 w-full text-left"
      style={{ borderTop: `4px solid ${color}`, background: 'linear-gradient(135deg, white 0%, #faf5ff 100%)' }}
    >
      <div className="flex items-center justify-between w-full">
        <img src={image} alt={label} className="w-12 h-12 rounded-lg object-cover" />
        <span className="text-xs font-bold text-white bg-purple-600 px-2 py-1 rounded-full">
          3D
        </span>
      </div>
      <div className="w-full">
        <span className="font-bold text-gray-900 text-base leading-tight block">{label}</span>
        <span className="text-sm text-gray-500 mt-1 block">{sublabel}</span>
      </div>
      <div className="mt-2 flex items-center gap-1 text-purple-600 text-xs font-semibold">
        <span>Toca para ver</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </div>
    </button>
  );
}

// ============================================================================
// SUB-COMPONENT: Explorar tab content
// ============================================================================

interface ExplorarTabProps {
  points: (ARPoint & {
    distanceMeters: number;
    isWithinActivation: boolean;
    region?: Region;
  })[];
  collectedIds: Set<number>;
  isLoading: boolean;
  onSelectPoint: (point: ARPoint) => void;
}

function ExplorarTab({
  points,
  collectedIds,
  isLoading,
  onSelectPoint,
}: ExplorarTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4" data-testid="explorar-loading">
        {[1, 2, 3].map((i) => (
          <PointSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <span className="text-5xl mb-4" role="img" aria-label="mapa">🗺️</span>
        <p className="text-gray-500 font-medium">Sin puntos AR cerca</p>
        <p className="text-sm text-gray-400 mt-1">
          Explora Oaxaca para descubrir sitios arqueologicos, personajes y mas.
        </p>
      </div>
    );
  }

  const collectible = points.filter((p) => p.isCollectible);
  const collectedCount = collectible.filter((p) => collectedIds.has(p.id)).length;

  return (
    <div className="p-4 space-y-4">
      {/* Mini progress */}
      {collectible.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Tu progreso en la zona</span>
            <span className="text-sm text-gray-500">
              {collectedCount} / {collectible.length}
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full transition-all duration-500"
              style={{
                width: collectible.length > 0
                  ? `${(collectedCount / collectible.length) * 100}%`
                  : '0%',
              }}
            />
          </div>
        </div>
      )}

      {/* Points list — compact variant */}
      <div className="space-y-2" role="list" aria-label="Puntos AR cercanos">
        {points.map((point) => {
          const isCollected = collectedIds.has(point.id);
          const regionColor = point.region?.colorPrimario || point.color || '#E63946';
          const distText =
            point.distanceMeters < 1000
              ? `${Math.round(point.distanceMeters)}m`
              : `${(point.distanceMeters / 1000).toFixed(1)}km`;

          return (
            <button
              key={point.id}
              role="listitem"
              onClick={() => onSelectPoint(point)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full text-left
                focus:outline-none focus:ring-2 focus:ring-red-500
                ${
                  isCollected
                    ? 'bg-green-50 border-2 border-green-400'
                    : point.isWithinActivation
                    ? 'bg-amber-50 border-2 border-amber-400'
                    : 'bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
                }`}
              aria-label={`${point.nombre}${isCollected ? ', ya colectado' : ''}${point.isWithinActivation ? ', cerca!' : ''}`}
            >
              {/* Icon circle */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: `${regionColor}20` }}
                aria-hidden="true"
              >
                {isCollected ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <span>{point.emoji || '📍'}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate text-sm">{point.nombre}</p>
                <p className="text-xs text-gray-500 truncate">
                  {point.region?.nombre || point.tipo}
                </p>
              </div>

              {/* Right side */}
              <div className="text-right shrink-0">
                {point.isCollectible && !isCollected && (
                  <div className="flex items-center gap-1 justify-end mb-0.5">
                    <Star className="w-3 h-3 text-amber-500" aria-hidden="true" />
                    <span className="text-xs font-medium text-amber-600">
                      {point.pointsValue} pts
                    </span>
                  </div>
                )}
                <span
                  className={`text-sm font-medium ${
                    point.isWithinActivation ? 'text-amber-600' : 'text-gray-400'
                  }`}
                >
                  {distText}
                </span>
                {point.isWithinActivation && !isCollected && (
                  <p className="text-xs text-amber-600 font-semibold">Cerca!</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: Mi Coleccion tab content
// ============================================================================

interface ColeccionTabProps {
  collected: { id: number; [key: string]: unknown }[];
  progress: {
    collectionByRegion?: {
      regionId: number;
      regionNombre: string;
      regionColor: string;
      collected: number;
      total: number;
    }[];
  } | null;
  isLoading: boolean;
}

function ColeccionTab({ collected, progress, isLoading }: ColeccionTabProps) {
  if (isLoading) {
    return (
      <div className="p-4 grid grid-cols-3 gap-3" data-testid="coleccion-loading">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (collected.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 px-6 text-center"
        data-testid="coleccion-empty"
      >
        <span className="text-5xl mb-4" role="img" aria-label="cofre">🪆</span>
        <p className="text-gray-700 font-semibold">Tu coleccion esta vacia</p>
        <p className="text-sm text-gray-500 mt-2">
          Explora Oaxaca y acercate a los puntos AR para empezar a colectar.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Region progress bars */}
      {progress?.collectionByRegion && progress.collectionByRegion.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Progreso por region</h3>
          {progress.collectionByRegion.map((r) => (
            <div key={r.regionId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">{r.regionNombre}</span>
                <span className="text-xs text-gray-500">
                  {r.collected}/{r.total}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: r.total > 0 ? `${(r.collected / r.total) * 100}%` : '0%',
                    backgroundColor: r.regionColor,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid of collected items */}
      <div
        className="grid grid-cols-3 gap-3"
        role="list"
        aria-label="Items colectados"
      >
        {collected.map((item) => (
          <div
            key={item.id}
            role="listitem"
            className="aspect-square bg-gradient-to-br from-green-50 to-emerald-100
                       rounded-xl border-2 border-green-400 flex items-center justify-center
                       text-2xl shadow-sm"
            aria-label={`Item colectado ${item.id}`}
          >
            <CheckCircle className="w-8 h-8 text-green-500" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: ARHomeView
// ============================================================================

// Safe mode localStorage key
const LS_SAFE_MODE_KEY = 'ar_safe_mode_enabled';

function loadSafeModePref(): boolean {
  try {
    const raw = localStorage.getItem(LS_SAFE_MODE_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function ARHomeView({ onNavigate, onBack }: ARHomeViewProps) {
  const deviceId = useDeviceId();
  const [hasLocation, setHasLocation] = useState<boolean | null>(() => {
    const saved = localStorage.getItem('ar-location-choice');
    if (saved === 'granted') return true;
    if (saved === 'skipped') return false;
    return null; // first time — show prompt once
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('explorar');
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  // ── Safety + Audio ────────────────────────────────────────────────────────

  const [safeModeEnabled] = useState<boolean>(loadSafeModePref);
  const [safeModeUserDismissed, setSafeModeUserDismissed] = useState(false);

  const { isWalking, isStationary } = useMotionDetection();
  const audioGuide = useAudioGuide();

  // Safe mode is active when: feature enabled AND user is walking AND not manually dismissed
  const safeModeActive = safeModeEnabled && isWalking && !safeModeUserDismissed;

  // Re-arm safe mode when the user stops (isStationary)
  React.useEffect(() => {
    if (isStationary) {
      setSafeModeUserDismissed(false);
    }
  }, [isStationary]);

  const handleSafeModeDismiss = useCallback(() => {
    setSafeModeUserDismissed(true);
  }, []);

  // Geolocation — only start watching once permission granted
  const { position } = useGeolocation({
    watchPosition: hasLocation === true,
    enableHighAccuracy: true,
  });

  const userLatLng = position ? { lat: position.lat, lng: position.lng } : null;

  // Nearby AR points
  const { points, isLoading: pointsLoading } = useNearbyPoints(
    hasLocation === true ? position : null,
    { radius: 1000, enabled: hasLocation === true }
  );

  // User collection
  const { collected, collectedIds, isLoading: collectionLoading } = useUserCollection(
    deviceId || null
  );

  // ── Derived ────────────────────────────────────────────────────────────────

  const totalUserPoints = useMemo(
    () => points.filter((p) => collectedIds.has(p.id)).reduce((acc, p) => acc + p.pointsValue, 0),
    [points, collectedIds]
  );

  // ── Callbacks ──────────────────────────────────────────────────────────────

  const handlePermissionsReady = useCallback((granted: boolean) => {
    setHasLocation(granted);
    localStorage.setItem('ar-location-choice', granted ? 'granted' : 'skipped');
  }, []);

  const handleEnableLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => {
        setHasLocation(true);
        localStorage.setItem('ar-location-choice', 'granted');
      },
      () => { /* denied — do nothing */ },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleSelectPoint = useCallback(
    (point: ARPoint) => {
      onNavigate(ViewState.AR_POINT_DETAIL, { pointId: point.id, point });
    },
    [onNavigate]
  );

  const handleQRScan = useCallback(
    (pointCodigo: string) => {
      setQrScannerOpen(false);
      // Navigate to AR_POINT_DETAIL passing the codigo so the detail view can
      // fetch the point data. If the detail view accepts a codigo, pass it;
      // otherwise the view will show the point from the nearby list.
      onNavigate(ViewState.AR_POINT_DETAIL, { codigo: pointCodigo });
    },
    [onNavigate]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  // Show permissions overlay until the user makes a choice
  if (hasLocation === null) {
    return <ARPermissions onReady={handlePermissionsReady} />;
  }

  // QR scanner modal (rendered outside the scrollable layout)
  if (qrScannerOpen) {
    return (
      <QRScanner
        onScan={handleQRScan}
        onClose={() => setQrScannerOpen(false)}
      />
    );
  }

  const mapCenter: [number, number] = userLatLng
    ? [userLatLng.lat, userLatLng.lng]
    : OAXACA_CENTER;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-50 to-gray-50 overflow-hidden" data-testid="ar-home-view">
      {/* Header */}
      <div className="relative overflow-hidden">
        <img src="/images/verde.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <header className="relative z-10 shrink-0">
          <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 py-4 pt-8 max-w-7xl mx-auto">
            {/* Back + Image + Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                aria-label="Volver"
                className="p-3 -ml-1 rounded-full bg-white/20 backdrop-blur-sm shadow-md hover:bg-white/30 focus:outline-none
                           focus:ring-2 focus:ring-white/60 transition-colors"
              >
                <ChevronLeft className="w-7 h-7 text-white" />
              </button>
              <img src="/images/product_alebrije.png" alt="AR Guelaguetza" className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover drop-shadow-md" />
              <div className="text-white">
                <h1 className="text-xl font-bold leading-tight">
                  AR Guelaguetza
                </h1>
                <p className="text-white/70 text-xs leading-tight">
                  Explora artesanias y alebrijes en realidad aumentada
                </p>
              </div>
            </div>

            {/* Right side: Audio toggle + Points badge */}
            <div className="flex items-center gap-2">
              {/* Audio guide toggle */}
              <button
                onClick={audioGuide.toggle}
                data-testid="audio-guide-toggle"
                aria-label={audioGuide.isEnabled ? 'Desactivar guia de audio' : 'Activar guia de audio'}
                aria-pressed={audioGuide.isEnabled}
                className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 focus:outline-none
                           focus:ring-2 focus:ring-white/60 transition-colors"
              >
                {audioGuide.isEnabled ? (
                  <Volume2 className="w-5 h-5 text-white" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-5 h-5 text-white/70" aria-hidden="true" />
                )}
              </button>

              {/* Points badge */}
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30
                              rounded-full px-3 py-1.5">
                <Trophy className="w-4 h-4 text-oaxaca-yellow" aria-hidden="true" />
                <span className="text-sm font-bold text-white" aria-label={`${totalUserPoints} puntos`}>
                  {totalUserPoints.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* ── Map section ──────────────────────────────────────────────────── */}
        <section
          className="h-56 md:h-72 relative"
          aria-label="Mapa de puntos AR"
          data-testid="map-container"
        >
          <SafeModeOverlay
            isActive={safeModeActive}
            onDismiss={handleSafeModeDismiss}
          >
          <MapContainer
            center={mapCenter}
            zoom={14}
            minZoom={11}
            maxZoom={18}
            zoomControl={false}
            className="h-full w-full z-0"
            // Inline style intentionally avoided — height comes from parent container
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* User position — pulsing blue dot */}
            {userLatLng && (
              <CircleMarker
                center={[userLatLng.lat, userLatLng.lng]}
                radius={10}
                fillColor="#3B82F6"
                fillOpacity={1}
                stroke
                color="white"
                weight={3}
              >
                <Popup>Tu ubicacion actual</Popup>
              </CircleMarker>
            )}

            {/* AR point markers */}
            {points.map((point) => {
              const regionColor =
                (point as ARPoint & { region?: Region }).region?.colorPrimario ||
                point.color ||
                '#E63946';
              const isCollected = collectedIds.has(point.id);
              const isNear = (point as ARPoint & { isWithinActivation: boolean }).isWithinActivation;
              const icon = createARPointIcon(
                regionColor,
                point.emoji || '📍',
                point.tipo === 'monument',
                isCollected,
                isNear
              );

              return (
                <Marker
                  key={point.id}
                  position={[point.lat, point.lng]}
                  icon={icon}
                  eventHandlers={{
                    popupopen: () => {
                      // No-op — popup navigation happens via button inside popup
                    },
                  }}
                >
                  <Popup>
                    <div className="text-center min-w-[140px]">
                      <p className="font-semibold text-gray-900 text-sm">{point.nombre}</p>
                      {(point as ARPoint & { region?: Region }).region && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(point as ARPoint & { region?: Region }).region!.nombre}
                        </p>
                      )}
                      <button
                        onClick={() => handleSelectPoint(point)}
                        className="mt-2 w-full py-1.5 px-3 bg-red-600 text-white text-xs
                                   font-semibold rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Ver punto AR
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            <RecenterControl position={userLatLng} />
          </MapContainer>

          {/* No-location — button to activate */}
          {!hasLocation && (
            <button
              onClick={handleEnableLocation}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm
                            rounded-full px-4 py-2 shadow-lg text-xs text-gray-700 font-medium flex items-center gap-2
                            hover:bg-white transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-red-500" aria-hidden="true" />
              Activar ubicación
            </button>
          )}

          {/* QR scan button — top-right corner of the map */}
          <div className="absolute top-3 right-3 z-[1000]">
            <button
              onClick={() => setQrScannerOpen(true)}
              aria-label="Escanear código QR de punto AR"
              data-testid="qr-scan-map-button"
              className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm shadow-lg
                         rounded-full px-3 py-2 text-xs font-semibold text-gray-700
                         hover:bg-white focus:outline-none focus:ring-2 focus:ring-red-500
                         transition-colors"
            >
              <Scan className="w-4 h-4 text-red-600" aria-hidden="true" />
              <span>Escanear QR</span>
            </button>
          </div>
          </SafeModeOverlay>
        </section>

        {/* ── Quick actions ─────────────────────────────────────────────────── */}
        <section className="px-4 py-4 shrink-0" aria-label="Acciones rapidas">
          <div className="grid grid-cols-2 gap-3" role="list">
            <div role="listitem">
              <QuickActionCard
                image="/images/product_barro_negro.png"
                label="Artesanias 3D"
                sublabel="Piezas artesanales en alta calidad"
                color="#2A9D8F"
                onClick={() => onNavigate(ViewState.AR_VITRINA, { vitrinaSection: 'premium' })}
              />
            </div>
            <div role="listitem">
              <QuickActionCard
                image="/images/product_alebrije.png"
                label="Vitrina de Alebrijes"
                sublabel="Alebrijes generados con IA"
                color="#7C3AED"
                onClick={() => onNavigate(ViewState.AR_VITRINA, { vitrinaSection: 'trellis' })}
              />
            </div>
          </div>
        </section>

        {/* ── AR Location button ──────────────────────────────────────────── */}
        <section className="px-4 pb-4 shrink-0">
          <button
            onClick={() => onNavigate(ViewState.AR_LOCATION)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 text-white
                       shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold">AR Ubicacion</p>
              <p className="text-xs text-white/70">Usa la camara para encontrar un punto de interes</p>
            </div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </section>

        {/* ── Quest banner ──────────────────────────────────────────────────── */}
        <section className="px-4 pb-4 shrink-0" aria-label="Mision activa">
          <div
            className="bg-gradient-to-r from-red-600 to-amber-500 rounded-xl p-4 text-white
                        shadow-md"
            data-testid="quest-banner"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl" role="img" aria-hidden="true">
                {DEMO_QUEST.emoji}
              </span>
              <div>
                <p className="text-xs font-medium text-white/70 uppercase tracking-wide">
                  Mision activa
                </p>
                <p className="font-bold leading-tight">{DEMO_QUEST.nombre}</p>
              </div>
              <button
                onClick={() => onNavigate(ViewState.AR_QUEST)}
                className="ml-auto shrink-0 bg-white/20 hover:bg-white/30 focus:outline-none
                           focus:ring-2 focus:ring-white/60 rounded-lg px-3 py-1.5 text-xs
                           font-semibold transition-colors"
              >
                Ver quest
              </button>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-white/80 mb-1.5">
                <span>
                  {DEMO_QUEST.itemsCollected}/{DEMO_QUEST.totalItems} lirios
                </span>
                <span>
                  {Math.round((DEMO_QUEST.itemsCollected / DEMO_QUEST.totalItems) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{
                    width: `${(DEMO_QUEST.itemsCollected / DEMO_QUEST.totalItems) * 100}%`,
                  }}
                  role="progressbar"
                  aria-valuenow={DEMO_QUEST.itemsCollected}
                  aria-valuemin={0}
                  aria-valuemax={DEMO_QUEST.totalItems}
                  aria-label="Progreso de la mision"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <section className="px-4 pb-24" aria-label="Explorar y coleccion">
          {/* Tab headers */}
          <div
            className="flex rounded-xl bg-gray-200/60 p-1 mb-4"
            role="tablist"
            aria-label="Secciones"
          >
            {(['explorar', 'coleccion'] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`tabpanel-${tab}`}
                id={`tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-red-500
                  ${
                    activeTab === tab
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab === 'explorar' ? 'Explorar' : 'Mi Coleccion'}
                {tab === 'coleccion' && collected.length > 0 && (
                  <span className="ml-1.5 text-xs bg-red-600 text-white rounded-full
                                   px-1.5 py-0.5 font-bold">
                    {collected.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          <div
            id="tabpanel-explorar"
            role="tabpanel"
            aria-labelledby="tab-explorar"
            hidden={activeTab !== 'explorar'}
          >
            {activeTab === 'explorar' && (
              <ExplorarTab
                points={points as (ARPoint & {
                  distanceMeters: number;
                  isWithinActivation: boolean;
                  region?: Region;
                })[]}
                collectedIds={collectedIds}
                isLoading={pointsLoading}
                onSelectPoint={handleSelectPoint}
              />
            )}
          </div>

          <div
            id="tabpanel-coleccion"
            role="tabpanel"
            aria-labelledby="tab-coleccion"
            hidden={activeTab !== 'coleccion'}
          >
            {activeTab === 'coleccion' && (
              <ColeccionTab
                collected={collected}
                progress={null}
                isLoading={collectionLoading}
              />
            )}
          </div>
        </section>
      </main>

      {/* ── Bottom nav hint ────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100
                   flex items-center justify-center gap-2 py-3 z-10 shrink-0"
        aria-label="Acceso rapido al escaner AR"
      >
        <Scan className="w-4 h-4 text-gray-400" aria-hidden="true" />
        <span className="text-xs text-gray-500">
          Usa el{' '}
          <button
            onClick={() => onNavigate(ViewState.AR_SCANNER)}
            className="text-red-600 font-semibold underline-offset-2 hover:underline
                       focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
          >
            Escaner AR
          </button>{' '}
          para colectar puntos al estar cerca
        </span>
      </div>
    </div>
  );
}

export default ARHomeView;
