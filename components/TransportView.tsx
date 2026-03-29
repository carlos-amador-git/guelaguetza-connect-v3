import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, Clock, MapPin, Navigation as NavIcon, Locate, ChevronRight, Users, Zap, ArrowLeft } from 'lucide-react';
import { ViewState } from '../types';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Oaxaca center coordinates (Zócalo)
const OAXACA_CENTER: [number, number] = [17.0614, -96.7256];

// Bus routes with REAL Oaxaca coordinates - BinniBus Guelaguetza 2025
// Source: https://www.oaxaca.gob.mx/citybus/rutas-guelaguetza-2025/
interface BusStop {
  id: string;
  name: string;
  coords: [number, number];
  description?: string;
}

interface Route {
  id: string;
  name: string;
  shortName: string;
  color: string;
  type: 'GUELAGUETZA' | 'FERIA' | 'CULTURAL';
  frequency: number; // minutes
  schedule: string;
  stops: BusStop[];
  path: [number, number][];
}

// ============================================
// RUTAS REALES BINNIBU GUELAGUETZA 2025
// Coordenadas generadas con OSRM (OpenStreetMap routing)
// que siguen las calles reales de Oaxaca
// ============================================

// Ruta Auditorio - sigue calles reales hacia el Cerro del Fortín
const RUTA_AUDITORIO: [number, number][] = [
  [17.064799, -96.719794], [17.06509, -96.719726], [17.064981, -96.718818], [17.063878, -96.719029],
  [17.064041, -96.719972], [17.06423, -96.721038], [17.06428, -96.721333], [17.064397, -96.722038],
  [17.064548, -96.722862], [17.064576, -96.723021], [17.064741, -96.723959], [17.064907, -96.724994],
  [17.065095, -96.725971], [17.06527, -96.726905], [17.064367, -96.727095], [17.063423, -96.727282],
  [17.062505, -96.727484], [17.061587, -96.727656], [17.060634, -96.727887], [17.060556, -96.727536],
  [17.060434, -96.726917], [17.060731, -96.726849], [17.061365, -96.726705], [17.062297, -96.726531],
  [17.062193, -96.726001], [17.062144, -96.725752], [17.062101, -96.725538], [17.061904, -96.724587],
  [17.061708, -96.723636], [17.061581, -96.723019], [17.061502, -96.722638], [17.061414, -96.72221],
  [17.061307, -96.721691], [17.061098, -96.720662], [17.062037, -96.720436], [17.06299, -96.720211],
  [17.064041, -96.719972], [17.06509, -96.719726], [17.066027, -96.719508], [17.066937, -96.719297],
  [17.067403, -96.719196], [17.067297, -96.718346], [17.067491, -96.717688], [17.067438, -96.71697],
  [17.067386, -96.716017], [17.067331, -96.715204], [17.066564, -96.715356], [17.065627, -96.715367],
  [17.065667, -96.715617], [17.065753, -96.715908], [17.06581, -96.716197], [17.066731, -96.716064],
  [17.067386, -96.716017], [17.067864, -96.715989], [17.068328, -96.715931], [17.068796, -96.715872],
  [17.069617, -96.715753], [17.070076, -96.715695], [17.070612, -96.715671], [17.070509, -96.715014],
  [17.070469, -96.714678], [17.070423, -96.714179], [17.07038, -96.713679], [17.070401, -96.713586],
  [17.07031, -96.71248], [17.070248, -96.712094], [17.070186, -96.711562], [17.070153, -96.71114],
  [17.070124, -96.710776], [17.070088, -96.710225], [17.070006, -96.709427], [17.069957, -96.709024],
  [17.069904, -96.708591], [17.069832, -96.707794], [17.06977, -96.706905], [17.069655, -96.705647],
  [17.069564, -96.70487], [17.069471, -96.70338], [17.069434, -96.702718], [17.069387, -96.702149],
  [17.06964, -96.703375], [17.070191, -96.703326], [17.070604, -96.703303], [17.070988, -96.703269],
  [17.071633, -96.70322], [17.072065, -96.703195], [17.072141, -96.703712], [17.072199, -96.704186],
  [17.072242, -96.704637], [17.072278, -96.705], [17.072001, -96.705016]
];

