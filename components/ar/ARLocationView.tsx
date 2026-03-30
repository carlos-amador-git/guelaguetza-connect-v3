import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Navigation2, MapPin, Locate, Video, VideoOff } from 'lucide-react';
import { ViewState } from '../../types';
import { useGeolocation } from '../../hooks/ar/useGeolocation';

// ── Target location ─────────────────────────────────────────────────────────
const TARGET = {
  lat: 19.370198,
  lng: -99.577324,
  name: 'Punto de Interés',
  description: 'Ubicación señalada con AR',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Calculate bearing from point A to point B in degrees (0-360) */
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Calculate distance in meters between two coordinates (Haversine) */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format distance for display */
function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ── Component ───────────────────────────────────────────────────────────────

interface ARLocationViewProps {
  onBack: () => void;
}

export default function ARLocationView({ onBack }: ARLocationViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState<'pending' | 'granted' | 'denied'>('pending');

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
      console.warn('Camera not available, using map-only mode');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  }, []);

  // ── Compass (DeviceOrientation) ─────────────────────────────────────────

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // webkitCompassHeading for iOS, alpha for others
      const heading = (e as any).webkitCompassHeading ?? (e.alpha != null ? (360 - e.alpha) % 360 : null);
      if (heading != null) {
        setCompassHeading(heading);
        if (permissionState === 'pending') setPermissionState('granted');
      }
    };

    // iOS 13+ requires explicit permission
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission().then((state: string) => {
        if (state === 'granted') {
          setPermissionState('granted');
          window.addEventListener('deviceorientation', handleOrientation, true);
        } else {
          setPermissionState('denied');
        }
      }).catch(() => setPermissionState('denied'));
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, []);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ── Calculations ────────────────────────────────────────────────────────

  const bearing = position
    ? calculateBearing(position.lat, position.lng, TARGET.lat, TARGET.lng)
    : null;

  const distance = position
    ? calculateDistance(position.lat, position.lng, TARGET.lat, TARGET.lng)
    : null;

  // Relative angle: how much the user needs to turn from current heading
  const relativeAngle =
    bearing != null && compassHeading != null
      ? ((bearing - compassHeading + 360) % 360)
      : null;

  // Is the target roughly in front of the camera? (within ±30°)
  const isInView = relativeAngle != null && (relativeAngle < 30 || relativeAngle > 330);

  // Arrow rotation for the compass indicator
  const arrowRotation = relativeAngle ?? 0;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* Dark overlay when camera is off */}
      {!cameraActive && (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
          <div className="text-center text-white/60">
            <MapPin size={48} className="mx-auto mb-3 text-red-400" />
            <p className="text-sm">Modo mapa</p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-8">
        <button
          onClick={onBack}
          className="p-3 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium">
          AR Ubicacion
        </div>

        <button
          onClick={cameraActive ? stopCamera : startCamera}
          className="p-3 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition"
        >
          {cameraActive ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
      </div>

      {/* AR Overlay — Direction Arrow */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
        {position && compassHeading != null ? (
          <>
            {/* Large directional arrow */}
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                isInView
                  ? 'bg-green-500/30 border-4 border-green-400 shadow-[0_0_40px_rgba(34,197,94,0.5)]'
                  : 'bg-white/10 border-2 border-white/30'
              }`}
            >
              <Navigation2
                size={56}
                className={`transition-transform duration-200 ${isInView ? 'text-green-400' : 'text-white'}`}
                style={{ transform: `rotate(${arrowRotation}deg)` }}
              />
            </div>

            {/* Target label */}
            {isInView && (
              <div className="mt-6 bg-green-500/80 backdrop-blur-sm rounded-2xl px-6 py-3 text-white text-center animate-pulse">
                <div className="flex items-center gap-2 justify-center">
                  <MapPin size={18} />
                  <span className="font-bold">{TARGET.name}</span>
                </div>
                <p className="text-xs text-white/80 mt-1">El destino esta frente a ti</p>
              </div>
            )}

            {!isInView && (
              <p className="mt-4 text-white/60 text-sm">Gira hacia la flecha</p>
            )}
          </>
        ) : (
          <div className="text-center text-white/60">
            <Locate size={32} className="mx-auto mb-3 animate-pulse" />
            <p className="text-sm">
              {geoError || 'Obteniendo ubicacion...'}
            </p>
            {compassHeading == null && !geoError && (
              <p className="text-xs mt-2 text-white/40">Mueve el dispositivo para calibrar la brujula</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom info panel */}
      <div className="relative z-10 p-4 pb-8">
        <div className="bg-black/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          {/* Target info */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <MapPin size={20} className="text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-sm">{TARGET.name}</h3>
              <p className="text-white/50 text-xs">{TARGET.description}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Distance */}
            <div className="bg-white/5 rounded-xl p-2 text-center">
              <p className="text-white font-bold text-lg">
                {distance != null ? formatDistance(distance) : '--'}
              </p>
              <p className="text-white/40 text-[10px] uppercase">Distancia</p>
            </div>

            {/* Bearing */}
            <div className="bg-white/5 rounded-xl p-2 text-center">
              <p className="text-white font-bold text-lg">
                {bearing != null ? `${Math.round(bearing)}°` : '--'}
              </p>
              <p className="text-white/40 text-[10px] uppercase">Rumbo</p>
            </div>

            {/* Compass */}
            <div className="bg-white/5 rounded-xl p-2 text-center">
              <p className="text-white font-bold text-lg">
                {compassHeading != null ? `${Math.round(compassHeading)}°` : '--'}
              </p>
              <p className="text-white/40 text-[10px] uppercase">Brujula</p>
            </div>
          </div>

          {/* Coordinates */}
          <div className="mt-3 flex justify-between text-[10px] text-white/30">
            <span>Tu: {position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : 'Esperando GPS...'}</span>
            <span>Destino: {TARGET.lat}, {TARGET.lng}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
