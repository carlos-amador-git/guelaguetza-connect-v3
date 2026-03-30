import { api, getToken } from './api';
import { MOCK_STREAMS } from './mockData';

// Types
export type StreamStatus = 'SCHEDULED' | 'LIVE' | 'ENDED';
export type StreamCategory = 'DANZA' | 'MUSICA' | 'ARTESANIA' | 'COCINA' | 'CHARLA' | 'OTRO';

export interface LiveStream {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: StreamCategory;
  status: StreamStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  viewerCount: number;
  peakViewers: number;
  streamKey: string;
  playbackUrl: string | null;
  vodUrl: string | null;
  embedUrl: string | null;
  createdAt: string;
  user: {
    id: string;
    nombre: string;
    apellido: string;
    avatar: string | null;
  };
  _count?: {
    messages: number;
  };
}

export interface StreamMessage {
  id: string;
  streamId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    nombre: string;
    avatar: string | null;
  };
}

export interface StreamQuery {
  status?: StreamStatus;
  category?: StreamCategory;
  page?: number;
  limit?: number;
}

// API Functions
export async function getStreams(query: StreamQuery = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });

    const response = await api.get<{
      streams: LiveStream[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/streams?${params}`);
    return response;
  } catch {
    // Return mock data when backend is unavailable
    const { page = 1, limit = 20, status, category } = query;
    let filtered = MOCK_STREAMS.map(s => ({
      ...s,
      description: s.description,
      category: 'DANZA' as StreamCategory,
      status: s.isLive ? 'LIVE' as StreamStatus : 'ENDED' as StreamStatus,
      scheduledAt: null,
      startedAt: s.startedAt,
      endedAt: s.isLive ? null : s.startedAt,
      peakViewers: s.viewerCount,
      streamKey: 'demo_key',
      playbackUrl: null,
      vodUrl: null,
      embedUrl: (s as any).embedUrl || null,
      createdAt: s.startedAt,
      user: {
        ...s.host,
        apellido: s.host.apellido || '',
      },
    }));

    if (status) {
      filtered = filtered.filter(s => s.status === status);
    }
    if (category) {
      filtered = filtered.filter(s => s.category === category);
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      streams: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }
}

export async function getLiveStreams() {
  try {
    const response = await api.get<LiveStream[]>('/streams/live');
    return response;
  } catch {
    // Return mock live streams
    return MOCK_STREAMS.filter(s => s.isLive).map(s => ({
      ...s,
      description: s.description,
      category: 'DANZA' as StreamCategory,
      status: 'LIVE' as StreamStatus,
      scheduledAt: null,
      startedAt: s.startedAt,
      endedAt: null,
      peakViewers: s.viewerCount,
      streamKey: 'demo_key',
      playbackUrl: null,
      vodUrl: null,
      embedUrl: (s as any).embedUrl || null,
      createdAt: s.startedAt,
      user: {
        ...s.host,
        apellido: s.host.apellido || '',
      },
    }));
  }
}

export async function getUpcomingStreams() {
  try {
    const response = await api.get<LiveStream[]>('/streams/upcoming');
    return response;
  } catch {
    // Return mock upcoming streams
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return [
      {
        id: 'upcoming_1',
        userId: 'host_1',
        title: 'Clase de Baile Folklórico - Flor de Piña',
        description: 'Aprende los pasos básicos del tradicional baile Flor de Piña de Tuxtepec',
        thumbnailUrl: '',
        category: 'DANZA' as StreamCategory,
        status: 'SCHEDULED' as StreamStatus,
        scheduledAt: tomorrow.toISOString(),
        startedAt: null,
        endedAt: null,
        viewerCount: 0,
        peakViewers: 0,
        streamKey: 'demo_key',
        playbackUrl: null,
        vodUrl: null,
        createdAt: new Date().toISOString(),
        user: {
          id: 'host_1',
          nombre: 'María',
          apellido: 'López',
          avatar: '',
        },
      },
      {
        id: 'upcoming_2',
        userId: 'host_2',
        title: 'Taller de Mezcal - Destilación Tradicional',
        description: 'Conoce el proceso artesanal de elaboración del mezcal oaxaqueño',
        thumbnailUrl: '',
        category: 'ARTESANIA' as StreamCategory,
        status: 'SCHEDULED' as StreamStatus,
        scheduledAt: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        startedAt: null,
        endedAt: null,
        viewerCount: 0,
        peakViewers: 0,
        streamKey: 'demo_key',
        playbackUrl: null,
        vodUrl: null,
        createdAt: new Date().toISOString(),
        user: {
          id: 'host_2',
          nombre: 'José',
          apellido: 'García',
          avatar: '',
        },
      },
    ];
  }
}

export async function getStream(id: string) {
  try {
    const response = await api.get<LiveStream & { messages: StreamMessage[] }>(`/streams/${id}`);
    return response;
  } catch {
    // Return mock stream
    const mockStream = MOCK_STREAMS.find(s => s.id === id);

    const baseStream = mockStream ? {
      ...mockStream,
      description: mockStream.description,
      category: 'DANZA' as StreamCategory,
      status: mockStream.isLive ? 'LIVE' as StreamStatus : 'ENDED' as StreamStatus,
      scheduledAt: null,
      startedAt: mockStream.startedAt,
      endedAt: mockStream.isLive ? null : mockStream.startedAt,
      peakViewers: mockStream.viewerCount,
      streamKey: 'demo_key',
      playbackUrl: null,
      vodUrl: null,
      createdAt: mockStream.startedAt,
      user: {
        ...mockStream.host,
        apellido: mockStream.host.apellido || '',
      },
    } : {
      id,
      userId: 'host_1',
      title: 'Stream Demo',
      description: 'Una transmisión de demostración',
      thumbnailUrl: '',
      category: 'OTRO' as StreamCategory,
      status: 'LIVE' as StreamStatus,
      scheduledAt: null,
      startedAt: new Date().toISOString(),
      endedAt: null,
      viewerCount: 127,
      peakViewers: 156,
      streamKey: 'demo_key',
      playbackUrl: null,
      vodUrl: null,
      embedUrl: null,
      createdAt: new Date().toISOString(),
      user: {
        id: 'host_1',
        nombre: 'Host',
        apellido: 'Demo',
        avatar: '',
      },
    };

    return {
      ...baseStream,
      messages: [
        {
          id: 'msg_1',
          streamId: id,
          userId: 'user_1',
          content: '¡Qué bonito! 🎉',
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          user: {
            id: 'user_1',
            nombre: 'Ana',
            avatar: '',
          },
        },
        {
          id: 'msg_2',
          streamId: id,
          userId: 'user_2',
          content: 'Excelente transmisión',
          createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
          user: {
            id: 'user_2',
            nombre: 'Carlos',
            avatar: '',
          },
        },
        {
          id: 'msg_3',
          streamId: id,
          userId: 'user_3',
          content: '¡Saludos desde CDMX! 👋',
          createdAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
          user: {
            id: 'user_3',
            nombre: 'Laura',
            avatar: '',
          },
        },
      ],
    };
  }
}

export async function createStream(data: {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  category: StreamCategory;
  scheduledAt?: string;
  embedUrl?: string;
}) {
  // Clean undefined/empty fields to avoid Zod validation errors
  const cleanData: Record<string, unknown> = { title: data.title, category: data.category };
  if (data.description) cleanData.description = data.description;
  if (data.thumbnailUrl) cleanData.thumbnailUrl = data.thumbnailUrl;
  if (data.scheduledAt) cleanData.scheduledAt = data.scheduledAt;
  if (data.embedUrl) cleanData.embedUrl = data.embedUrl;

  const response = await api.post<LiveStream>('/streams', cleanData);
  return response;
}

export async function updateStream(id: string, data: Partial<{
  title: string;
  description: string;
  thumbnailUrl: string;
  category: StreamCategory;
  scheduledAt: string;
}>) {
  const response = await api.put<LiveStream>(`/streams/${id}`, data);
  return response;
}

export async function deleteStream(id: string) {
  const response = await api.delete<{ message: string }>(`/streams/${id}`);
  return response;
}

export async function startStream(id: string) {
  const response = await api.post<LiveStream>(`/streams/${id}/start`, {});
  return response;
}

export async function endStream(id: string) {
  const response = await api.post<LiveStream>(`/streams/${id}/end`, {});
  return response;
}

export async function getMyStreams() {
  const response = await api.get<LiveStream[]>('/streams/user/my-streams');
  return response;
}

export async function getStreamMessages(id: string) {
  const response = await api.get<StreamMessage[]>(`/streams/${id}/messages`);
  return response;
}

export async function sendStreamMessage(id: string, content: string) {
  const response = await api.post<StreamMessage>(`/streams/${id}/messages`, { content });
  return response;
}

// WebSocket connection for live chat
export function connectToStreamChat(
  streamId: string,
  callbacks: {
    onMessage: (message: StreamMessage) => void;
    onViewerCount: (count: number) => void;
    onError: (error: string) => void;
    onClose: () => void;
  }
) {
  const wsBase = (import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/^http/, 'ws');
  const wsUrl = `${wsBase}/api/streams/${streamId}/ws`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    if (import.meta.env.DEV) console.log('[streams] Stream chat connected');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_message') {
        callbacks.onMessage(data.message);
      } else if (data.type === 'viewer_count') {
        callbacks.onViewerCount(data.count);
      } else if (data.type === 'error') {
        callbacks.onError(data.message);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  ws.onerror = () => {
    callbacks.onError('Connection error');
  };

  ws.onclose = () => {
    callbacks.onClose();
  };

  // Return functions to send messages and close connection
  return {
    sendMessage: (content: string) => {
      const token = getToken();
      if (token && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'chat_message',
          token,
          content,
        }));
      }
    },
    close: () => {
      ws.close();
    },
  };
}

// Helpers
export const CATEGORY_LABELS: Record<StreamCategory, string> = {
  DANZA: 'Danza',
  MUSICA: 'Musica',
  ARTESANIA: 'Artesania',
  COCINA: 'Cocina',
  CHARLA: 'Charla',
  OTRO: 'Otro',
};

export const STATUS_LABELS: Record<StreamStatus, string> = {
  SCHEDULED: 'Programado',
  LIVE: 'En vivo',
  ENDED: 'Terminado',
};

export const STATUS_COLORS: Record<StreamStatus, string> = {
  SCHEDULED: '#3B82F6',
  LIVE: '#EF4444',
  ENDED: '#6B7280',
};
