import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Sparkles, Cpu } from 'lucide-react';
import { ARTESANIAS_PREMIUM, VITRINA_TRELLIS, type ArtesaniaItem } from './artesanias-data';

export type VitrinaSection = 'premium' | 'trellis';

const SECTION_CONFIG = {
  premium: {
    items: ARTESANIAS_PREMIUM,
    title: 'Artesanias de Oaxaca',
    subtitle: 'Piezas artesanales en 3D de alta calidad',
    sectionTitle: 'Artesanias de Alta Calidad',
    badge: 'Alta calidad',
    icon: Sparkles,
    iconColor: 'text-amber-500',
    tagColor: 'text-amber-500',
  },
  trellis: {
    items: VITRINA_TRELLIS,
    title: 'Vitrina de Alebrijes',
    subtitle: 'Alebrijes generados con inteligencia artificial',
    sectionTitle: 'Alebrijes TRELLIS',
    badge: 'TRELLIS',
    icon: Cpu,
    iconColor: 'text-purple-400',
    tagColor: 'text-purple-400',
  },
} as const;

interface VitrinaArtesaniasProps {
  section: VitrinaSection;
  onSelect: (item: ArtesaniaItem) => void;
  onBack: () => void;
}

/**
 * Ensures model-viewer custom element is registered before rendering.
 * Safari requires the element to be defined before instantiation.
 *
 * Strategy: check if already defined → if not, inject CDN script → wait for definition.
 * The CDN URL matches the one in index.html (v4.0.0). If index.html already
 * loaded it, the script is a no-op. If not (e.g. headless, offline), we inject it.
 */
function useModelViewerReady(): boolean {
  const [isReady, setIsReady] = useState(
    () => typeof customElements !== 'undefined' && !!customElements.get('model-viewer')
  );

  useEffect(() => {
    if (isReady) return;

    // If not defined after 1s, inject CDN script as fallback
    const fallbackTimer = setTimeout(() => {
      if (!customElements.get('model-viewer') && !document.querySelector('script[src*="model-viewer"]')) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';
        document.head.appendChild(script);
      }
    }, 1000);

    customElements.whenDefined('model-viewer').then(() => {
      clearTimeout(fallbackTimer);
      setIsReady(true);
    });

    return () => clearTimeout(fallbackTimer);
  }, [isReady]);

  return isReady;
}

export default function VitrinaArtesanias({ section, onSelect, onBack }: VitrinaArtesaniasProps) {
  const config = SECTION_CONFIG[section];
  const Icon = config.icon;
  const isReady = useModelViewerReady();

  return (
    <div className="min-h-dvh bg-gray-950">
      {/* Top bar — sticky so back button is always accessible */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800/50">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl bg-gray-800/70 px-3 py-2 text-sm font-medium text-gray-200 active:scale-95 transition-transform"
        >
          <ArrowLeft className="size-4" />
          Guelaguetza AR
        </button>
      </div>

      {/* Header */}
      <header className="px-4 py-6 text-center">
        <p className={`text-xs font-semibold uppercase tracking-widest ${config.tagColor}`}>
          Guelaguetza AR
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">
          {config.title}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-400">
          {config.subtitle}
        </p>
      </header>

      {/* Grid */}
      <section className="px-4 pb-8">
        <div className="mb-4 flex items-center gap-2">
          <Icon className={`size-4 ${config.iconColor}`} />
          <h2 className="text-lg font-bold text-white">{config.sectionTitle}</h2>
          <span className="text-xs text-gray-500">{config.items.length} piezas</span>
        </div>

        {/* Only render <model-viewer> elements after the custom element is
            registered. Safari requires the element to be defined before
            instantiation to correctly initialize WebGL and load the GLB. */}
        {isReady ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {config.items.map((item) => (
              <ModelCard key={item.id} item={item} onSelect={onSelect} badge={config.badge} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {config.items.map((item) => (
              <ModelCardSkeleton key={item.id} item={item} onSelect={onSelect} badge={config.badge} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ModelCard({
  item,
  onSelect,
  badge,
}: {
  item: ArtesaniaItem;
  onSelect: (item: ArtesaniaItem) => void;
  badge: string;
}) {
  return (
    <button
      onClick={() => onSelect(item)}
      className="group relative overflow-hidden rounded-2xl bg-gray-900 text-left shadow-lg active:scale-[0.97] transition-transform"
    >
      {/*
        Safari fix: loading="lazy" defers GLB fetch via built-in IntersectionObserver.
        reveal="auto" shows the model as soon as it's loaded (no interaction required).
        This component is only rendered AFTER customElements.whenDefined('model-viewer')
        resolves, ensuring Safari has fully upgraded the element before instantiation.
      */}
      <div
        className="relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200"
        style={{ width: '100%', paddingBottom: '100%' }}
      >
        {/* @ts-expect-error model-viewer web component */}
        <model-viewer
          src={item.glb}
          camera-controls
          auto-rotate
          auto-rotate-delay="0"
          interaction-prompt="auto"
          camera-orbit="0deg 75deg 150%"
          environment-image="neutral"
          tone-mapping="commerce"
          shadow-intensity="1"
          exposure="1.1"
          loading="lazy"
          reveal="auto"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            '--poster-color': '#e5e7eb',
          } as React.CSSProperties}
        />
      </div>

      {/* Info overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950/90 via-gray-950/60 to-transparent p-3 pt-10">
        <h3 className="text-sm font-bold text-white leading-tight">{item.nombre}</h3>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-0.5">
            <MapPin className="size-2.5" />
            {item.region}
          </span>
          <span className="flex items-center gap-0.5">
            <Sparkles className="size-2.5" />
            {badge}
          </span>
        </div>
      </div>

      {/* AR badge */}
      <div className="absolute right-2 top-2 rounded-md bg-gray-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 opacity-0 transition-opacity group-hover:opacity-100">
        AR
      </div>
    </button>
  );
}

/** Placeholder shown while waiting for model-viewer to register. Matches the
 *  card dimensions exactly so there's no layout shift when the grid swaps in. */
function ModelCardSkeleton({
  item,
  onSelect,
  badge,
}: {
  item: ArtesaniaItem;
  onSelect: (item: ArtesaniaItem) => void;
  badge: string;
}) {
  return (
    <button
      onClick={() => onSelect(item)}
      className="group relative overflow-hidden rounded-2xl bg-gray-900 text-left shadow-lg active:scale-[0.97] transition-transform"
    >
      <div
        className="relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-700 animate-pulse"
        style={{ width: '100%', paddingBottom: '100%' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-8 rounded-full border-2 border-gray-600 border-t-amber-500 animate-spin" />
        </div>
      </div>

      {/* Info overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950/90 via-gray-950/60 to-transparent p-3 pt-10">
        <h3 className="text-sm font-bold text-white leading-tight">{item.nombre}</h3>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-0.5">
            <MapPin className="size-2.5" />
            {item.region}
          </span>
          <span className="flex items-center gap-0.5">
            <Sparkles className="size-2.5" />
            {badge}
          </span>
        </div>
      </div>
    </button>
  );
}
