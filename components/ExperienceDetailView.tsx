import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  MapPin,
  Clock,
  Star,
  Users,
  Check,
  Calendar,
  Globe,
  MessageSquare,
  Share2,
  Heart,
  ChevronRight,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react';
import LoadingSpinner from './ui/LoadingSpinner';
import GradientPlaceholder from './ui/GradientPlaceholder';
import { useToast } from './ui/Toast';
import { BookingConflictModal } from './ui/BookingConflictModal';
import {
  getExperience,
  getTimeSlots,
  Experience,
  ExperienceReview,
  TimeSlot,
  CATEGORY_LABELS,
  formatDuration,
  formatPrice,
} from '../services/bookings';
import { useCreateBooking } from '../hooks/useCreateBooking';
import { ViewState } from '../types';

interface ExperienceDetailViewProps {
  experienceId: string;
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

export default function ExperienceDetailView({
  experienceId,
  onNavigate,
  onBack,
}: ExperienceDetailViewProps) {
  const toast = useToast();
  const [experience, setExperience] = useState<(Experience & { reviews: ExperienceReview[] }) | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [showBooking, setShowBooking] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'reviews'>('info');
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Hook para crear reservaciones con manejo de errores 409
  const loadTimeSlotsCallback = useCallback(async () => {
    if (!selectedDate) return;
    setSlotsLoading(true);
    try {
      const slots = await getTimeSlots(experienceId, selectedDate);
      setTimeSlots(slots);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Error loading time slots:', error);
      toast.error('Error', 'No se pudieron cargar los horarios');
    } finally {
      setSlotsLoading(false);
    }
  }, [experienceId, selectedDate, toast]);

  const {
    loading: bookingLoading,
    error: bookingError,
    shouldReload,
    createBookingWithRetry,
    reloadAvailability,
    clearError,
    retryCount,
  } = useCreateBooking(loadTimeSlotsCallback);

  useEffect(() => {
    loadExperience();
  }, [experienceId]);

  useEffect(() => {
    if (selectedDate) {
      loadTimeSlots();
    }
  }, [selectedDate]);

  const loadExperience = async () => {
    try {
      setLoading(true);
      const data = await getExperience(experienceId);
      setExperience(data);
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow.toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error loading experience:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlots = async () => {
    await loadTimeSlotsCallback();
  };

  // Mostrar modal de conflicto cuando hay error de concurrencia
  useEffect(() => {
    if (bookingError && shouldReload) {
      setShowConflictModal(true);
    }
  }, [bookingError, shouldReload]);

  // Mostrar toast cuando hay retry automatico
  useEffect(() => {
    if (retryCount > 0 && retryCount <= 2) {
      toast.warning(
        'Reintentando...',
        `Intento ${retryCount} de 2. Verificando disponibilidad.`
      );
    }
  }, [retryCount, toast]);

  const handleBook = async () => {
    if (!selectedSlot) return;

    const result = await createBookingWithRetry({
      experienceId,
      timeSlotId: selectedSlot.id,
      guestCount,
      specialRequests: specialRequests || undefined,
    });

    if (result) {
      // Reservacion exitosa
      toast.success(
        'Reservacion confirmada',
        `Tu reservacion para ${experience?.title} ha sido confirmada.`
      );
      setShowBooking(false);
      onNavigate(ViewState.MY_BOOKINGS);
    }
    // Si hay error, el hook se encarga de mostrar el modal
  };

  const handleConflictReload = () => {
    setShowConflictModal(false);
    clearError();
    reloadAvailability();
    setSelectedSlot(null);
  };

  const handleConflictClose = () => {
    setShowConflictModal(false);
    clearError();
    setShowBooking(false);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: experience?.title,
        text: experience?.description,
        url: window.location.href,
      });
    } catch {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading || !experience) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Cargando experiencia..." />
      </div>
    );
  }

  const totalPrice = parseFloat(experience.price) * guestCount;
  const availableSlots = timeSlots.filter((s) => (s.availableSpots || 0) >= guestCount);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header Image */}
      <div className="relative h-48 sm:h-56 md:h-64 lg:h-72">
        {experience.imageUrl ? (
          <img
            src={experience.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
          />
        ) : (
          <GradientPlaceholder variant="event" className="w-full h-full" alt={experience.title} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" aria-hidden="true" />

        {/* Navigation */}
        <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 pt-10 sm:pt-12 flex justify-between">
          <button
            onClick={onBack}
            className="p-2 bg-black/30 backdrop-blur-sm rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Volver"
          >
            <ChevronLeft className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
          </button>
          <div className="flex gap-2">
            <button
              className="p-2 bg-black/30 backdrop-blur-sm rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Agregar a favoritos"
            >
              <Heart className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 bg-black/30 backdrop-blur-sm rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Compartir"
            >
              <Share2 className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Category badge */}
        <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4">
          <span className="px-2.5 sm:px-3 py-1 bg-oaxaca-purple text-white text-xs sm:text-sm font-medium rounded-full">
            {CATEGORY_LABELS[experience.category]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 max-w-4xl mx-auto">
          {/* Title & Price */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{experience.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                {experience.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                    <span className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">{experience.rating.toFixed(1)}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">({experience.reviewCount})</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xl sm:text-2xl font-bold text-oaxaca-purple dark:text-oaxaca-pink">{formatPrice(experience.price)}</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">por persona</p>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-3 sm:gap-4 py-3 sm:py-4 border-y border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              <Clock className="w-4 sm:w-5 h-4 sm:h-5" aria-hidden="true" />
              <span>{formatDuration(experience.duration)}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              <Users className="w-4 sm:w-5 h-4 sm:h-5" aria-hidden="true" />
              <span>Max {experience.maxCapacity}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              <Globe className="w-4 sm:w-5 h-4 sm:h-5" aria-hidden="true" />
              <span>{experience.languages.join(', ')}</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-2 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
            <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">{experience.location}</p>
              {experience.latitude && experience.longitude && (
                <button className="text-oaxaca-purple dark:text-oaxaca-pink text-xs sm:text-sm flex items-center gap-1 mt-1 hover:underline focus-visible:ring-2 focus-visible:ring-oaxaca-purple rounded">
                  Ver en mapa
                  <ChevronRight className="w-3 sm:w-4 h-3 sm:h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Host */}
          <div className="flex items-center gap-2 sm:gap-3 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
            <img
              src={experience.host.avatar || 'https://ui-avatars.com/api/?name=User&background=random&color=fff'}
              alt=""
              className="w-10 sm:w-12 h-10 sm:h-12 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                {experience.host.nombre} {experience.host.apellido}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Anfitrion</p>
            </div>
            <button
              className="p-2 border border-gray-200 dark:border-gray-600 rounded-full min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus-visible:ring-2 focus-visible:ring-oaxaca-purple"
              aria-label="Enviar mensaje al anfitrion"
            >
              <MessageSquare className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mt-3 sm:mt-4" role="tablist">
            <button
              onClick={() => setActiveTab('info')}
              role="tab"
              aria-selected={activeTab === 'info'}
              aria-controls="tab-panel-info"
              className={`flex-1 py-2.5 sm:py-3 text-center font-medium border-b-2 transition-colors text-sm sm:text-base min-h-[44px] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-oaxaca-pink ${
                activeTab === 'info'
                  ? 'border-oaxaca-purple text-oaxaca-purple dark:text-oaxaca-pink'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Informacion
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              role="tab"
              aria-selected={activeTab === 'reviews'}
              aria-controls="tab-panel-reviews"
              className={`flex-1 py-2.5 sm:py-3 text-center font-medium border-b-2 transition-colors text-sm sm:text-base min-h-[44px] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-oaxaca-pink ${
                activeTab === 'reviews'
                  ? 'border-oaxaca-purple text-oaxaca-purple dark:text-oaxaca-pink'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Resenas ({experience.reviewCount})
            </button>
          </div>

          {activeTab === 'info' ? (
            <div id="tab-panel-info" role="tabpanel" aria-labelledby="tab-info">
              {/* Description */}
              <div className="py-3 sm:py-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">Descripcion</h3>
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line text-sm sm:text-base">{experience.description}</p>
              </div>

              {/* Includes */}
              {experience.includes.length > 0 && (
                <div className="py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 text-sm sm:text-base">Que incluye</h3>
                  <ul className="space-y-1.5 sm:space-y-2">
                    {experience.includes.map((item, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="w-4 sm:w-5 h-4 sm:h-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                        <span className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div id="tab-panel-reviews" role="tabpanel" aria-labelledby="tab-reviews" className="py-3 sm:py-4">
              {experience.reviews.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-6 sm:py-8 text-sm sm:text-base">Aun no hay resenas</p>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {experience.reviews.map((review) => (
                    <article key={review.id} className="border-b border-gray-100 dark:border-gray-700 pb-3 sm:pb-4 last:border-b-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <img
                          src={review.user.avatar || 'https://ui-avatars.com/api/?name=User&background=random&color=fff'}
                          alt=""
                          className="w-8 sm:w-10 h-8 sm:h-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">{review.user.nombre}</p>
                          <div className="flex gap-0.5" aria-label={`Calificacion: ${review.rating} de 5 estrellas`}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 sm:w-4 h-3 sm:h-4 ${
                                  star <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {review.comment && <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">{review.comment}</p>}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Booking Bar */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setShowBooking(true)}
            className="w-full py-3 sm:py-4 bg-oaxaca-purple text-white rounded-lg font-medium min-h-[48px] hover:bg-oaxaca-purple/90 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-oaxaca-purple focus-visible:ring-offset-2 text-sm sm:text-base"
          >
            Reservar ahora
          </button>
        </div>
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-modal-title"
        >
          <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex justify-between items-center">
                <h2 id="booking-modal-title" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Reservar experiencia</h2>
                <button
                  onClick={() => setShowBooking(false)}
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-oaxaca-purple"
                  aria-label="Cerrar modal"
                >
                  <ChevronLeft className="w-5 sm:w-6 h-5 sm:h-6 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
              {/* Date Selection */}
              <div>
                <label htmlFor="booking-date" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  <Calendar className="inline w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1" aria-hidden="true" />
                  Fecha
                </label>
                <input
                  id="booking-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-2.5 sm:p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base min-h-[44px] focus:ring-2 focus:ring-oaxaca-purple focus:border-transparent"
                />
              </div>

              {/* Time Slots */}
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Clock className="inline w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1" aria-hidden="true" />
                    Horario disponible
                  </span>
                  <button
                    onClick={loadTimeSlots}
                    disabled={slotsLoading}
                    className="text-xs sm:text-sm text-oaxaca-purple dark:text-oaxaca-pink flex items-center gap-1 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50 min-h-[36px] px-2 focus-visible:ring-2 focus-visible:ring-oaxaca-purple rounded"
                    aria-label="Actualizar horarios disponibles"
                  >
                    <RefreshCw className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${slotsLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span className="hidden xs:inline">{slotsLoading ? 'Actualizando...' : 'Actualizar'}</span>
                  </button>
                </div>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-6 sm:py-8" role="status">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 sm:w-6 h-5 sm:h-6 text-oaxaca-purple animate-spin" aria-hidden="true" />
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Cargando horarios...</span>
                    </div>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
                    No hay horarios disponibles para esta fecha
                  </p>
                ) : (
                  <div className="grid grid-cols-2 xs:grid-cols-3 gap-2" role="radiogroup" aria-label="Seleccionar horario">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot)}
                        role="radio"
                        aria-checked={selectedSlot?.id === slot.id}
                        className={`p-2 sm:p-3 border rounded-lg text-center transition-all min-h-[56px] focus-visible:ring-2 focus-visible:ring-oaxaca-purple ${
                          selectedSlot?.id === slot.id
                            ? 'border-oaxaca-purple bg-oaxaca-purple-light dark:bg-oaxaca-purple/20 dark:border-oaxaca-purple'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">{slot.startTime}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          {slot.availableSpots} lugares
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Guest Count */}
              <div>
                <span className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  <Users className="inline w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1" aria-hidden="true" />
                  Numero de personas
                </span>
                <div className="flex items-center justify-center gap-3 sm:gap-4">
                  <button
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                    className="p-2 border border-gray-200 dark:border-gray-600 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-oaxaca-purple"
                    disabled={guestCount <= 1}
                    aria-label="Reducir numero de personas"
                  >
                    <Minus className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                  <span className="text-xl sm:text-2xl font-bold w-10 sm:w-12 text-center text-gray-900 dark:text-white" aria-live="polite">{guestCount}</span>
                  <button
                    onClick={() =>
                      setGuestCount(
                        Math.min(
                          selectedSlot?.availableSpots || experience.maxCapacity,
                          guestCount + 1
                        )
                      )
                    }
                    className="p-2 border border-gray-200 dark:border-gray-600 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-oaxaca-purple"
                    disabled={guestCount >= (selectedSlot?.availableSpots || experience.maxCapacity)}
                    aria-label="Aumentar numero de personas"
                  >
                    <Plus className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label htmlFor="special-requests" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  Solicitudes especiales (opcional)
                </label>
                <textarea
                  id="special-requests"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Alergias, restricciones, etc."
                  className="w-full p-2.5 sm:p-3 border border-gray-200 dark:border-gray-600 rounded-lg resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base focus:ring-2 focus:ring-oaxaca-purple focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4">
                <div className="flex justify-between mb-2 text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatPrice(experience.price)} x {guestCount} personas
                  </span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between font-bold text-base sm:text-lg pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-oaxaca-purple dark:text-oaxaca-pink">{formatPrice(totalPrice)}</span>
                </div>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleBook}
                disabled={!selectedSlot || bookingLoading}
                className="w-full py-3 sm:py-4 bg-oaxaca-purple text-white rounded-lg font-medium disabled:opacity-50 min-h-[48px] hover:bg-oaxaca-purple/90 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-oaxaca-purple focus-visible:ring-offset-2 text-sm sm:text-base"
                aria-busy={bookingLoading}
              >
                {bookingLoading ? 'Procesando...' : 'Confirmar reservacion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de error de concurrencia */}
      <BookingConflictModal
        isOpen={showConflictModal}
        onClose={handleConflictClose}
        onReload={handleConflictReload}
        slotTime={selectedSlot ? `${selectedSlot.startTime} - ${selectedSlot.endTime}` : undefined}
        loading={slotsLoading}
        retryCount={retryCount}
        errorType={bookingError?.type}
        availableSpots={bookingError?.availableSpots}
        requestedSpots={bookingError?.requestedSpots}
      />
    </div>
  );
}
