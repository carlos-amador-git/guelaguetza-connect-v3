import { api, getToken } from './api';

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
}

export async function getLiveStreams() {
  const response = await api.get<LiveStream[]>('/streams/live');
  return response;
}

export async function getUpcomingStreams() {
  const response = await api.get<LiveStream[]>('/streams/upcoming');
  return response;
}

export async function getStream(id: string) {
  const response = await api.get<LiveStream & { messages: StreamMessage[] }>(`/streams/${id}`);
  return response;
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
