// TODO: API integration required. This component currently renders 100% hardcoded POI and
// itinerary data (OAXACA_LOCATIONS constant, static transport options, etc.). When the
// map/POI API is available, replace hardcoded location arrays with calls to the poi service
// and load real data in useEffect. Until then, the component is demo-only.
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Clock,
  Search,
  Locate,
  Plus,
  Route,
  Calendar,
  AlertCircle,
  Check,
  Trash2,
  Play,
  Map,
  Bus,
  Car,
  Footprints,
} from 'lucide-react';

interface SmartMapViewProps {
  onBack: () => void;
}

interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'poi' | 'event' | 'transport' | 'custom';
  category?: string;
}

interface ItineraryItem {
  id: string;
  location: Location;
  arrivalTime?: string;
  duration?: number; // minutes to spend here
}

// Key locations in Oaxaca
const OAXACA_LOCATIONS: Location[] = [
  { id: 'zocalo', name: 'Zocalo de Oaxaca', address: 'Centro Historico', lat: 17.0614, lng: -96.7256, type: 'poi', category: 'Centro' },
  { id: 'auditorio', name: 'Auditorio Guelaguetza', address: 'Cerro del Fortin', lat: 17.0669, lng: -96.7147, type: 'event', category: 'Guelaguetza' },
  { id: 'santo_domingo', name: 'Templo de Santo Domingo', address: 'Centro Historico', lat: 17.0654, lng: -96.7248, type: 'poi', category: 'Cultura' },
  { id: 'mercado_benito', name: 'Mercado Benito Juarez', address: 'Centro Historico', lat: 17.0598, lng: -96.7241, type: 'poi', category: 'Gastronomia' },
  { id: 'mercado_20nov', name: 'Mercado 20 de Noviembre', address: 'Centro Historico', lat: 17.0589, lng: -96.7235, type: 'poi', category: 'Gastronomia' },
  { id: 'monte_alban', name: 'Monte Alban', address: 'Zona Arqueologica', lat: 17.0437, lng: -96.7678, type: 'poi', category: 'Arqueologia' },
  { id: 'hierve_agua', name: 'Hierve el Agua', address: 'San Lorenzo Albarradas', lat: 16.8661, lng: -96.2756, type: 'poi', category: 'Naturaleza' },
  { id: 'tule', name: 'Arbol del Tule', address: 'Santa Maria del Tule', lat: 17.0461, lng: -96.6356, type: 'poi', category: 'Naturaleza' },
  { id: 'mezcal_matatlan', name: 'Santiago Matatlan', address: 'Ruta del Mezcal', lat: 16.8667, lng: -96.3833, type: 'poi', category: 'Mezcal' },
  { id: 'teotitlan', name: 'Teotitlan del Valle', address: 'Zona de Textiles', lat: 17.0278, lng: -96.5222, type: 'poi', category: 'Artesanias' },
  { id: 'terminal_ado', name: 'Terminal ADO', address: 'Periferico', lat: 17.0789, lng: -96.7156, type: 'transport', category: 'Transporte' },
  { id: 'aeropuerto', name: 'Aeropuerto de Oaxaca', address: 'Xoxocotlan', lat: 17.0000, lng: -96.7264, type: 'transport', category: 'Transporte' },
];

const TRANSPORT_MODES = [
  { id: 'walking', name: 'Caminando', icon: Footprints, speed: 5 }, // km/h
  { id: 'bus', name: 'BinniBus', icon: Bus, speed: 20 },
  { id: 'taxi', name: 'Taxi/Auto', icon: Car, speed: 35 },
];

// Calculate distance between two points (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Oaxaca center coordinates
const OAXACA_CENTER = { lat: 17.0614, lng: -96.7256 };

