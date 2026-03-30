import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';

// ── Target location ─────────────────────────────────────────────────────────
const TARGET = {
  lat: 19.370198,
  lng: -99.577324,
  name: 'Punto de Interés',
};

interface ARLocationViewProps {
  onBack: () => void;
}

export default function ARLocationView({ onBack }: ARLocationViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load A-Frame + AR.js scripts dynamically
  const loadScripts = useCallback(async () => {
    try {
      // Load A-Frame first
      if (!(window as any).AFRAME) {
        await loadScript('https://aframe.io/releases/1.4.2/aframe.min.js');
      }
      // Then AR.js (location-based)
      if (!(window as any).THREEx) {
        await loadScript('https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js');
      }
      setLoaded(true);
    } catch (err) {
      setError('Error al cargar AR. Verifica tu conexion.');
      console.error('AR script load error:', err);
    }
  }, []);

  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  // Build A-Frame scene once scripts are loaded
  useEffect(() => {
    if (!loaded || !containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    const scene = document.createElement('a-scene');
    scene.setAttribute('vr-mode-ui', 'enabled: false');
    scene.setAttribute('arjs', 'sourceType: webcam; videoTexture: true; debugUIEnabled: false;');
    scene.setAttribute('renderer', 'antialias: true; alpha: true; logarithmicDepthBuffer: true;');
    scene.style.position = 'absolute';
    scene.style.inset = '0';

    // ── 3D Arrow pointing down at the target location ──────────────────

    // Vertical red arrow (cone pointing down)
    const arrow = document.createElement('a-entity');
    arrow.setAttribute('gps-entity-place', `latitude: ${TARGET.lat}; longitude: ${TARGET.lng};`);
    arrow.setAttribute('look-at', '[gps-camera]');

    arrow.innerHTML = `
      <!-- Animated floating arrow group -->
      <a-entity animation="property: position; to: 0 12 0; dir: alternate; dur: 1500; loop: true; easing: easeInOutSine;">
        <!-- Red cone arrow pointing down -->
        <a-cone color="#EF4444" radius-bottom="1.5" radius-top="0" height="3"
                position="0 0 0" rotation="180 0 0"
                material="shader: standard; emissive: #EF4444; emissiveIntensity: 0.3;">
        </a-cone>
        <!-- Arrow shaft -->
        <a-cylinder color="#EF4444" radius="0.4" height="4" position="0 3.5 0"
                    material="shader: standard; emissive: #EF4444; emissiveIntensity: 0.2;">
        </a-cylinder>
        <!-- Glowing ring around the arrow -->
        <a-torus color="#FBBF24" radius="2" radius-tubular="0.15" position="0 -1 0" rotation="90 0 0"
                 material="shader: standard; emissive: #FBBF24; emissiveIntensity: 0.5; opacity: 0.7; transparent: true;"
                 animation="property: rotation; to: 90 360 0; dur: 4000; loop: true; easing: linear;">
        </a-torus>
      </a-entity>

      <!-- Ground marker: pulsing red circle on the floor -->
      <a-ring color="#EF4444" radius-inner="2" radius-outer="3" position="0 0.5 0" rotation="-90 0 0"
              material="opacity: 0.6; transparent: true; emissive: #EF4444; emissiveIntensity: 0.4;"
              animation="property: scale; from: 0.8 0.8 0.8; to: 1.3 1.3 1.3; dir: alternate; dur: 1000; loop: true;">
      </a-ring>
      <a-ring color="#FBBF24" radius-inner="3.5" radius-outer="4.5" position="0 0.3 0" rotation="-90 0 0"
              material="opacity: 0.4; transparent: true;"
              animation="property: scale; from: 1 1 1; to: 1.5 1.5 1.5; dir: alternate; dur: 1500; loop: true;">
      </a-ring>

      <!-- Floating text label -->
      <a-entity position="0 18 0">
        <a-plane color="#000000" width="8" height="2.5" opacity="0.7"
                 material="shader: flat;">
        </a-plane>
        <a-text value="${TARGET.name}" align="center" color="#FFFFFF" width="7" position="0 0.3 0.01"
                font="https://cdn.aframe.io/fonts/Roboto-msdf.json">
        </a-text>
        <a-text value="Punto AR" align="center" color="#FBBF24" width="5" position="0 -0.4 0.01"
                font="https://cdn.aframe.io/fonts/Roboto-msdf.json">
        </a-text>
      </a-entity>

      <!-- Vertical beam of light from ground to arrow -->
      <a-cylinder color="#EF4444" radius="0.1" height="10" position="0 5 0"
                  material="opacity: 0.3; transparent: true; emissive: #EF4444; emissiveIntensity: 0.8;">
      </a-cylinder>
    `;

    scene.appendChild(arrow);

    // ── Directional arrows on the ground pointing to target ────────────
    // Place 4 arrows at nearby positions pointing toward target
    const offsets = [
      { angle: 0, dist: 0.00005 },   // North
      { angle: 90, dist: 0.00005 },   // East
      { angle: 180, dist: 0.00005 },  // South
      { angle: 270, dist: 0.00005 },  // West
    ];

    offsets.forEach(({ angle, dist }) => {
      const rad = (angle * Math.PI) / 180;
      const lat = TARGET.lat + dist * Math.cos(rad);
      const lng = TARGET.lng + dist * Math.sin(rad);

      const guideArrow = document.createElement('a-entity');
      guideArrow.setAttribute('gps-entity-place', `latitude: ${lat}; longitude: ${lng};`);
      guideArrow.innerHTML = `
        <a-cone color="#22C55E" radius-bottom="0.8" radius-top="0" height="2"
                position="0 1 0" rotation="0 0 0"
                material="shader: standard; emissive: #22C55E; emissiveIntensity: 0.3; opacity: 0.8; transparent: true;"
                animation="property: position; from: 0 1 0; to: 0 3 0; dir: alternate; dur: 1200; loop: true; easing: easeInOutSine;">
        </a-cone>
      `;
      scene.appendChild(guideArrow);
    });

    // ── Camera with GPS ────────────────────────────────────────────────
    const camera = document.createElement('a-camera');
    camera.setAttribute('gps-camera', 'simulateLatitude: 0; simulateLongitude: 0;');
    camera.setAttribute('rotation-reader', '');
    scene.appendChild(camera);

    containerRef.current.appendChild(scene);

    return () => {
      // Cleanup: remove the scene
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [loaded]);

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* AR Scene container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Back button overlay */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 pt-8 pointer-events-none">
        <button
          onClick={onBack}
          className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white pointer-events-auto"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${loaded ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
          AR Ubicacion 3D
        </div>

        <div className="w-12" />
      </div>

      {/* Bottom info panel */}
      {loaded && (
        <div className="absolute bottom-0 left-0 right-0 z-50 p-4 pb-8 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <span className="text-lg">📍</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm">{TARGET.name}</h3>
                <p className="text-white/50 text-xs">Busca la flecha roja y el anillo dorado</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {!loaded && !error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white/20 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">Cargando AR...</p>
            <p className="text-white/50 text-xs mt-1">Acepta los permisos de camara y ubicacion</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80">
          <div className="text-center p-8">
            <p className="text-red-400 font-medium mb-2">{error}</p>
            <button
              onClick={onBack}
              className="bg-white/10 text-white px-6 py-2 rounded-xl"
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper: load a script tag dynamically ───────────────────────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}
