import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Radio,
  Calendar,
  Users,
  Clock,
  Play,
  Filter,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import EmptyState from './ui/EmptyState';
import { SkeletonGrid } from './ui/LoadingSpinner';
import GradientPlaceholder from './ui/GradientPlaceholder';
import {
  getLiveStreams,
  getUpcomingStreams,
  getStreams,
  createStream,
  LiveStream,
  StreamCategory,
  CATEGORY_LABELS,
  STATUS_COLORS,
} from '../services/streams';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Modal, { ModalHeader } from './ui/Modal';

interface StreamsViewProps {
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

const CATEGORIES: StreamCategory[] = ['DANZA', 'MUSICA', 'ARTESANIA', 'COCINA', 'CHARLA', 'OTRO'];

export default function StreamsView({ onNavigate, onBack }: StreamsViewProps) {
  const { user } = useAuth();
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [upcomingStreams, setUpcomingStreams] = useState<LiveStream[]>([]);
  const [pastStreams, setPastStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'past'>('live');
  const [selectedCategory, setSelectedCategory] = useState<StreamCategory | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newStream, setNewStream] = useState({
    title: '',
    description: '',
    category: 'DANZA' as StreamCategory,
    scheduledAt: '',
    thumbnailUrl: '',
  });
  
  const canManageStreams = !!user;

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
      console.log('[StreamsView] Loaded streams:', {
        liveCount: live.length,
        upcomingCount: upcoming.length,
        pastCount: past.streams.length,
        live: live.map(s => ({ id: s.id, title: s.title, status: s.status })),
        upcoming: upcoming.map(s => ({ id: s.id, title: s.title, status: s.status })),
      });
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

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStream.title.trim()) return;
    
    try {
      setCreating(true);
      
      let scheduledAt: string | undefined;
      if (newStream.scheduledAt) {
        scheduledAt = new Date(newStream.scheduledAt).toISOString();
      }
      
      const streamData = {
        title: newStream.title,
        description: newStream.description || undefined,
        category: newStream.category,
        thumbnailUrl: newStream.thumbnailUrl || undefined,
        scheduledAt,
      };
      let embedUrl: string | undefined;
      let thumbnailUrl = newStream.thumbnailUrl;
      
      if (thumbnailUrl) {
        const youtubeMatch = thumbnailUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
        if (youtubeMatch) {
          embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
          thumbnailUrl = `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
        }
      }
      
      const streamDataToSend = {
        title: newStream.title,
        description: newStream.description || undefined,
        category: newStream.category,
        thumbnailUrl: thumbnailUrl || undefined,
        scheduledAt,
        embedUrl,
      };
      
      const created = await createStream(streamDataToSend);
      console.log('[StreamsView] Created stream:', { id: created.id, title: created.title, status: created.status, embedUrl: created.embedUrl });
      setShowCreateModal(false);
      setNewStream({ title: '', description: '', category: 'DANZA', scheduledAt: '', thumbnailUrl: '' });
      loadStreams();
      
      if (created.status === 'SCHEDULED' || created.status === 'LIVE') {
        setActiveTab('upcoming');
      }
    } catch (error) {
      console.error('Error creating stream:', error);
    } finally {
      setCreating(false);
    }
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
      <div className="relative overflow-hidden">
        <img src="/images/rojo.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative text-white p-4 pt-6 max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <img src="/images/poi_auditorio_guelaguetza.png" alt="Streaming" className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover drop-shadow-md" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Streaming</h1>
                <p className="text-sm md:text-base text-white/80">
                  {liveStreams.length} en vivo ahora
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canManageStreams && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-2.5 md:p-3 bg-oaxaca-yellow rounded-full hover:bg-oaxaca-yellow/80 transition"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 md:p-3 rounded-full ${showFilters ? 'bg-white text-red-600' : 'bg-white/20'}`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
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
                <React.Fragment key={stream.id}>
                  <StreamCard
                    stream={stream}
                    onClick={() => handleStreamClick(stream)}
                    canManage={canManageStreams}
                    isOwner={user?.id === stream.userId}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Stream Modal */}
      {showCreateModal && (
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} size="lg">
          <ModalHeader>Crear Stream</ModalHeader>
          <form onSubmit={handleCreateStream} className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titulo *</label>
              <input
                type="text"
                value={newStream.title}
                onChange={(e) => setNewStream({ ...newStream, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-oaxaca-yellow focus:border-transparent"
                placeholder="Titulo del stream"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripcion</label>
              <textarea
                value={newStream.description}
                onChange={(e) => setNewStream({ ...newStream, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-oaxaca-yellow focus:border-transparent"
                placeholder="Descripcion opcional"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria *</label>
              <select
                value={newStream.category}
                onChange={(e) => setNewStream({ ...newStream, category: e.target.value as StreamCategory })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-oaxaca-yellow focus:border-transparent"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL de YouTube (opcional)</label>
              <input
                type="url"
                value={newStream.thumbnailUrl}
                onChange={(e) => setNewStream({ ...newStream, thumbnailUrl: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-oaxaca-yellow focus:border-transparent"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Programar para</label>
              <input
                type="datetime-local"
                value={newStream.scheduledAt}
                onChange={(e) => setNewStream({ ...newStream, scheduledAt: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-oaxaca-yellow focus:border-transparent"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating || !newStream.title.trim()}
                className="flex-1 px-4 py-2.5 bg-oaxaca-yellow text-black font-medium rounded-xl hover:bg-oaxaca-yellow/80 transition-colors disabled:opacity-50"
              >
                {creating ? 'Creando...' : 'Crear Stream'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

interface StreamCardProps {
  stream: LiveStream;
  onClick: () => void;
  canManage: boolean;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function StreamCard({ stream, onClick, canManage, isOwner, onEdit, onDelete }: StreamCardProps) {
  const isLive = stream.status === 'LIVE';
  const isScheduled = stream.status === 'SCHEDULED';
  const showManageButtons = canManage || isOwner;

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:bg-gray-700 hover:scale-[1.02] transition-all relative group"
    >
      {/* Manage buttons */}
      {showManageButtons && (
        <div className="absolute top-3 right-3 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 bg-white/90 rounded-full hover:bg-white transition"
          >
            <Pencil className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
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
            src={stream.user.avatar || 'https://ui-avatars.com/api/?name=User&background=random&color=fff'}
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