// Ruta Feria del Mezcal - El Llano al CCCO
const RUTA_MEZCAL: [number, number][] = [
  [17.063009, -96.723351], [17.062634, -96.723426], [17.062825, -96.724383], [17.063017, -96.725374],
  [17.062101, -96.725538], [17.061904, -96.724587], [17.061708, -96.723636], [17.061581, -96.723019],
  [17.061502, -96.722638], [17.061414, -96.72221], [17.061307, -96.721691], [17.061098, -96.720662],
  [17.060887, -96.719655], [17.060719, -96.71886], [17.060581, -96.71819], [17.060354, -96.717176],
  [17.06025, -96.71659], [17.060169, -96.71614], [17.060119, -96.715858], [17.060717, -96.714574],
  [17.060843, -96.714269], [17.060767, -96.713967], [17.060739, -96.713613], [17.0608, -96.713554],
  [17.061106, -96.713614], [17.061304, -96.713698], [17.061495, -96.713855], [17.061848, -96.714011],
  [17.063006, -96.714079], [17.064531, -96.714181], [17.065239, -96.714171], [17.06586, -96.714186],
  [17.0669, -96.714074], [17.068224, -96.713871], [17.069084, -96.713759], [17.070256, -96.713605],
  [17.070401, -96.713586], [17.07031, -96.71248], [17.070248, -96.712094], [17.070186, -96.711562],
  [17.070153, -96.71114], [17.070124, -96.710776], [17.070088, -96.710225], [17.070006, -96.709427],
  [17.069443, -96.709419], [17.068852, -96.709434], [17.068218, -96.70946], [17.06823, -96.709994],
  [17.068937, -96.710264], [17.070088, -96.710225], [17.069957, -96.709024], [17.069904, -96.708591],
  [17.069832, -96.707794], [17.06977, -96.706905], [17.069655, -96.705647], [17.069564, -96.70487],
  [17.069471, -96.70338], [17.069434, -96.702718], [17.069387, -96.702149], [17.069353, -96.701838],
  [17.069283, -96.701179], [17.06921, -96.70031], [17.069173, -96.699868], [17.069019, -96.69804],
  [17.068897, -96.697018], [17.068832, -96.695997], [17.069015, -96.695931], [17.069261, -96.695858],
  [17.069865, -96.695769], [17.070084, -96.695772], [17.070808, -96.695637], [17.071271, -96.695555],
  [17.072062, -96.69542], [17.072758, -96.695345], [17.073358, -96.695275], [17.072744, -96.692301],
  [17.072823, -96.692204], [17.073146, -96.692083], [17.07328, -96.69207], [17.073515, -96.692108]
];

// Ruta El Llano - Plaza del Valle al centro
const RUTA_LLANO: [number, number][] = [
  [17.039346, -96.712065], [17.039248, -96.711981], [17.039115, -96.711792], [17.038956, -96.711576],
  [17.038799, -96.71136], [17.038578, -96.711065], [17.038479, -96.710909], [17.038075, -96.710922],
  [17.037873, -96.71093], [17.037854, -96.710813], [17.038165, -96.710713], [17.038383, -96.710675],
  [17.038843, -96.710708], [17.039233, -96.710909], [17.04019, -96.71163], [17.040296, -96.71171],
  [17.041042, -96.712272], [17.041434, -96.712567], [17.042111, -96.713091], [17.042604, -96.713448],
  [17.043014, -96.713743], [17.043061, -96.713933], [17.043195, -96.714159], [17.043296, -96.714308],
  [17.04346, -96.714512], [17.043632, -96.714706], [17.044292, -96.71541], [17.045105, -96.716299],
  [17.045572, -96.716809], [17.04586, -96.71698], [17.045912, -96.717073], [17.046046, -96.717851],
  [17.046767, -96.717964], [17.047602, -96.717858], [17.048369, -96.71768], [17.046767, -96.717964],
  [17.046827, -96.718518], [17.046875, -96.718931], [17.047044, -96.720236], [17.047134, -96.720965],
  [17.047333, -96.722549], [17.046963, -96.723187], [17.047154, -96.723508], [17.04773, -96.723939],
  [17.048556, -96.724539], [17.049001, -96.724897], [17.049363, -96.725147], [17.049771, -96.725578],
  [17.050516, -96.726099], [17.050956, -96.726399], [17.050719, -96.727004], [17.050654, -96.727659],
  [17.050825, -96.728213], [17.051076, -96.72856], [17.051245, -96.728706], [17.051651, -96.728911],
  [17.052011, -96.729027], [17.053126, -96.729345], [17.055062, -96.729918], [17.055311, -96.729917],
  [17.057055, -96.729588], [17.058955, -96.729223], [17.060843, -96.72884], [17.062694, -96.72846],
  [17.062505, -96.727484], [17.062193, -96.726001], [17.062101, -96.725538], [17.061904, -96.724587],
  [17.061708, -96.723636], [17.061502, -96.722638], [17.06244, -96.722455], [17.063397, -96.722261],
  [17.064397, -96.722038], [17.064548, -96.722862], [17.06437, -96.723067], [17.063009, -96.723351]
];

