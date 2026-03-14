import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  CheckCircle,
  MapPin,
  Star,
  Loader2,
} from 'lucide-react';
import { ViewState } from '../../types';
import type { ARPoint, Region, PointType } from '../../types/ar';
import { fetchPointById } from '../../services/ar';
import { useUserCollection } from '../../hooks/ar/useUserCollection';
import { useDeviceId } from '../../hooks/ar/useDeviceId';
import { ModelViewer } from './ModelViewer';
import { CollectSuccess } from './CollectSuccess';
import { hapticPulse, playAudioCue } from '../../services/ar-audio';

// ============================================================================
// TYPES
// ============================================================================

interface ARPointDetailViewProps {
  pointId: string;
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

type LoadState = 'loading' | 'loaded' | 'error';

// Point type label map (Spanish)
const TIPO_LABELS: Record<PointType, string> = {
  character:  'Personaje',
  monument:   'Monumento',
  quest_item: 'Item de Misión',
  info:       'Informativo',
  easter_egg: 'Easter Egg',
  event:      'Evento',
};

// ============================================================================
// HELPER: region color with fallback
// ============================================================================

function regionColor(point: (ARPoint & { region?: Region }) | null): string {
  return point?.region?.colorPrimario || point?.color || '#E63946';
}

// ============================================================================
// SUB-COMPONENT: ModelViewer placeholder (when no model URL)
// ============================================================================

interface PlaceholderProps {
  emoji?: string;
  nombre: string;
  color: string;
}

function ModelPlaceholder({ emoji, nombre, color }: PlaceholderProps) {
  return (
    <div
      data-testid="model-placeholder"
      className="w-full flex flex-col items-center justify-center gap-4 rounded-b-2xl"
      style={{
        minHeight: '55vw',
        maxHeight: '340px',
        background: `linear-gradient(135deg, ${color}22 0%, ${color}55 100%)`,
      }}
    >
      <span
        style={{ fontSize: '80px', lineHeight: 1 }}
        role="img"
        aria-label={nombre}
      >
        {emoji || '📍'}
      </span>
      <span className="text-sm font-medium text-gray-500">
        Modelo 3D no disponible
      </span>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: Loading skeleton
// ============================================================================

function DetailSkeleton() {
  return (
    <div className="animate-pulse" data-testid="detail-skeleton">
      {/* Hero */}
      <div className="w-full bg-gray-200" style={{ height: '260px' }} />
      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 rounded" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-4/6" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: ARPointDetailView
// ============================================================================

export function ARPointDetailView({
  pointId,
  onNavigate: _onNavigate,
  onBack,
}: ARPointDetailViewProps) {
  const deviceId = useDeviceId();
  const numericId = parseInt(pointId, 10);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const [point, setPoint] = useState<(ARPoint & { region?: Region; modelUrl?: string }) | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  // ── Collection state ───────────────────────────────────────────────────────
  const {
    collectedIds,
    collected,
    collectPoint: doCollect,
  } = useUserCollection(deviceId || null);

  const isCollected = collectedIds.has(numericId);

  // Derive collected-at date from collection list
  const collectionEntry = collected.find(
    (c) => c.id === numericId
  ) as (typeof collected[number] & { collectedAt?: string }) | undefined;

  const collectedAt = collectionEntry?.collectedAt
    ? new Date(collectionEntry.collectedAt as string).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // ── Proximity state (passed via navigation data) ──────────────────────────
  // We check localStorage for the distance passed from ARHomeView.
  // If isWithinActivation isn't known, we show as "not in range" to be safe.
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);

  // ── Collect success animation ──────────────────────────────────────────────
  const [showSuccess, setShowSuccess] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(25);
  const [isCollecting, setIsCollecting] = useState(false);

  // ── Fetch point ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!numericId || isNaN(numericId)) {
      setLoadState('error');
      return;
    }

    setLoadState('loading');

    fetchPointById(numericId).then((res) => {
      if (res.data) {
        setPoint(res.data as ARPoint & { region?: Region; modelUrl?: string });
        setLoadState('loaded');
      } else {
        setLoadState('error');
      }
    });
  }, [numericId]);

  // ── Read proximity from sessionStorage (set by ARHomeView) ─────────────────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`ar_point_proximity_${numericId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as { isWithinActivation: boolean; distanceMeters: number };
        setIsWithinRadius(parsed.isWithinActivation ?? false);
        setDistanceMeters(parsed.distanceMeters ?? null);
      }
    } catch {
      // ignore
    }
  }, [numericId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCollect = useCallback(async () => {
    if (isCollected || !isWithinRadius || isCollecting) return;
    setIsCollecting(true);

    try {
      const result = await doCollect(numericId);
      if (result.success) {
        const earned = result.pointsEarned ?? point?.pointsValue ?? 25;
        setPointsEarned(earned);
        setShowSuccess(true);
        // Audio-first feedback — additive to CollectSuccess visual animation
        hapticPulse('collected');
        playAudioCue('collect');
      }
    } finally {
      setIsCollecting(false);
    }
  }, [doCollect, isCollected, isWithinRadius, isCollecting, numericId, point]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const color = regionColor(point);
  const hasModel = !!point && !!((point as { modelUrl?: string }).modelUrl);
  const modelUrl = (point as { modelUrl?: string } | null)?.modelUrl;

  const distText =
    distanceMeters !== null
      ? distanceMeters < 1000
        ? `${Math.round(distanceMeters)} m`
        : `${(distanceMeters / 1000).toFixed(1)} km`
      : null;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadState === 'loading') {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden" data-testid="ar-point-detail-view">
        <DetailSkeleton />
      </div>
    );
  }

  if (loadState === 'error' || !point) {
    return (
      <div
        className="flex flex-col h-full bg-white items-center justify-center gap-4 p-8 text-center"
        data-testid="ar-point-detail-view"
      >
        <span className="text-5xl" role="img" aria-label="error">😕</span>
        <p className="text-gray-700 font-semibold">No se pudo cargar este punto</p>
        <button
          onClick={onBack}
          className="px-5 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold
                     hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-white overflow-hidden"
      data-testid="ar-point-detail-view"
    >
      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-32">

        {/* ── Hero: 3D Viewer / Placeholder ───────────────────────────────── */}
        <section
          className="relative w-full"
          style={{ minHeight: '55vw', maxHeight: '340px' }}
          aria-label="Visor 3D del punto AR"
        >
          {/* Header overlaid on top of viewer */}
          <header
            className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between
                        px-4 pt-12 pb-3
                        bg-gradient-to-b from-black/50 to-transparent"
          >
            <button
              onClick={onBack}
              aria-label="Volver al mapa AR"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90
                         shadow-md hover:bg-white focus:outline-none focus:ring-2
                         focus:ring-red-500 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-800" />
            </button>

            {/* Region badge */}
            {point.region && (
              <div
                className="flex items-center gap-1.5 bg-white/90 rounded-full px-3 py-1 shadow-sm"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold text-gray-800">
                  {point.region.nombre}
                </span>
              </div>
            )}
          </header>

          {/* Model or placeholder */}
          {hasModel ? (
            <ModelViewer
              src={modelUrl!}
              alt={point.nombre}
              poster={point.thumbnailUrl}
              autoRotate
              cameraControls
              ar
              className="w-full"
              data-testid="model-viewer-component"
            />
          ) : (
            <ModelPlaceholder
              emoji={point.emoji}
              nombre={point.nombre}
              color={color}
            />
          )}

          {/* Collect success overlay */}
          {showSuccess && (
            <CollectSuccess
              pointsEarned={pointsEarned}
              onDismiss={() => setShowSuccess(false)}
            />
          )}
        </section>

        {/* ── Info section ─────────────────────────────────────────────────── */}
        <section className="px-4 pt-5 pb-4 space-y-4">
          {/* Title + type badge */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {point.nombre}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: `${color}20`,
                  color,
                }}
              >
                {TIPO_LABELS[point.tipo] || point.tipo}
              </span>
              {point.isCollectible && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
                                  text-xs font-semibold bg-amber-50 text-amber-700">
                  <Star className="w-3 h-3" aria-hidden="true" />
                  {point.pointsValue} pts
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {point.descripcion && (
            <p className="text-gray-600 text-sm leading-relaxed">
              {point.descripcion}
            </p>
          )}

          {/* Narrativa */}
          {point.narrativa && (
            <div
              className="rounded-xl border-l-4 bg-gray-50 px-4 py-3"
              style={{ borderColor: color }}
              aria-label="Narrativa cultural"
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-1"
                 style={{ color }}>
                Narrativa
              </p>
              <p className="text-sm text-gray-700 italic leading-relaxed">
                {point.narrativa}
              </p>
            </div>
          )}

          {/* Region info */}
          {point.region && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <MapPin className="w-4 h-4 shrink-0" style={{ color }} aria-hidden="true" />
              <div>
                <p className="text-xs text-gray-500">Región</p>
                <p className="text-sm font-semibold text-gray-800">
                  {point.region.nombre}
                </p>
                {point.region.descripcion && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {point.region.descripcion}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Sticky collection bar ─────────────────────────────────────────── */}
      {point.isCollectible && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100
                      px-4 py-3 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
          aria-label="Sección de colección"
        >
          {isCollected ? (
            /* Already collected */
            <div
              data-testid="collected-badge"
              className="flex items-center justify-between bg-green-50 border border-green-200
                          rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-green-800 text-sm">Colectado</p>
                  {collectedAt && (
                    <p className="text-xs text-green-600">{collectedAt}</p>
                  )}
                </div>
              </div>
              <span className="text-xs font-bold text-green-700 bg-green-100
                               rounded-full px-2.5 py-1">
                +{point.pointsValue} pts
              </span>
            </div>
          ) : isWithinRadius ? (
            /* Within radius — pulse collect button */
            <div className="relative">
              {/* Pulse ring */}
              <span
                className="absolute inset-0 rounded-2xl animate-ping opacity-25"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <button
                data-testid="collect-button"
                onClick={handleCollect}
                disabled={isCollecting}
                className="relative w-full py-4 rounded-2xl font-bold text-white text-base
                           flex items-center justify-center gap-2
                           focus:outline-none focus:ring-2 focus:ring-offset-2
                           active:scale-95 transition-all duration-150 disabled:opacity-70"
                style={{ backgroundColor: color }}
                aria-label={`Colectar ${point.nombre} — ${point.pointsValue} puntos`}
              >
                {isCollecting ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Star className="w-5 h-5" aria-hidden="true" />
                )}
                {isCollecting ? 'Colectando...' : `Colectar — +${point.pointsValue} pts`}
              </button>
            </div>
          ) : (
            /* Not within radius */
            <button
              data-testid="approach-button"
              disabled
              aria-disabled="true"
              className="w-full py-4 rounded-2xl font-semibold text-sm text-gray-400
                         bg-gray-100 flex items-center justify-center gap-2 cursor-not-allowed"
              aria-label="Acércate para colectar este punto"
            >
              <MapPin className="w-4 h-4" aria-hidden="true" />
              {distText
                ? `Acércate para colectar — ${distText}`
                : 'Acércate para colectar'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ARPointDetailView;
