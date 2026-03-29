import { MOCK_STORIES } from './mockData';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

// Custom error class with status code
export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  is409Conflict(): boolean {
    return this.statusCode === 409;
  }

  isConcurrencyError(): boolean {
    return this.statusCode === 409;
  }
}

// Token management (synced with AuthContext)
export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('auth_token');
}

// Generic API helper
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiError(
        error.message || 'Request failed',
        res.status,
        error.code,
        error
      );
    }
    return res.json();
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(res);
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(res);
  }

  async put<T>(path: string, data: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(res);
  }

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(res);
  }

  async patch<T>(path: string, data: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(res);
  }
}

export const api = new ApiClient(API_BASE);

// Types
export interface Story {
  id: string;
  description: string;
  mediaUrl: string;
  location: string;
  views: number;
  createdAt: string;
  user: {
    id: string;
    nombre: string;
    avatar: string | null;
  };
  _count: {
    likes: number;
    comments: number;
  };
}

export interface BusRoute {
  id: string;
  routeCode: string;
  name: string;
  color: string;
  type: string;
  description: string | null;
  frequency: number | null;
  stops: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    sequence: number;
  }>;
  buses: Array<{
    id: string;
    busCode: string;
    latitude: number | null;
    longitude: number | null;
  }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  createdAt: string;
  messages: ChatMessage[];
}

// API Functions
export async function fetchStories(): Promise<Story[]> {
  try {
    const res = await fetch(`${API_BASE}/stories`);
    if (!res.ok) throw new Error('Failed to fetch stories');
    const data = await res.json();
    return data.stories;
  } catch {
    // Return mock data when backend is unavailable
    return MOCK_STORIES.map(s => ({
      id: s.id,
      description: s.description,
      mediaUrl: s.mediaUrl,
      location: s.location,
      views: s.views,
      createdAt: s.createdAt,
      user: {
        id: s.user.id,
        nombre: s.user.nombre,
        avatar: s.user.avatar,
      },
      _count: s._count,
    }));
  }
}

export async function fetchRoutes(): Promise<BusRoute[]> {
  const res = await fetch(`${API_BASE}/transport/routes`);
  if (!res.ok) throw new Error('Failed to fetch routes');
  return res.json();
}

export async function fetchRouteById(id: string): Promise<BusRoute> {
  const res = await fetch(`${API_BASE}/transport/routes/${id}`);
  if (!res.ok) throw new Error('Failed to fetch route');
  return res.json();
}

export async function sendChatMessage(
  message: string,
  conversationId?: string
): Promise<{ response: string; conversationId: string }> {
  const res = await fetch(`${API_BASE}/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function fetchConversation(id: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/chat/conversations/${id}`);
  if (!res.ok) throw new Error('Failed to fetch conversation');
  return res.json();
}

// Story interactions
export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: {
    id: string;
    nombre: string;
    avatar: string | null;
  };
}

export interface StoryWithDetails extends Story {
  isLiked?: boolean;
  comments?: Comment[];
}

export async function likeStory(storyId: string, token: string): Promise<{ liked: boolean; likesCount: number }> {
  const res = await fetch(`${API_BASE}/stories/${storyId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to like story');
  return res.json();
}

export async function addComment(
  storyId: string,
  text: string,
  token: string
): Promise<Comment> {
  const res = await fetch(`${API_BASE}/stories/${storyId}/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to add comment');
  return res.json();
}

export async function createStory(
  data: { description: string; mediaUrl: string; location: string },
  token: string
): Promise<Story> {
  const res = await fetch(`${API_BASE}/stories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create story');
  return res.json();
}

export async function deleteStory(storyId: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/stories/${storyId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to delete story');
}