// Ruta Bani Stui Gulal - Centro histórico
const RUTA_BANI: [number, number][] = [
  [17.06, -96.728001], [17.059708, -96.728053], [17.059922, -96.729034], [17.060843, -96.72884],
  [17.061772, -96.728641], [17.062694, -96.72846], [17.063635, -96.728282], [17.06455, -96.728089],
  [17.064367, -96.727095], [17.064168, -96.726148], [17.063971, -96.725184], [17.063757, -96.724177],
  [17.063571, -96.723239], [17.063009, -96.723351], [17.062634, -96.723426], [17.062825, -96.724383],
  [17.063017, -96.725374], [17.063227, -96.726338], [17.064168, -96.726148], [17.065095, -96.725971],
  [17.066036, -96.725793], [17.066987, -96.725588], [17.067915, -96.725389], [17.068517, -96.725284],
  [17.068687, -96.725254], [17.068867, -96.72521], [17.068673, -96.724218], [17.068494, -96.723292],
  [17.067612, -96.723432], [17.066745, -96.723589], [17.065956, -96.723732], [17.065646, -96.723788],
  [17.065705, -96.724109], [17.065841, -96.724796], [17.064907, -96.724994], [17.063971, -96.725184],
  [17.063017, -96.725374], [17.062101, -96.725538]
];

// Ruta Tejate - Zócalo a San Agustín
const RUTA_TEJATE: [number, number][] = [
  [17.062082, -96.725445], [17.061904, -96.724587], [17.061708, -96.723636], [17.060774, -96.723826],
  [17.059841, -96.72402], [17.059503, -96.724093], [17.058921, -96.724218], [17.058987, -96.724541],
  [17.059261, -96.724483], [17.059367, -96.724588], [17.059115, -96.725164], [17.059291, -96.726128],
  [17.059508, -96.727105], [17.059708, -96.728053], [17.058775, -96.728264], [17.058603, -96.727283],
  [17.058209, -96.725361], [17.057989, -96.724399], [17.05778, -96.723479], [17.057598, -96.722498],
  [17.057403, -96.721489], [17.057192, -96.720527], [17.056813, -96.718782], [17.056649, -96.717882],
  [17.055807, -96.718043], [17.055008, -96.718109], [17.055195, -96.719066], [17.055962, -96.71889],
  [17.056813, -96.718782], [17.056482, -96.716866], [17.056282, -96.715947], [17.056079, -96.715029],
  [17.055833, -96.713708], [17.055742, -96.713138], [17.055001, -96.713214], [17.054529, -96.713251],
  [17.054094, -96.713163], [17.053732, -96.713141], [17.053313, -96.713141], [17.052825, -96.713221],
  [17.052237, -96.713283], [17.051391, -96.713391], [17.050126, -96.713553], [17.049191, -96.71371],
  [17.048339, -96.713833], [17.047659, -96.713938], [17.046007, -96.714193], [17.045269, -96.714306],
  [17.044351, -96.714447], [17.043878, -96.714443], [17.043444, -96.714282], [17.043254, -96.714144],
  [17.042957, -96.71393], [17.041993, -96.713202], [17.042111, -96.713091], [17.04134, -96.711589],
  [17.040669, -96.710603], [17.040272, -96.710066], [17.040154, -96.70989]
];

