import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, MapPin, Locate, Video, VideoOff } from 'lucide-react';
import { useGeolocation } from '../../hooks/ar/useGeolocation';

// ── Target location ─────────────────────────────────────────────────────────
const TARGET = {
  lat: 19.370198,
  lng: -99.577324,
  altitude: 8, // meters above ground — visible floating marker
  name: 'Punto de Interés',
  description: 'Toluca, Estado de México',
};

// Camera field of view (wide to be forgiving on different devices)
const CAMERA_HFOV = 70; // horizontal degrees
const CAMERA_VFOV = 100; // vertical degrees

// Distance threshold: when closer than this, show "arrived" state
const ARRIVED_DISTANCE = 15; // meters

// ── Helpers ─────────────────────────────────────────────────────────────────

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
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Normalize angle to -180..180 range */
function normalizeAngle(angle: number): number {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}

// ── Component ───────────────────────────────────────────────────────────────

interface ARLocationViewProps {
  onBack: () => void;
}

export default function ARLocationView({ onBack }: ARLocationViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Device orientation: alpha = compass, beta = tilt front/back, gamma = tilt left/right
  const [orientation, setOrientation] = useState<{
    alpha: number; // compass heading (0-360)
    beta: number;  // tilt forward/backward (-180..180, 90 = vertical)
    gamma: number; // tilt left/right (-90..90)
  } | null>(null);

  const [orientationPermission, setOrientationPermission] = useState<'pending' | 'granted' | 'denied'>('pending');

  // GPS
  const { position, error: geoError } = useGeolocation({
    watchPosition: true,
    enableHighAccuracy: true,
  });

  // ── Camera ──────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      console.warn('Camera not available');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  }, []);

  // ── Device Orientation ──────────────────────────────────────────────────

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const compassHeading = (e as any).webkitCompassHeading ??
        (e.alpha != null ? (360 - e.alpha) % 360 : null);

      if (compassHeading != null && e.beta != null && e.gamma != null) {
        setOrientation({
          alpha: compassHeading,
          beta: e.beta,
          gamma: e.gamma,
        });
        if (orientationPermission === 'pending') setOrientationPermission('granted');
      }
    };

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      // Will be triggered by user tap (see requestPermission button)
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
      // If we get data, mark as granted
      setTimeout(() => {
        if (orientationPermission === 'pending') setOrientationPermission('denied');
      }, 3000);
    }

    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, []);

  const requestOrientationPermission = useCallback(async () => {
    try {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const state = await (DeviceOrientationEvent as any).requestPermission();
        if (state === 'granted') {
          setOrientationPermission('granted');
          const handler = (e: DeviceOrientationEvent) => {
            const compassHeading = (e as any).webkitCompassHeading ??
              (e.alpha != null ? (360 - e.alpha) % 360 : null);
            if (compassHeading != null && e.beta != null && e.gamma != null) {
              setOrientation({ alpha: compassHeading, beta: e.beta, gamma: e.gamma });
            }
          };
          window.addEventListener('deviceorientation', handler, true);
        } else {
          setOrientationPermission('denied');
        }
      }
    } catch {
      setOrientationPermission('denied');
    }
  }, []);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ── Projection: calculate marker position on screen ─────────────────────

  const bearing = position
    ? calculateBearing(position.lat, position.lng, TARGET.lat, TARGET.lng)
    : null;

  const distance = position
    ? calculateDistance(position.lat, position.lng, TARGET.lat, TARGET.lng)
    : null;

  // Has the user arrived?
  const hasArrived = distance != null && distance < ARRIVED_DISTANCE;

  // Elevation angle to target (considering altitude above ground)
  const elevationAngle = distance != null && distance > 0
    ? toDeg(Math.atan2(TARGET.altitude, distance))
    : 45; // when on top of target, look up ~45°

  // Screen position of the marker
  let markerX = 50; // percentage from left (50 = center)
  let markerY = 30; // percentage from top
  let isVisible = false;

  if (orientation && bearing != null) {
    // Horizontal: difference between compass heading and target bearing
    const hAngle = normalizeAngle(bearing - orientation.alpha);

    // Vertical: device tilt
    // beta≈90 → phone vertical, camera at horizon
    // beta≈0 → phone flat face-up, camera at sky
    const cameraPitch = 90 - orientation.beta;
    const vAngle = elevationAngle - cameraPitch;

    // Map angles to screen position
    markerX = 50 + (hAngle / CAMERA_HFOV) * 100;
    markerY = 50 - (vAngle / CAMERA_VFOV) * 100;

    // Clamp to screen edges (always show marker, just at the edge if out of FOV)
    const clampedX = Math.max(8, Math.min(92, markerX));
    const clampedY = Math.max(12, Math.min(85, markerY));

    // Check if in natural FOV
    const inFov = markerX > 5 && markerX < 95 && markerY > 5 && markerY < 95;

    // Always show marker but clamped to edges
    markerX = clampedX;
    markerY = clampedY;
    isVisible = true; // always show — clamped to edges when off-screen
  }

  // Scale marker based on distance (closer = bigger)
  const markerScale = distance != null
    ? Math.max(0.6, Math.min(2.5, 3000 / Math.max(distance, 50)))
    : 1;

  // Is the target roughly centered on screen? (user is pointing at it)
  const isPointingAt = orientation && bearing != null &&
    Math.abs(normalizeAngle(bearing - orientation.alpha)) < 25;

  const hasOrientation = orientation != null;
  const hasPosition = position != null;
  const isReady = hasOrientation && hasPosition;

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden touch-none">
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* Dark overlay when camera is off */}
      {!cameraActive && (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900 to-black" />
      )}

      {/* ── "Arrived" overlay when very close ─────────────────────────────── */}
      {isReady && hasArrived && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            {/* Large pulsing ring */}
            <div className="relative w-40 h-40 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-green-400/30 animate-ping" />
              <div className="absolute inset-4 rounded-full border-4 border-green-400/50 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-green-500 shadow-[0_0_50px_rgba(34,197,94,0.6)] flex items-center justify-center border-4 border-white">
                  <MapPin size={32} className="text-white" />
                </div>
              </div>
            </div>
            <div className="bg-green-500/80 backdrop-blur-md rounded-2xl px-8 py-4 border border-white/20">
              <p className="text-white font-bold text-lg">Has llegado!</p>
              <p className="text-white/80 text-sm">{TARGET.name}</p>
              <p className="text-white/60 text-xs mt-1">{distance != null ? formatDistance(distance) : ''} de distancia</p>
            </div>
          </div>
        </div>
      )}

      {/* ── AR Marker projected on camera (when not arrived) ──────────────── */}
      {isReady && !hasArrived && isVisible && (
        <div
          className="absolute z-20 pointer-events-none transition-all duration-150"
          style={{
            left: `${markerX}%`,
            top: `${markerY}%`,
            transform: `translate(-50%, -100%) scale(${markerScale})`,
          }}
        >
          <div className="relative flex flex-col items-center">
            {/* Pulse rings — only when pointing at target */}
            {isPointingAt && (
              <>
                <div className="absolute -inset-4 rounded-full border-2 border-red-400/40 animate-ping" />
                <div className="absolute -inset-2 rounded-full border-2 border-red-400/60 animate-pulse" />
              </>
            )}

            {/* Main marker pin */}
            <div className={`relative w-16 h-16 rounded-full flex items-center justify-center border-4 border-white transition-colors ${
              isPointingAt
                ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.8)]'
                : 'bg-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
            }`}>
              <MapPin size={28} className="text-white" />
            </div>

            {/* Pin tail line */}
            <div className="w-0.5 h-10 bg-gradient-to-b from-red-500 to-transparent" />
            <div className="w-2 h-2 rounded-full bg-red-500/50" />

            {/* Label */}
            <div className="mt-2 bg-black/70 backdrop-blur-md rounded-xl px-4 py-2 text-center border border-white/20 whitespace-nowrap">
              <p className="text-white font-bold text-sm">{TARGET.name}</p>
              <p className="text-red-300 text-xs font-medium">
                {distance != null ? formatDistance(distance) : '...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 pt-8">
        <button
          onClick={onBack}
          className="p-3 rounded-full bg-black/40 backdrop-blur-sm text-white"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
          AR Ubicacion
        </div>

        <button
          onClick={cameraActive ? stopCamera : startCamera}
          className="p-3 rounded-full bg-black/40 backdrop-blur-sm text-white"
        >
          {cameraActive ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
      </div>

      {/* ── Permission / Loading overlay ───────────────────────────────────── */}
      {!isReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="text-center p-8">
            {orientationPermission === 'pending' && typeof (DeviceOrientationEvent as any).requestPermission === 'function' ? (
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-white/10 flex items-center justify-center">
                  <Locate size={36} className="text-white" />
                </div>
                <p className="text-white font-bold text-lg">Permisos necesarios</p>
                <p className="text-white/60 text-sm max-w-xs">
                  Necesitamos acceso a la brujula y GPS para mostrar la ubicacion en AR
                </p>
                <button
                  onClick={requestOrientationPermission}
                  className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition"
                >
                  Activar brujula
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Locate size={36} className="mx-auto text-white animate-pulse" />
                <p className="text-white/80 text-sm">
                  {!hasPosition && 'Obteniendo ubicacion GPS...'}
                  {hasPosition && !hasOrientation && 'Calibrando brujula... mueve el dispositivo'}
                  {geoError && geoError}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom info panel ──────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-8">
        <div className="bg-black/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <MapPin size={20} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-sm truncate">{TARGET.name}</h3>
              <p className="text-white/50 text-xs">{TARGET.description}</p>
            </div>
            {distance != null && (
              <div className="text-right shrink-0">
                <p className="text-white font-bold">{formatDistance(distance)}</p>
                <p className="text-white/40 text-[10px]">distancia</p>
              </div>
            )}
          </div>

          {/* Mini compass + stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-lg p-1.5 text-center">
              <p className="text-white font-bold text-xs">
                {bearing != null ? `${Math.round(bearing)}°` : '--'}
              </p>
              <p className="text-white/30 text-[8px]">RUMBO</p>
            </div>
            <div className="bg-white/5 rounded-lg p-1.5 text-center">
              <p className="text-white font-bold text-xs">
                {orientation ? `${Math.round(orientation.alpha)}°` : '--'}
              </p>
              <p className="text-white/30 text-[8px]">BRUJULA</p>
            </div>
            <div className={`rounded-lg p-1.5 text-center ${isPointingAt ? 'bg-green-500/20' : 'bg-white/5'}`}>
              <p className={`font-bold text-xs ${isPointingAt ? 'text-green-400' : 'text-white'}`}>
                {isPointingAt ? '✓' : hasArrived ? '📍' : '←→'}
              </p>
              <p className="text-white/30 text-[8px]">{isPointingAt ? 'APUNTANDO' : hasArrived ? 'AQUI' : 'GIRAR'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