const SmartMapView: React.FC<SmartMapViewProps> = ({ onBack }) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<Location | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distanceFromOaxaca, setDistanceFromOaxaca] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(true);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [showItinerary, setShowItinerary] = useState(false);
  const [selectedMode, setSelectedMode] = useState('bus');
  const [nearbyLocations, setNearbyLocations] = useState<(Location & { distance: number; time: number })[]>([]);

  // Get user's real location
  const getUserLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalizacion');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Calculate distance from Oaxaca
        const distance = calculateDistance(latitude, longitude, OAXACA_CENTER.lat, OAXACA_CENTER.lng);
        setDistanceFromOaxaca(distance);

        // If user is close to Oaxaca (< 100km), use their location
        if (distance < 100) {
          setSelectedOrigin({
            id: 'user_location',
            name: 'Mi ubicacion actual',
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            lat: latitude,
            lng: longitude,
            type: 'custom',
          });
          setShowLocationPicker(false);
          calculateNearbyLocations(latitude, longitude);
        }

        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Permiso de ubicacion denegado. Selecciona un punto de partida manualmente.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Ubicacion no disponible. Selecciona un punto de partida manualmente.');
            break;
          case error.TIMEOUT:
            setLocationError('Tiempo de espera agotado. Intenta de nuevo o selecciona manualmente.');
            break;
          default:
            setLocationError('Error al obtener ubicacion. Selecciona un punto de partida manualmente.');
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Calculate nearby locations from a point
  const calculateNearbyLocations = (lat: number, lng: number) => {
    const mode = TRANSPORT_MODES.find(m => m.id === selectedMode) || TRANSPORT_MODES[1];

    const locationsWithDistance = OAXACA_LOCATIONS.map(loc => {
      const distance = calculateDistance(lat, lng, loc.lat, loc.lng);
      const time = Math.round((distance / mode.speed) * 60); // minutes
      return { ...loc, distance, time };
    }).sort((a, b) => a.distance - b.distance);

    setNearbyLocations(locationsWithDistance);
  };

  // Select a predefined origin
  const selectOrigin = (location: Location) => {
    setSelectedOrigin(location);
    setShowLocationPicker(false);
    calculateNearbyLocations(location.lat, location.lng);
  };

  // Add location to itinerary
  const addToItinerary = (location: Location) => {
    if (itinerary.find(item => item.location.id === location.id)) return;

    setItinerary([...itinerary, {
      id: `item_${Date.now()}`,
      location,
      duration: 60, // default 1 hour
    }]);
  };

  // Remove from itinerary
  const removeFromItinerary = (itemId: string) => {
    setItinerary(itinerary.filter(item => item.id !== itemId));
  };

  // Calculate total itinerary time
  const calculateItineraryTime = () => {
    if (!selectedOrigin || itinerary.length === 0) return 0;

    const mode = TRANSPORT_MODES.find(m => m.id === selectedMode) || TRANSPORT_MODES[1];
    let totalTime = 0;
    let currentLat = selectedOrigin.lat;
    let currentLng = selectedOrigin.lng;

    itinerary.forEach(item => {
      const distance = calculateDistance(currentLat, currentLng, item.location.lat, item.location.lng);
      const travelTime = (distance / mode.speed) * 60;
      totalTime += travelTime + (item.duration || 60);
      currentLat = item.location.lat;
      currentLng = item.location.lng;
    });

    return Math.round(totalTime);
  };

  // Filter locations by search
  const filteredLocations = OAXACA_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Recalculate when mode changes
  useEffect(() => {
    if (selectedOrigin) {
      calculateNearbyLocations(selectedOrigin.lat, selectedOrigin.lng);
    }
  }, [selectedMode]);

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="relative overflow-hidden">
        <img src="/images/azul.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative p-4 pt-6 text-white max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition">
                <ArrowLeft size={20} />
              </button>
              <img src="/images/ui/icon_plan.png" alt="Mapa" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-md" />
              <h2 className="text-xl font-bold">Mapa Cultural</h2>
            </div>
          </div>
          <p className="text-sm text-white/70">Planifica tu recorrido por Oaxaca</p>
        </div>
      </div>

      {/* Transport Mode Selector */}
      <div className="bg-oaxaca-blue dark:bg-oaxaca-blue flex gap-2 px-4 md:px-6 lg:px-8 py-3 max-w-7xl mx-auto w-full">
        {TRANSPORT_MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => setSelectedMode(mode.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
              selectedMode === mode.id
                ? 'bg-white text-oaxaca-sky'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            <mode.icon size={16} />
            <span className="hidden sm:inline">{mode.name}</span>
          </button>
        ))}
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin className="text-oaxaca-sky" size={20} />
              Donde estas o desde donde partes?
            </h2>

            {/* GPS Location Button */}
            <button
              onClick={getUserLocation}
              disabled={isLocating}
              className="w-full mb-4 p-4 bg-gradient-to-r from-oaxaca-sky to-oaxaca-purple text-white rounded-xl flex items-center justify-center gap-3 hover:from-oaxaca-sky/90 hover:to-oaxaca-purple/90 transition disabled:opacity-50"
            >
              {isLocating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Obteniendo ubicacion...</span>
                </>
              ) : (
                <>
                  <Locate size={20} />
                  <span>Usar mi ubicacion actual</span>
                </>
              )}
            </button>

            {/* Location Error */}
            {locationError && (
              <div className="mb-4 p-3 bg-oaxaca-yellow-light dark:bg-oaxaca-yellow/20 border border-oaxaca-yellow/30 dark:border-oaxaca-yellow/30 rounded-xl flex items-start gap-3">
                <AlertCircle size={20} className="text-oaxaca-yellow flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-oaxaca-yellow dark:text-oaxaca-yellow">{locationError}</p>
                </div>
              </div>
            )}

            {/* Distance Warning */}
            {distanceFromOaxaca !== null && distanceFromOaxaca >= 100 && (
              <div className="mb-4 p-4 bg-oaxaca-sky-light dark:bg-oaxaca-sky/20 border border-oaxaca-sky/30 dark:border-oaxaca-sky/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <Map size={24} className="text-oaxaca-sky flex-shrink-0" />
                  <div>
                    <p className="font-medium text-oaxaca-sky dark:text-oaxaca-sky">
                      Estas a {Math.round(distanceFromOaxaca)} km de Oaxaca
                    </p>
                    <p className="text-sm text-oaxaca-sky dark:text-oaxaca-sky mt-1">
                      Selecciona un punto de partida en Oaxaca para planificar tu recorrido cuando llegues.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar lugar de partida..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-oaxaca-sky focus:border-transparent"
              />
            </div>

            {/* Predefined Locations */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">O selecciona un punto de partida:</p>
            <div className="space-y-2">
              {filteredLocations.map(location => (
                <button
                  key={location.id}
                  onClick={() => selectOrigin(location)}
                  className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left"
                >
                  <div className={`p-2 rounded-lg ${
                    location.type === 'transport' ? 'bg-oaxaca-sky-light text-oaxaca-sky' :
                    location.type === 'event' ? 'bg-oaxaca-pink-light text-oaxaca-pink' :
                    'bg-oaxaca-purple-light text-oaxaca-purple'
                  }`}>
                    <MapPin size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{location.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{location.address}</p>
                  </div>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-gray-600 dark:text-gray-300">
                    {location.category}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - After Location Selected */}
      {!showLocationPicker && selectedOrigin && (
        <div className="flex-1 overflow-y-auto">
          {/* Origin Card */}
          <div className="p-4 md:p-6 lg:p-8 bg-white dark:bg-gray-800 border-b dark:border-gray-700 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Navigation size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Punto de partida</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedOrigin.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLocationPicker(true)}
                className="text-sm text-oaxaca-sky dark:text-oaxaca-sky"
              >
                Cambiar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b dark:border-gray-700 max-w-7xl mx-auto">
            <button
              onClick={() => setShowItinerary(false)}
              className={`flex-1 py-3 text-sm font-medium transition ${
                !showItinerary
                  ? 'text-oaxaca-sky border-b-2 border-oaxaca-sky'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Lugares Cercanos
            </button>
            <button
              onClick={() => setShowItinerary(true)}
              className={`flex-1 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                showItinerary
                  ? 'text-oaxaca-sky border-b-2 border-oaxaca-sky'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Mi Itinerario
              {itinerary.length > 0 && (
                <span className="bg-oaxaca-sky text-white text-xs px-2 py-0.5 rounded-full">
                  {itinerary.length}
                </span>
              )}
            </button>
          </div>

          {/* Nearby Locations */}
          {!showItinerary && (
            <div className="p-4 md:p-6 lg:p-8 space-y-3 max-w-7xl mx-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Lugares ordenados por cercania (modo: {TRANSPORT_MODES.find(m => m.id === selectedMode)?.name})
              </p>
              {nearbyLocations.map(location => (
                <div
                  key={location.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">{location.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{location.address}</p>
                    </div>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      {location.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                        <MapPin size={14} />
                        {location.distance < 1
                          ? `${Math.round(location.distance * 1000)} m`
                          : `${location.distance.toFixed(1)} km`}
                      </span>
                      <span className="flex items-center gap-1 text-oaxaca-sky dark:text-oaxaca-sky">
                        <Clock size={14} />
                        {location.time < 60
                          ? `${location.time} min`
                          : `${Math.floor(location.time / 60)}h ${location.time % 60}min`}
                      </span>
                    </div>
                    <button
                      onClick={() => addToItinerary(location)}
                      disabled={itinerary.some(i => i.location.id === location.id)}
                      className={`p-2 rounded-full transition ${
                        itinerary.some(i => i.location.id === location.id)
                          ? 'bg-green-100 text-green-600'
                          : 'bg-oaxaca-sky-light text-oaxaca-sky hover:bg-oaxaca-sky/30'
                      }`}
                    >
                      {itinerary.some(i => i.location.id === location.id) ? (
                        <Check size={18} />
                      ) : (
                        <Plus size={18} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Itinerary */}
          {showItinerary && (
            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
              {itinerary.length === 0 ? (
                <div className="text-center py-12">
                  <Route size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Tu itinerario esta vacio
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Agrega lugares desde la pestana "Lugares Cercanos"
                  </p>
                </div>
              ) : (
                <>
                  {/* Itinerary Summary */}
                  <div className="bg-gradient-to-r from-oaxaca-sky to-oaxaca-purple rounded-xl p-4 text-white mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/80">Tiempo total estimado</span>
                      <span className="font-bold text-lg">
                        {calculateItineraryTime() < 60
                          ? `${calculateItineraryTime()} min`
                          : `${Math.floor(calculateItineraryTime() / 60)}h ${calculateItineraryTime() % 60}min`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <Calendar size={14} />
                      <span>{itinerary.length} lugares por visitar</span>
                    </div>
                  </div>

                  {/* Itinerary Items */}
                  <div className="space-y-2">
                    {itinerary.map((item, index) => (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 bg-oaxaca-sky-light dark:bg-oaxaca-sky/20 rounded-full flex items-center justify-center text-oaxaca-sky font-bold text-sm">
                              {index + 1}
                            </div>
                            {index < itinerary.length - 1 && (
                              <div className="w-0.5 h-8 bg-gray-200 dark:bg-gray-700 my-1" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {item.location.name}
                            </h4>
                            <p className="text-xs text-gray-500">{item.location.address}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                              <Clock size={12} />
                              <span>Tiempo sugerido: {item.duration} min</span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromItinerary(item.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Start Route Button */}
                  <button
                    onClick={() => {
                      alert('¡Tu itinerario está listo! En una versión futura, podrás ver la navegación paso a paso.');
                    }}
                    className="w-full mt-4 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-600 transition"
                  >
                    <Play size={20} />
                    Iniciar Recorrido
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartMapView;
