import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  Star,
  Users,
  Search,
  Filter,
  ChevronLeft,
  Ticket,
} from 'lucide-react';
import EmptyState from './ui/EmptyState';
import { SkeletonGrid } from './ui/LoadingSpinner';
import GradientPlaceholder from './ui/GradientPlaceholder';
import { useToast } from './ui/Toast';
import {
  getExperiences,
  Experience,
  ExperienceCategory,
  CATEGORY_LABELS,
  formatDuration,
  formatPrice,
} from '../services/bookings';
import { ViewState } from '../types';

interface ExperiencesViewProps {
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

const CATEGORIES: ExperienceCategory[] = ['TOUR', 'TALLER', 'DEGUSTACION', 'CLASE', 'VISITA'];

export default function ExperiencesView({ onNavigate, onBack }: ExperiencesViewProps) {
  const toast = useToast();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ExperienceCategory | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadExperiences();
  }, [category]);

  const loadExperiences = async (append = false) => {
    try {
      setLoading(true);
      const currentPage = append ? page + 1 : 1;
      const result = await getExperiences({
        category: category || undefined,
        search: search || undefined,
        page: currentPage,
        limit: 10,
      });

      if (append) {
        setExperiences((prev) => [...prev, ...result.experiences]);
      } else {
        setExperiences(result.experiences);
      }

      setPage(currentPage);
      setHasMore(currentPage < result.pagination.totalPages);
    } catch (error) {
      console.error('Error loading experiences:', error);
      toast.error('Error al cargar', 'No se pudieron cargar las experiencias');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadExperiences();
  };

  const handleExperienceClick = (experience: Experience) => {
    onNavigate(ViewState.EXPERIENCE_DETAIL, { experienceId: experience.id });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        <img src="/images/morado.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative text-white p-4 pt-6 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <img src="/images/ui/icon_events.png" alt="Experiencias" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-md" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Experiencias</h1>
              <p className="text-sm md:text-base text-white/80">Tours, talleres y mas</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-2 max-w-2xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar experiencias..."
                className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-white text-gray-900 rounded-lg"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 md:p-3 rounded-lg transition ${showFilters ? 'bg-white text-oaxaca-purple' : 'bg-white/20 hover:bg-white/30'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {/* Category filters */}
          {showFilters && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 md:flex-wrap">
              <button
                onClick={() => setCategory('')}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm whitespace-nowrap transition ${
                  category === '' ? 'bg-white text-oaxaca-purple' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                Todas
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm whitespace-nowrap transition ${
                    category === cat ? 'bg-white text-oaxaca-purple' : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {loading && experiences.length === 0 ? (
            <SkeletonGrid type="experience" count={6} />
          ) : experiences.length === 0 ? (
            <EmptyState
              type="bookings"
              title="Sin experiencias"
              description="No se encontraron experiencias con los filtros seleccionados"
              action={{
                label: 'Ver todas',
                onClick: () => {
                  setSelectedCategory(null);
                  setSearchQuery('');
                },
                variant: 'secondary',
              }}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {experiences.map((exp) => (
                  <ExperienceCard
                    key={exp.id}
                    experience={exp}
                    onClick={() => handleExperienceClick(exp)}
                  />
                ))}
              </div>

              {hasMore && (
                <button
                  onClick={() => loadExperiences(true)}
                  disabled={loading}
                  className="w-full md:w-auto md:px-8 py-3 mt-6 text-oaxaca-purple font-medium hover:bg-oaxaca-purple-light dark:hover:bg-oaxaca-purple/20 rounded-lg transition mx-auto block"
                >
                  {loading ? 'Cargando...' : 'Cargar mas'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* My Bookings Button */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 md:hidden">
        <button
          onClick={() => onNavigate(ViewState.MY_BOOKINGS)}
          className="w-full py-3 bg-oaxaca-purple text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-oaxaca-purple/90 transition"
        >
          <Ticket className="w-5 h-5" />
          Mis Reservaciones
        </button>
      </div>
    </div>
  );
}

interface ExperienceCardProps {
  experience: Experience;
  onClick: () => void;
}

function ExperienceCard({ experience, onClick }: ExperienceCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
    >
      {/* Image */}
      <div className="relative h-40 md:h-48">
        {experience.imageUrl ? (
          <img
            src={experience.imageUrl}
            alt={experience.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <GradientPlaceholder variant="event" className="w-full h-full" alt={experience.title} />
        )}
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-oaxaca-purple">
            {CATEGORY_LABELS[experience.category]}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <p className="text-white font-bold text-lg md:text-xl">{formatPrice(experience.price)}</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-1 md:text-lg">{experience.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{experience.description}</p>

        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatDuration(experience.duration)}
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            Max {experience.maxCapacity}
          </div>
          {experience.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-oaxaca-yellow text-oaxaca-yellow" />
              {experience.rating.toFixed(1)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 mt-3 text-sm text-gray-500 dark:text-gray-400">
          <MapPin className="w-4 h-4" />
          {experience.location}
        </div>

        {/* Host */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t dark:border-gray-700">
          <img
            src={experience.host.avatar || '/default-avatar.png'}
            alt={experience.host.nombre}
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {experience.host.nombre} {experience.host.apellido}
          </span>
        </div>
      </div>
    </div>
  );
}
