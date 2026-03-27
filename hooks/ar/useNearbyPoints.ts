import { useState, useEffect, useCallback, useRef } from 'react';
import type { GeoPosition, ARPoint, NearbyPointsResponse } from '../../types/ar';
import { cachePoints, getCachedPoints } from '../../services/ar-offline';

const API_BASE = ((import.meta as { env: { VITE_API_URL?: string } }).env.VITE_API_URL || 'http://localhost:3001') + '/api';

// ============================================================================
// HOOK: PUNTOS CERCANOS
// Fetches /api/ar/nearby with position, auto-refreshes every 30s
// Falls back to IndexedDB cache when offline
// ============================================================================

interface UseNearbyPointsOptions {
  radius?: number;
  enabled?: boolean;
  refreshInterval?: number;
}

interface UseNearbyPointsReturn {
  points: (ARPoint & {
    distanceMeters: number;
    isWithinActivation: boolean;
  })[];
  count: number;
  error: string | null;
  isLoading: boolean;
  isOffline: boolean;
  isStale: boolean;
  refresh: () => void;
}

export function useNearbyPoints(
  position: GeoPosition | null,
  options: UseNearbyPointsOptions = {}
): UseNearbyPointsReturn {
  const { radius = 500, enabled = true, refreshInterval = 30000 } = options;

  const [data, setData] = useState<NearbyPointsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isStale, setIsStale] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFailedRef = useRef(false);

  // Store position in a ref so fetchPoints doesn't depend on it
  const positionRef = useRef(position);
  positionRef.current = position;

  const fetchPoints = useCallback(async () => {
    if (!positionRef.current || !enabled) return;
    if (hasFailedRef.current) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);

    // --- Try online ---
    try {
      const pos = positionRef.current!;
      const url = `${API_BASE}/ar/nearby?lat=${pos.lat}&lng=${pos.lng}&radius=${radius}`;
      const res = await fetch(url, { signal: abortControllerRef.current.signal });

      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

      const json: NearbyPointsResponse = await res.json();
      setData(json);
      setError(null);
      setIsOffline(false);
      setIsStale(false);
      hasFailedRef.current = false;

      // Cache in the background
      if (json.points?.length) {
        cachePoints(json.points).catch((err) => {
          if ((import.meta as { env: { DEV?: boolean } }).env.DEV) console.warn('[useNearbyPoints] Cache write failed:', err);
        });
      }

      setIsLoading(false);
      return;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // Fall through to cache
    }

    // --- Try IndexedDB cache ---
    try {
      const cached = await getCachedPoints();

      if (cached.length > 0) {
        // Synthesize a NearbyPointsResponse from cached points
        // Distance/activation data will be approximate (we don't have it offline)
        const syntheticPoints = cached.map((p) => ({
          ...p,
          distanceMeters: 0,
          isWithinActivation: false,
        }));

        setData({ count: syntheticPoints.length, points: syntheticPoints });
        setError(null);
        setIsOffline(true);
        setIsStale(true);
      } else {
        setError('Sin conexion y sin datos en cache');
        setIsOffline(true);
        setIsStale(false);
      }
    } catch {
      setError('Error al cargar puntos cercanos');
      setIsOffline(true);
    } finally {
      setIsLoading(false);
      hasFailedRef.current = true;
      // Stop polling after failure to avoid spamming console
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [enabled, radius]);

  const refresh = useCallback(() => {
    hasFailedRef.current = false;
    fetchPoints();
  }, [fetchPoints]);

  useEffect(() => {
    fetchPoints();

    if (refreshInterval > 0 && position && enabled) {
      intervalRef.current = setInterval(fetchPoints, refreshInterval);
    }

    return () => {
      abortControllerRef.current?.abort();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchPoints, refreshInterval, enabled]);

  return {
    points: data?.points || [],
    count: data?.count || 0,
    error,
    isLoading,
    isOffline,
    isStale,
    refresh,
  };
}