// Rutas oficiales BinniBus Guelaguetza 2025
const ROUTES: Route[] = [
  {
    id: 'AUD',
    name: 'Ruta Auditorio Guelaguetza',
    shortName: 'Auditorio',
    color: '#22C55E', // Verde
    type: 'GUELAGUETZA',
    frequency: 10,
    schedule: 'Lun del Cerro: 6:00-22:00 | Otros: 16:00-23:00',
    stops: [
      { id: 'aud1', name: 'Chedraui Madero', coords: [17.0648, -96.7198], description: 'Punto de partida' },
      { id: 'aud2', name: 'Alameda de León', coords: [17.0607, -96.7267], description: 'Centro Histórico' },
      { id: 'aud3', name: 'Calzada Niños Héroes', coords: [17.0670, -96.7160] },
      { id: 'aud4', name: 'Cerro del Fortín', coords: [17.0700, -96.7100], description: 'Subida al Auditorio' },
      { id: 'aud5', name: 'Auditorio Guelaguetza', coords: [17.0720, -96.7050], description: 'Destino final' },
    ],
    path: RUTA_AUDITORIO,
  },
  {
    id: 'MEZ',
    name: 'Ruta Centro - Feria del Mezcal',
    shortName: 'Feria Mezcal',
    color: '#3B82F6', // Azul
    type: 'FERIA',
    frequency: 15,
    schedule: '18-29 Jul: 10:00-22:00',
    stops: [
      { id: 'mez1', name: 'El Llano (Paseo Juárez)', coords: [17.0630, -96.7233], description: 'Punto de partida' },
      { id: 'mez2', name: 'Calzada Madero', coords: [17.0610, -96.7200] },
      { id: 'mez3', name: 'Blvd. Eduardo Vasconcelos', coords: [17.0700, -96.7100] },
      { id: 'mez4', name: 'Carretera a Tehuantepec', coords: [17.0690, -96.6970] },
      { id: 'mez5', name: 'CCCO Santa Lucía', coords: [17.0735, -96.6921], description: 'Feria del Mezcal' },
    ],
    path: RUTA_MEZCAL,
  },
  {
    id: 'LLA',
    name: 'Ruta Plaza del Valle - El Llano',
    shortName: 'El Llano',
    color: '#A855F7', // Morado
    type: 'CULTURAL',
    frequency: 12,
    schedule: '1-31 Jul: 14:00-23:00',
    stops: [
      { id: 'lla1', name: 'Plaza del Valle', coords: [17.0393, -96.7121], description: 'Av. Universidad' },
      { id: 'lla2', name: 'Candiani', coords: [17.0420, -96.7130] },
      { id: 'lla3', name: 'Av. Ferrocarril', coords: [17.0500, -96.7270] },
      { id: 'lla4', name: 'Centro Histórico', coords: [17.0614, -96.7256] },
      { id: 'lla5', name: 'El Llano (Paseo Juárez)', coords: [17.0630, -96.7233], description: 'Destino' },
    ],
    path: RUTA_LLANO,
  },
  {
    id: 'BSG',
    name: 'Ruta Bani Stui Gulal',
    shortName: 'Bani Stui',
    color: '#EC4899', // Rosa/Magenta
    type: 'CULTURAL',
    frequency: 20,
    schedule: 'Sábados Jul: 19:00-23:00',
    stops: [
      { id: 'bsg1', name: 'Av. Independencia', coords: [17.0600, -96.7280], description: 'Punto de partida' },
      { id: 'bsg2', name: 'Av. Juárez', coords: [17.0627, -96.7284] },
      { id: 'bsg3', name: 'Santo Domingo', coords: [17.0660, -96.7250], description: 'Templo de Santo Domingo' },
      { id: 'bsg4', name: 'Macedonio Alcalá', coords: [17.0659, -96.7240], description: 'Andador Turístico' },
      { id: 'bsg5', name: 'Zócalo', coords: [17.0621, -96.7254], description: 'Plaza de la Constitución' },
    ],
    path: RUTA_BANI,
  },
  {
    id: 'TEJ',
    name: 'Ruta Feria del Tejate y Tamal',
    shortName: 'Tejate',
    color: '#EAB308', // Amarillo
    type: 'FERIA',
    frequency: 20,
    schedule: 'Jul: 10:00-20:00',
    stops: [
      { id: 'tej1', name: 'Zócalo', coords: [17.0621, -96.7254], description: 'Centro Histórico' },
      { id: 'tej2', name: 'Mercado 20 de Noviembre', coords: [17.0598, -96.7240] },
      { id: 'tej3', name: 'Periférico Sur', coords: [17.0550, -96.7180] },
      { id: 'tej4', name: 'San Agustín de las Juntas', coords: [17.0402, -96.7099], description: 'Feria del Tejate' },
    ],
    path: RUTA_TEJATE,
  },
];

