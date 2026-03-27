import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Radio,
  Calendar,
  Users,
  Clock,
  Play,
  Filter,
} from 'lucide-react';
import EmptyState from './ui/EmptyState';
import { SkeletonGrid } from './ui/LoadingSpinner';
import GradientPlaceholder from './ui/GradientPlaceholder';
import {
  getLiveStreams,
  getUpcomingStreams,
  getStreams,
  LiveStream,
  StreamCategory,
  CATEGORY_LABELS,
  STATUS_COLORS,
} from '../services/streams';
import { ViewState } from '../types';

interface StreamsViewProps {
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

const CATEGORIES: StreamCategory[] = ['DANZA', 'MUSICA', 'ARTESANIA', 'COCINA', 'CHARLA', 'OTRO'];

export default function StreamsView({ onNavigate, onBack }: StreamsViewProps) {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [upcomingStreams, setUpcomingStreams] = useState<LiveStream[]>([]);
  const [pastStreams, setPastStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'past'>('live');
  const [selectedCategory, setSelectedCategory] = useState<StreamCategory | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadStreams();
  }, []);

  const loadStreams = async () => {
    try {
      setLoading(true);
      const [live, upcoming, past] = await Promise.all([
        getLiveStreams(),
        getUpcomingStreams(),
        getStreams({ status: 'ENDED', limit: 20 }),
      ]);
      setLiveStreams(live);
      setUpcomingStreams(upcoming);
      setPastStreams(past.streams);
    } catch (error) {
      console.error('Error loading streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStreamClick = (stream: LiveStream) => {
    onNavigate(ViewState.STREAM_WATCH, { streamId: stream.id });
  };

  const getDisplayedStreams = () => {
    let streams: LiveStream[] = [];
    switch (activeTab) {
      case 'live':
        streams = liveStreams;
        break;
      case 'upcoming':
        streams = upcomingStreams;
        break;
      case 'past':
        streams = pastStreams;
        break;
    }
    if (selectedCategory) {
      streams = streams.filter((s) => s.category === selectedCategory);
    }
    return streams;
  };

  const displayedStreams = getDisplayedStreams();

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-oaxaca-pink text-white p-4 pt-8 md:pt-6 w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <img src="/images/ui/icon_live.png" alt="Streaming" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-md" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Streaming</h1>
                <p className="text-sm md:text-base text-white/80">
                  {liveStreams.length} en vivo ahora
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 md:p-3 rounded-full ${showFilters ? 'bg-white text-red-600' : 'bg-white/20'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 max-w-lg">
            <button
              onClick={() => setActiveTab('live')}
              className={`flex-1 py-2 md:py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
                activeTab === 'live' ? 'bg-white text-red-600' : 'bg-white/20 hover:bg-white/30'
              } transition`}
            >
              <Radio className="w-4 h-4" />
              En vivo ({liveStreams.length})
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-2 md:py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
                activeTab === 'upcoming' ? 'bg-white text-red-600' : 'bg-white/20 hover:bg-white/30'
              } transition`}
            >
              <Calendar className="w-4 h-4" />
              Proximos
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-2 md:py-2.5 rounded-lg text-sm font-medium ${
                activeTab === 'past' ? 'bg-white text-red-600' : 'bg-white/20 hover:bg-white/30'
              } transition`}
            >
              Anteriores
            </button>
          </div>

          {/* Category filters */}
          {showFilters && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 md:flex-wrap">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm whitespace-nowrap ${
                  selectedCategory === '' ? 'bg-white text-red-600' : 'bg-white/20 hover:bg-white/30'
                } transition`}
              >
                Todos
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm whitespace-nowrap ${
                    selectedCategory === cat ? 'bg-white text-red-600' : 'bg-white/20 hover:bg-white/30'
                  } transition`}
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
          {loading ? (
            <SkeletonGrid type="stream" count={6} />
          ) : displayedStreams.length === 0 ? (
            <EmptyState
              type="streams"
              title={
                activeTab === 'live'
                  ? 'No hay streams en vivo'
                  : activeTab === 'upcoming'
                  ? 'No hay streams programados'
                  : 'No hay streams anteriores'
              }
              description={
                activeTab === 'live'
                  ? 'Vuelve pronto para ver transmisiones en vivo'
                  : activeTab === 'upcoming'
                  ? 'No hay transmisiones programadas por ahora'
                  : 'No hay grabaciones disponibles'
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {displayedStreams.map((stream) => (
                <StreamCard
                  key={stream.id}
                  stream={stream}
                  onClick={() => handleStreamClick(stream)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StreamCardProps {
  stream: LiveStream;
  onClick: () => void;
}

function StreamCard({ stream, onClick }: StreamCardProps) {
  const isLive = stream.status === 'LIVE';
  const isScheduled = stream.status === 'SCHEDULED';

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:bg-gray-700 hover:scale-[1.02] transition-all"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video">
        {stream.thumbnailUrl ? (
          <img
            src={stream.thumbnailUrl}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <GradientPlaceholder variant="stage" className="w-full h-full" alt={stream.title} />
        )}

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span
            className="px-2 py-1 text-white text-xs font-bold rounded flex items-center gap-1"
            style={{ backgroundColor: STATUS_COLORS[stream.status] }}
          >
            {isLive && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
            {isLive ? 'EN VIVO' : isScheduled ? 'PROGRAMADO' : 'VOD'}
          </span>
        </div>

        {/* Viewer count for live streams */}
        {isLive && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/70 rounded text-white text-sm">
            <Users className="w-4 h-4" />
            {stream.viewerCount}
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-red-600 ml-1" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex gap-3">
          <img
            src={stream.user.avatar || '/default-avatar.png'}
            alt={stream.user.nombre}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white line-clamp-1">{stream.title}</h3>
            <p className="text-sm text-gray-400">{stream.user.nombre} {stream.user.apellido}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="px-2 py-0.5 bg-gray-700 rounded">{CATEGORY_LABELS[stream.category]}</span>
              {isScheduled && stream.scheduledAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(stream.scheduledAt).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              {!isLive && !isScheduled && (
                <span>{stream.peakViewers} vistas</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
