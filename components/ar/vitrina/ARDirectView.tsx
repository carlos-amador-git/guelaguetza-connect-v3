import { useEffect, useState } from 'react';
import { X, Share2, ExternalLink, Box } from 'lucide-react';
import { ARTESANIAS_PREMIUM, VITRINA_TRELLIS, type ArtesaniaItem } from './artesanias-data';

interface ARDirectViewProps {
  modelId: string;
  onClose: () => void;
}

/**
 * Ensures model-viewer custom element is registered before rendering.
 * Copied from VitrinaArtesanias.tsx — same CDN version (v4.0.0).
 */
function useModelViewerReady(): boolean {
  const [isReady, setIsReady] = useState(
    () => typeof customElements !== 'undefined' && !!customElements.get('model-viewer')
  );

  useEffect(() => {
    if (isReady) return;

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

function findModel(modelId: string): ArtesaniaItem | undefined {
  return (
    ARTESANIAS_PREMIUM.find((item) => item.id === modelId) ??
    VITRINA_TRELLIS.find((item) => item.id === modelId)
  );
}

export default function ARDirectView({ modelId, onClose }: ARDirectViewProps) {
  // Don't gate on useModelViewerReady — render <model-viewer> immediately.
  // The custom element auto-upgrades when the script loads (from index.html CDN).
  // This avoids blank screen on slow mobile connections.
  useModelViewerReady(); // Still triggers fallback CDN injection if needed
  const item = findModel(modelId);
  const [shareSupported] = useState(() => typeof navigator !== 'undefined' && !!navigator.share);

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/ar/${modelId}`;
    const shareData = {
      title: item ? `${item.nombre} — Guelaguetza Connect` : 'Artesanía AR',
      text: item?.descripcion ?? 'Explora esta artesanía oaxaqueña en Realidad Aumentada',
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        alert('Enlace copiado al portapapeles');
      }
    } catch {
      // User cancelled or clipboard failed — silently ignore
    }
  };

  const handleExploreMore = () => {
    // Navigate to home — clear the hash and let App.tsx handle it
    window.location.hash = '';
    onClose();
  };

  if (!item) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-50 px-6 text-center">
        <Box className="size-16 text-gray-700 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Modelo no encontrado</h1>
        <p className="text-gray-400 mb-8">
          No se encontró la artesanía con el ID <span className="font-mono text-amber-400">"{modelId}"</span>.
        </p>
        <button
          onClick={handleExploreMore}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-gray-950 active:scale-95 transition-transform"
        >
          <ExternalLink className="size-4" />
          Explorar Guelaguetza Connect
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col z-50">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-gray-950/80 to-transparent">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-xl bg-gray-800/70 p-2 text-gray-200 active:scale-95 transition-transform"
        >
          <X className="size-5" />
        </button>

        <button
          onClick={handleShare}
          aria-label={shareSupported ? 'Compartir' : 'Copiar enlace'}
          className="flex items-center gap-1.5 rounded-xl bg-gray-800/70 px-3 py-2 text-sm font-medium text-gray-200 active:scale-95 transition-transform"
        >
          <Share2 className="size-4" />
          Compartir
        </button>
      </div>

      {/* 3D model — render immediately, auto-upgrades when model-viewer script loads */}
      <div className="flex-1 relative bg-gray-900">
        {/* @ts-expect-error model-viewer web component */}
        <model-viewer
          src={item.glb}
          camera-controls
          auto-rotate
          auto-rotate-delay="0"
          interaction-prompt="auto"
          camera-orbit="0deg 75deg 105%"
          environment-image="neutral"
          tone-mapping="commerce"
          shadow-intensity="1"
          exposure="1.1"
          ar
          ar-modes="webxr scene-viewer quick-look"
          reveal="auto"
          loading="eager"
          style={{ display: 'block', width: '100%', height: '100%' }}
        >
          {/* Loading indicator inside model-viewer slot — visible until model loads */}
          <div slot="poster" className="flex h-full w-full items-center justify-center bg-gray-900">
            <div className="flex flex-col items-center gap-3">
              <div className="size-12 rounded-full border-2 border-gray-600 border-t-amber-500 animate-spin" />
              <p className="text-sm text-gray-400">Cargando modelo 3D...</p>
            </div>
          </div>
        </model-viewer>
      </div>

      {/* Bottom overlay — model info + AR button */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent px-5 pb-8 pt-16">
        {/* Model info */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            {item.region}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-white leading-tight">{item.nombre}</h1>
          <p className="mt-1 text-sm text-gray-400 leading-relaxed">{item.descripcion}</p>
        </div>

        {/* Ver en AR — triggers model-viewer's built-in AR flow */}
        <button
          onClick={() => {
            // Programmatically trigger the model-viewer AR button if available
            const mv = document.querySelector('model-viewer') as (HTMLElement & { activateAR?: () => void }) | null;
            mv?.activateAR?.();
          }}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-base font-bold text-gray-950 shadow-lg active:scale-[0.98] transition-transform mb-3"
        >
          <Box className="size-5" />
          Ver en AR
        </button>

        {/* Explore more link */}
        <button
          onClick={handleExploreMore}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-700 py-3 text-sm font-medium text-gray-300 active:scale-[0.98] transition-transform"
        >
          <ExternalLink className="size-4" />
          Explorar más en Guelaguetza Connect
        </button>
      </div>
    </div>
  );
}
