import React, { useState, useCallback } from 'react';
import { Calendar, Clock, MapPin, Star, ChevronRight, Ticket, Music, Users, Utensils, RefreshCw, ArrowLeft } from 'lucide-react';
import PullToRefreshWrapper from './PullToRefreshWrapper';

interface Event {
  id: string;
  time: string;
  title: string;
  location: string;
  type: 'main' | 'cultural' | 'gastro' | 'music';
  featured?: boolean;
  description?: string;
}

interface DaySchedule {
  date: string;
  dayName: string;
  dayNumber: number;
  events: Event[];
}

const SCHEDULE: DaySchedule[] = [
  {
    date: '2025-07-21',
    dayName: 'Lunes',
    dayNumber: 21,
    events: [
      { id: '1', time: '09:00', title: 'Apertura Feria del Mezcal', location: 'CCCO', type: 'gastro' },
      { id: '2', time: '11:00', title: 'Desfile de Delegaciones', location: 'Centro Histórico', type: 'main', featured: true, description: 'Más de 16 delegaciones recorren las calles principales' },
      { id: '3', time: '17:00', title: 'Guelaguetza - Primer Lunes', location: 'Auditorio Guelaguetza', type: 'main', featured: true, description: 'Presentación oficial de las delegaciones' },
      { id: '4', time: '20:00', title: 'Noche de Gala', location: 'Zócalo', type: 'music' },
    ]
  },
  {
    date: '2025-07-22',
    dayName: 'Martes',
    dayNumber: 22,
    events: [
      { id: '5', time: '10:00', title: 'Exposición de Alebrijes', location: 'Santo Domingo', type: 'cultural' },
      { id: '6', time: '12:00', title: 'Taller de Barro Negro', location: 'San Bartolo', type: 'cultural' },
      { id: '7', time: '18:00', title: 'Concierto de Marimba', location: 'Alameda', type: 'music' },
      { id: '8', time: '20:00', title: 'Muestra Gastronómica', location: 'CCCO', type: 'gastro' },
    ]
  },
  {
    date: '2025-07-23',
    dayName: 'Miércoles',
    dayNumber: 23,
    events: [
      { id: '9', time: '09:00', title: 'Cata de Mezcales', location: 'Feria del Mezcal', type: 'gastro' },
      { id: '10', time: '11:00', title: 'Danza de la Pluma', location: 'Zócalo', type: 'cultural', featured: true },
      { id: '11', time: '17:00', title: 'Bani Stui Gulal', location: 'Cerro del Fortín', type: 'main' },
      { id: '12', time: '21:00', title: 'Fuegos Artificiales', location: 'Auditorio', type: 'main' },
    ]
  },
  {
    date: '2025-07-24',
    dayName: 'Jueves',
    dayNumber: 24,
    events: [
      { id: '13', time: '10:00', title: 'Mercado de Artesanías', location: 'Benito Juárez', type: 'cultural' },
      { id: '14', time: '14:00', title: 'Festival del Mole', location: 'San Agustín Etla', type: 'gastro', featured: true },
      { id: '15', time: '18:00', title: 'Calenda Nocturna', location: 'Centro', type: 'cultural' },
    ]
  },
  {
    date: '2025-07-25',
    dayName: 'Viernes',
    dayNumber: 25,
    events: [
      { id: '16', time: '09:00', title: 'Visita a Monte Albán', location: 'Monte Albán', type: 'cultural' },
      { id: '17', time: '16:00', title: 'Concierto Regional', location: 'Teatro Macedonio', type: 'music' },
      { id: '18', time: '20:00', title: 'Noche Oaxaqueña', location: 'Zócalo', type: 'music', featured: true },
    ]
  },
  {
    date: '2025-07-26',
    dayName: 'Sábado',
    dayNumber: 26,
    events: [
      { id: '19', time: '10:00', title: 'Feria del Tejate', location: 'San Andrés', type: 'gastro' },
      { id: '20', time: '12:00', title: 'Exhibición de Textiles', location: 'Museo Textil', type: 'cultural' },
      { id: '21', time: '18:00', title: 'Donají: Leyenda', location: 'Auditorio', type: 'main', featured: true },
    ]
  },
  {
    date: '2025-07-27',
    dayName: 'Domingo',
    dayNumber: 27,
    events: [
      { id: '22', time: '11:00', title: 'Desfile Final', location: 'Centro', type: 'main' },
      { id: '23', time: '17:00', title: 'Guelaguetza - Último Lunes', location: 'Auditorio Guelaguetza', type: 'main', featured: true, description: 'Gran cierre con todas las delegaciones' },
      { id: '24', time: '21:00', title: 'Clausura y Fuegos', location: 'Cerro del Fortín', type: 'main' },
    ]
  },
  {
    date: '2025-07-28',
    dayName: 'Lunes',
    dayNumber: 28,
    events: [
      { id: '25', time: '10:00', title: 'Clausura Feria Mezcal', location: 'CCCO', type: 'gastro' },
      { id: '26', time: '12:00', title: 'Despedida de Delegaciones', location: 'Zócalo', type: 'cultural' },
    ]
  },
];

