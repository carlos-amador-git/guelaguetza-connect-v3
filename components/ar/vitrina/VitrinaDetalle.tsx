import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, Download, X, MapPin, SlidersHorizontal, Box } from 'lucide-react';
import { ARTESANIAS } from './artesanias-data';

/**
 * Waits for the model-viewer custom element to be registered before rendering.
 * Uses customElements.whenDefined() instead of CDN script injection to avoid
 * version conflicts with ModelViewer.tsx (which loads v3.4.0 as a fallback).
 * Safari requires the element to be fully defined before instantiation.
 */
function useModelViewer() {
  const [ready, setReady] = useState(
    () => typeof customElements !== 'undefined' && !!customElements.get('model-viewer')
  );
  useEffect(() => {
    if (ready) return;
    customElements.whenDefined('model-viewer').then(() => setReady(true));
  }, [ready]);
  return ready;
}

interface MaterialSettings {
  exposure: number;
  metalness: number;
  roughness: number;
}

const PRESETS: Record<string, MaterialSettings> = {
  'Natural': { exposure: 1.1, metalness: 0.3, roughness: 0.25 },
  'Resina': { exposure: 1.2, metalness: 0.6, roughness: 0.08 },
  'Cristal': { exposure: 1.3, metalness: 0.9, roughness: 0.02 },
  'Neon': { exposure: 1.6, metalness: 0.1, roughness: 0.3 },
};

interface VitrinaDetalleProps {
  itemId?: string;
  onBack: () => void;
}

export default function VitrinaDetalle({ itemId, onBack }: VitrinaDetalleProps) {
  const item = ARTESANIAS.find(a => a.id === itemId);
  const viewerRef = useRef<HTMLElement>(null);
  const mvReady = useModelViewer();
  const [settings, setSettings] = useState<MaterialSettings>(PRESETS['Natural']);
  const [activePreset, setActivePreset] = useState('Natural');
  const [showInfo, setShowInfo] = useState(true);
  const [showSliders, setShowSliders] = useState(false);

  useEffect(() => {
    const mv = viewerRef.current as any;
    if (!mv) return;
    const apply = () => {
      mv.setAttribute('exposure', String(settings.exposure));
      if (mv.model?.materials) {
        for (const mat of mv.model.materials) {
          mat.pbrMetallicRoughness.setMetallicFactor(settings.metalness);
          mat.pbrMetallicRoughness.setRoughnessFactor(settings.roughness);
        }
      }
    };
    apply();
    mv.addEventListener('load', apply);
    return () => mv.removeEventListener('load', apply);
  }, [settings]);

  if (!item) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-950">
        <p className="text-gray-400">Artesanía no encontrada</p>
      </div>
    );
  }

  const selectPreset = (name: string) => {
    setActivePreset(name);
    setSettings(PRESETS[name]);
  };

  const updateSetting = (key: keyof MaterialSettings, value: number) => {
    setActivePreset('');
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative h-svh bg-gray-950 overflow-hidden">
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-2 py-2 bg-gray-950">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-2 text-sm font-bold text-gray-950 shadow-lg active:scale-95 transition-transform"
        >
          <ArrowLeft className="size-4" />
          <span>Artesanías</span>
        </button>

        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex size-9 items-center justify-center rounded-full bg-gray-800/80 text-white shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
          aria-label={showInfo ? 'Ocultar info' : 'Mostrar info'}
        >
          {showInfo ? <X className="size-4" /> : <SlidersHorizontal className="size-4" />}
        </button>
      </div>

      {/* 3D Viewer — below top bar */}
      <div className="absolute inset-x-0 top-14 bottom-24 bg-gray-900">
        {mvReady ? (
          <model-viewer
            ref={viewerRef as any}
            src={item.glb}
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            camera-orbit="0deg 75deg 150%"
            auto-rotate
            auto-rotate-delay="0"
            shadow-intensity="1.5"
            shadow-softness="0.8"
            exposure={String(settings.exposure)}
            environment-image="neutral"
            tone-mapping="commerce"
            style={{ display: 'block', width: '100%', height: '100%' }}
          >
            <button
              slot="ar-button"
              class="absolute bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-sm font-bold text-gray-950 shadow-xl"
              style={{ position: 'absolute', bottom: '80px', right: '16px' }}
            >
              <Eye className="size-4" />
              AR
            </button>
          </model-viewer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="size-12 animate-spin rounded-full border-2 border-gray-600 border-t-amber-500" />
          </div>
        )}
      </div>

      {/* Bottom panel */}
      {showInfo && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gray-950 px-4 pb-2 pt-2">
          <div className="mx-auto max-w-lg">
            <h2 className="text-2xl font-bold text-white">{item.nombre}</h2>
            <p className="mt-1 text-sm text-gray-300">{item.descripcion}</p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {item.region}
              </span>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">
                Alta calidad
              </span>
            </div>

            {/* Presets */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowSliders(!showSliders)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  showSliders
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'border border-gray-700 text-gray-400'
                }`}
              >
                <SlidersHorizontal className="size-3" />
                Ajustes
              </button>
              {Object.keys(PRESETS).map((name) => (
                <button
                  key={name}
                  onClick={() => selectPreset(name)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    activePreset === name
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'border border-gray-700 text-gray-400'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* Sliders */}
            {showSliders && (
              <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg bg-gray-800/50 p-3">
                <SliderControl label="Brillo" value={settings.exposure} min={0.3} max={2.5} step={0.05} onChange={(v) => updateSetting('exposure', v)} />
                <SliderControl label="Metálico" value={settings.metalness} min={0} max={1} step={0.05} onChange={(v) => updateSetting('metalness', v)} />
                <SliderControl label="Rugosidad" value={settings.roughness} min={0} max={1} step={0.05} onChange={(v) => updateSetting('roughness', v)} />
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  const mv = document.querySelector('model-viewer');
                  if (mv && (mv as any).activateAR) {
                    (mv as any).activateAR();
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-gray-950 transition-colors hover:bg-amber-400"
              >
                <Box className="size-3.5" />
                Ver en AR
              </button>
              <a
                href={item.glb}
                download={`${item.id}.glb`}
                className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                <Download className="size-3.5" />
                Descargar GLB
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400">{label}</label>
        <span className="text-xs tabular-nums text-gray-500">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-700 accent-amber-500"
      />
    </div>
  );
}
