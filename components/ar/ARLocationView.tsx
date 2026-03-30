import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, MapPin, Locate, Video, VideoOff } from 'lucide-react';
import { useGeolocation } from '../../hooks/ar/useGeolocation';

// ── Target location ─────────────────────────────────────────────────────────
const TARGET = {
  lat: 19.370198,
  lng: -99.577324,
  altitude: 50, // meters above ground — makes the marker float in the sky
  name: 'Punto de Interés',
  description: 'Toluca, Estado de México',
};

// Camera field of view (approximate for most phone cameras)
const CAMERA_HFOV = 60; // horizontal degrees
const CAMERA_VFOV = 80; // vertical degrees

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

  // Elevation angle to target (considering altitude above ground)
  const elevationAngle = distance != null && distance > 0
    ? toDeg(Math.atan2(TARGET.altitude, distance))
    : 0;

  // Screen position of the marker
  let markerX = 50; // percentage from left (50 = center)
  let markerY = 50; // percentage from top (50 = center)
  let isVisible = false;

  if (orientation && bearing != null) {
    // Horizontal: difference between compass heading and target bearing
    const hAngle = normalizeAngle(bearing - orientation.alpha);

    // Vertical: device tilt (beta=90 means phone vertical, looking at horizon)
    // When phone is vertical, beta≈90. Camera points at horizon.
    // elevation angle of camera center = 90 - beta (when beta=90, looking at horizon=0°)
    const cameraPitch = 90 - orientation.beta; // angle above/below horizon camera is pointing
    const vAngle = elevationAngle - cameraPitch;

    // Map angles to screen position
    markerX = 50 + (hAngle / CAMERA_HFOV) * 100;
    markerY = 50 - (vAngle / CAMERA_VFOV) * 100; // invert: up on screen = negative Y

    // Visible if within camera FOV bounds (with some margin)
    isVisible = markerX > -20 && markerX < 120 && markerY > -20 && markerY < 120;
  }

  // Scale marker based on distance (closer = bigger)
  const markerScale = distance != null
    ? Math.max(0.5, Math.min(2, 5000 / Math.max(distance, 100)))
    : 1;

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

      {/* ── AR Marker projected on camera ─────────────────────────────────── */}
      {isReady && isVisible && (
        <div
          className="absolute z-20 pointer-events-none transition-all duration-100"
          style={{
            left: `${markerX}%`,
            top: `${markerY}%`,
            transform: `translate(-50%, -50%) scale(${markerScale})`,
          }}
        >
          {/* Pin + pulse ring */}
          <div className="relative flex flex-col items-center">
            {/* Pulse rings */}
            <div className="absolute w-24 h-24 rounded-full border-2 border-red-400/40 animate-ping" />
            <div className="absolute w-16 h-16 rounded-full border-2 border-red-400/60 animate-pulse" />

            {/* Main marker */}
            <div className="relative w-14 h-14 rounded-full bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.7)] flex items-center justify-center border-3 border-white">
              <MapPin size={24} className="text-white" />
            </div>

            {/* Pin tail */}
            <div className="w-0.5 h-8 bg-gradient-to-b from-red-500 to-transparent" />

            {/* Label */}
            <div className="mt-1 bg-black/70 backdrop-blur-md rounded-xl px-4 py-2 text-center border border-white/20 whitespace-nowrap">
              <p className="text-white font-bold text-sm">{TARGET.name}</p>
              <p className="text-red-300 text-xs font-medium">
                {distance != null ? formatDistance(distance) : '...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Direction indicator (edge arrow when marker is off-screen) ──── */}
      {isReady && !isVisible && bearing != null && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div
            className="absolute"
            style={{
              left: `${Math.max(5, Math.min(95, markerX))}%`,
              top: markerY < 0 ? '5%' : markerY > 100 ? '90%' : `${Math.max(5, Math.min(95, markerY))}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="flex flex-col items-center gap-1 animate-bounce">
              <div className="w-10 h-10 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center border-2 border-white/50">
                <MapPin size={18} className="text-white" />
              </div>
              <span className="text-[10px] text-white bg-black/60 rounded-full px-2 py-0.5">
                {distance != null ? formatDistance(distance) : ''}
              </span>
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
          <div className="grid grid-cols-4 gap-2">
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
            <div className="bg-white/5 rounded-lg p-1.5 text-center">
              <p className="text-white font-bold text-xs">
                {`${TARGET.altitude}m`}
              </p>
              <p className="text-white/30 text-[8px]">ALTITUD</p>
            </div>
            <div className="bg-white/5 rounded-lg p-1.5 text-center">
              <p className="text-white font-bold text-xs">
                {isVisible ? '✓' : '←→'}
              </p>
              <p className="text-white/30 text-[8px]">{isVisible ? 'VISIBLE' : 'GIRAR'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