const typeConfig = {
  main: { icon: Star, color: 'bg-oaxaca-pink', label: 'Principal' },
  cultural: { icon: Users, color: 'bg-oaxaca-purple', label: 'Cultural' },
  gastro: { icon: Utensils, color: 'bg-oaxaca-yellow text-gray-900', label: 'Gastronomía' },
  music: { icon: Music, color: 'bg-oaxaca-sky', label: 'Música' },
};

interface ProgramViewProps {
  onBack?: () => void;
}

const ProgramView: React.FC<ProgramViewProps> = ({ onBack }) => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [filter, setFilter] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const currentSchedule = SCHEDULE[selectedDay];
  const filteredEvents = filter
    ? currentSchedule.events.filter(e => e.type === filter)
    : currentSchedule.events;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh (future: fetch from API)
    await new Promise(resolve => setTimeout(resolve, 800));
    setLastUpdate(new Date());
    setIsRefreshing(false);
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 pb-20 transition-colors">
      {/* Header */}
      <div className="relative overflow-hidden">
        <img src="/images/rojo.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative p-4 pt-6 text-white max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} aria-label="Volver" className="p-2 -ml-2 rounded-full hover:bg-white/10 transition">
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
            )}
            <img src="/images/dance_flor_de_pina.png" alt="Programa" className="w-10 h-10 md:w-12 md:h-12 object-cover drop-shadow-md" />
            <h2 className="text-xl font-bold">Programa Guelaguetza 2026</h2>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Actualizar programa"
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>
        <p className="text-sm text-white/70">Julio 21 - 28, Oaxaca de Juárez</p>
        </div>
      </div>

      {/* Day Selector */}
      <div className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-10 transition-colors">
        <div className="flex overflow-x-auto no-scrollbar px-2 py-3 gap-2 max-w-7xl mx-auto">
          {SCHEDULE.map((day, index) => (
            <button
              key={day.date}
              onClick={() => setSelectedDay(index)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-center transition-all ${
                selectedDay === index
                  ? 'bg-oaxaca-pink text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <p className="text-xs font-medium">{day.dayName}</p>
              <p className="text-lg font-bold">{day.dayNumber}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar max-w-7xl mx-auto">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              !filter ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            Todos
          </button>
          {Object.entries(typeConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1 ${
                filter === key ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              <config.icon size={12} />
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events List with Pull-to-Refresh */}
      <PullToRefreshWrapper onRefresh={handleRefresh} className="flex-1">
        <div className="px-4 md:px-6 lg:px-8 py-4 space-y-3 max-w-7xl mx-auto">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={48} className="mx-auto mb-3 opacity-50" />
              <p>No hay eventos de este tipo</p>
            </div>
          ) : (
            filteredEvents.map((event) => {
              const config = typeConfig[event.type];
              const Icon = config.icon;
              return (
                <div
                  key={event.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4 transition-colors ${
                    event.featured ? 'border-oaxaca-pink' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${config.color} p-2 rounded-lg text-white`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-gray-100">{event.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {event.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {event.location}
                            </span>
                          </div>
                        </div>
                        {event.featured && (
                          <Star size={16} className="text-oaxaca-yellow fill-oaxaca-yellow" />
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                  {event.featured && (
                    <button className="w-full mt-3 py-2 bg-oaxaca-pink/10 dark:bg-oaxaca-pink/20 text-oaxaca-pink rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-oaxaca-pink/20 dark:hover:bg-oaxaca-pink/30 transition">
                      <Ticket size={16} />
                      Obtener boletos
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PullToRefreshWrapper>
    </div>
  );
};

export default ProgramView;