// Custom bus icon
const createBusIcon = (color: string) => L.divIcon({
  className: 'custom-bus-icon',
  html: `
    <div style="
      background-color: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Custom stop icon
const createStopIcon = (color: string, isMain: boolean = false) => L.divIcon({
  className: 'custom-stop-icon',
  html: `
    <div style="
      background-color: white;
      width: ${isMain ? '16px' : '12px'};
      height: ${isMain ? '16px' : '12px'};
      border-radius: 50%;
      border: 3px solid ${color};
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    "></div>
  `,
  iconSize: [isMain ? 16 : 12, isMain ? 16 : 12],
  iconAnchor: [isMain ? 8 : 6, isMain ? 8 : 6],
});

// Interpolate position along a path
const interpolatePosition = (path: [number, number][], progress: number): [number, number] => {
  const totalPoints = path.length - 1;
  const exactPoint = progress * totalPoints;
  const lowerIndex = Math.floor(exactPoint);
  const upperIndex = Math.min(lowerIndex + 1, totalPoints);
  const fraction = exactPoint - lowerIndex;

  return [
    path[lowerIndex][0] + (path[upperIndex][0] - path[lowerIndex][0]) * fraction,
    path[lowerIndex][1] + (path[upperIndex][1] - path[lowerIndex][1]) * fraction,
  ];
};

// Component to recenter map
const RecenterMap: React.FC<{ coords: [number, number] }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, 14, { animate: true });
  }, [coords, map]);
  return null;
};

// Type labels in Spanish
const TYPE_LABELS: Record<Route['type'], string> = {
  GUELAGUETZA: 'Ruta Guelaguetza',
  FERIA: 'Ruta de Feria',
  CULTURAL: 'Ruta Cultural',
};

// Animated bus marker component
const AnimatedBus: React.FC<{ route: Route; offset: number }> = ({ route, offset }) => {
  const [progress, setProgress] = useState(offset);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev + 0.002) % 1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const position = interpolatePosition(route.path, progress);

  return (
    <Marker position={position} icon={createBusIcon(route.color)}>
      <Popup>
        <div className="text-center min-w-[150px]">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: route.color }}>
              {route.id}
            </span>
          </div>
          <p className="font-semibold text-sm">{route.name}</p>
          <p className="text-xs text-gray-500 mt-1">{TYPE_LABELS[route.type]}</p>
        </div>
      </Popup>
    </Marker>
  );
};

interface TransportViewProps {
  onBack?: () => void;
}

const TransportView: React.FC<TransportViewProps> = ({ onBack }) => {
  const [selectedRoute, setSelectedRoute] = useState<Route>(ROUTES[0]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(OAXACA_CENTER);
  const [showAllRoutes, setShowAllRoutes] = useState(true);
  const [eta, setEta] = useState(selectedRoute.frequency);
  const mapRef = useRef<L.Map | null>(null);

  // Simulate ETA countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setEta(prev => prev <= 1 ? selectedRoute.frequency : prev - 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [selectedRoute]);

  // Get user location
  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setMapCenter(coords);
        },
        () => {
          // Fallback to Oaxaca center
          setMapCenter(OAXACA_CENTER);
        }
      );
    }
  };

  const selectRoute = (route: Route) => {
    setSelectedRoute(route);
    setEta(route.frequency);
    setShowAllRoutes(false);
    // Center on route
    const midPoint = route.path[Math.floor(route.path.length / 2)];
    setMapCenter(midPoint);
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      {/* Header - full width */}
      <div className="relative overflow-hidden z-20 flex-shrink-0 bg-gray-50 dark:bg-gray-900">
        <img src="/images/azul.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative p-4 pt-6 text-white max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 -ml-2 rounded-full hover:bg-white/10 transition"
                >
                  <ArrowLeft size={20} aria-hidden="true" />
                </button>
              )}
              <img src="/images/ui/icon_transport.png" alt="BinniBus" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-md" />
              <div>
                <h2 className="text-xl font-bold">BinniBus</h2>
                <p className="text-white/70 text-sm">Transporte oficial Guelaguetza 2025</p>
              </div>
            </div>
            <button
              onClick={locateUser}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <Locate size={20} />
            </button>
          </div>

          {/* Route Selector */}
          <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar">
            <button
              onClick={() => setShowAllRoutes(true)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                showAllRoutes ? 'bg-white text-gray-900' : 'bg-white/20 text-white'
              }`}
            >
              Todas
            </button>
            {ROUTES.map((route) => (
              <button
                key={route.id}
                onClick={() => selectRoute(route)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedRoute.id === route.id && !showAllRoutes
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'bg-white/20 text-white'
                }`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: route.color }} />
                {route.shortName}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map Container - constrained */}
      <div className="flex-1 relative min-h-[400px] max-w-7xl mx-auto w-full">
        <MapContainer
          center={mapCenter}
          zoom={14}
          minZoom={12}
          maxZoom={18}
          maxBounds={[
            [16.85, -96.85], // Southwest corner of Oaxaca area
            [17.25, -96.60], // Northeast corner of Oaxaca area
          ]}
          maxBoundsViscosity={1.0}
          className="absolute inset-0 z-10"
          ref={mapRef}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RecenterMap coords={mapCenter} />

          {/* User location marker */}
          {userLocation && (
            <Marker position={userLocation}>
              <Popup>Tu ubicación</Popup>
            </Marker>
          )}

          {/* Routes */}
          {(showAllRoutes ? ROUTES : [selectedRoute]).map((route) => (
            <React.Fragment key={route.id}>
              {/* Route polyline */}
              <Polyline
                positions={route.path}
                pathOptions={{
                  color: route.color,
                  weight: 5,
                  opacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />

              {/* Bus stops */}
              {route.stops.map((stop, index) => (
                <Marker
                  key={stop.id}
                  position={stop.coords}
                  icon={createStopIcon(route.color, index === 0 || index === route.stops.length - 1)}
                >
                  <Popup>
                    <div className="text-center min-w-[140px]">
                      <p className="font-semibold text-sm">{stop.name}</p>
                      {stop.description && (
                        <p className="text-xs text-gray-600 mt-0.5">{stop.description}</p>
                      )}
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: route.color }}>
                          {route.id}
                        </span>
                        <span className="text-xs text-gray-500">{route.shortName}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Animated buses - more buses on high-frequency routes */}
              <AnimatedBus route={route} offset={0} />
              {route.frequency <= 15 && <AnimatedBus route={route} offset={0.5} />}
              {route.frequency <= 10 && <AnimatedBus route={route} offset={0.25} />}
            </React.Fragment>
          ))}
        </MapContainer>

        {/* Route Info Card */}
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border-l-4"
            style={{ borderColor: selectedRoute.color }}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: selectedRoute.color }}
                  >
                    {selectedRoute.id}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{TYPE_LABELS[selectedRoute.type]}</span>
                </div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mt-1">{selectedRoute.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selectedRoute.schedule}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-oaxaca-pink">
                  <Clock size={16} />
                  <span className="text-2xl font-bold">{eta}</span>
                  <span className="text-xs">min</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Próximo bus</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 mb-3 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                <span>{selectedRoute.stops.length} paradas</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap size={14} />
                <span>Cada {selectedRoute.frequency} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>Gratuito</span>
              </div>
            </div>

            {/* Stops preview */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
              {selectedRoute.stops.map((stop, i) => (
                <React.Fragment key={stop.id}>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: selectedRoute.color }}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs whitespace-nowrap font-medium text-gray-700 dark:text-gray-200">{stop.name}</span>
                      {stop.description && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{stop.description}</span>
                      )}
                    </div>
                  </div>
                  {i < selectedRoute.stops.length - 1 && (
                    <ChevronRight size={12} className="text-gray-400 flex-shrink-0 mx-1" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportView;
