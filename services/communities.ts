// Communities Service - API calls
import { MOCK_COMMUNITIES, MOCK_USERS } from './mockData';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export type CommunityRole = 'MEMBER' | 'MODERATOR' | 'ADMIN';

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  membersCount: number;
  postsCount: number;
  createdAt: string;
  createdBy: {
    id: string;
    nombre: string;
    avatar: string | null;
  };
  isMember?: boolean;
  memberRole?: CommunityRole;
}

export interface CommunityPost {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: {
    id: string;
    nombre: string;
    avatar: string | null;
  };
}

export interface CommunitiesResponse {
  communities: Community[];
  total: number;
  hasMore: boolean;
}

export interface PostsResponse {
  posts: CommunityPost[];
  total: number;
  hasMore: boolean;
}

// Get all communities
export async function getCommunities(
  page: number = 1,
  limit: number = 20,
  search?: string,
  token?: string
): Promise<CommunitiesResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) params.append('search', search);

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/communities?${params}`, { headers });

    if (!response.ok) {
      throw new Error('Error al obtener comunidades');
    }

    const data = await response.json();
    return data.data;
  } catch {
    // Return mock data when backend is unavailable
    let filtered = MOCK_COMMUNITIES.map(c => ({
      ...c,
      slug: c.name.toLowerCase().replace(/\s+/g, '-'),
      coverUrl: null,
      isPublic: !c.isPrivate,
      postsCount: Math.floor(Math.random() * 50),
      createdAt: new Date().toISOString(),
      createdBy: MOCK_USERS[0],
      memberRole: c.isMember ? 'MEMBER' as const : undefined,
    }));

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(s) ||
        c.description.toLowerCase().includes(s)
      );
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      communities: paginated,
      total: filtered.length,
      hasMore: start + limit < filtered.length,
    };
  }
}

// Get my communities
export async function getMyCommunities(
  token: string,
  page: number = 1,
  limit: number = 20
): Promise<{ communities: Community[]; total: number }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`${API_BASE}/communities/my?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener mis comunidades');
  }

  const data = await response.json();
  return data.data;
}

// Get single community
export async function getCommunity(communityId: string, token?: string): Promise<Community> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/communities/${communityId}`, { headers });

  if (!response.ok) {
    throw new Error('Comunidad no encontrada');
  }

  const data = await response.json();
  return data.data;
}

// Create community
export async function createCommunity(
  name: string,
  description: string | undefined,
  isPublic: boolean,
  token: string
): Promise<Community> {
  const response = await fetch(`${API_BASE}/communities`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, description, isPublic }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al crear comunidad');
  }

  const data = await response.json();
  return data.data;
}

// Join community
export async function joinCommunity(communityId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/communities/${communityId}/join`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al unirse a la comunidad');
  }
}

// Leave community
export async function leaveCommunity(communityId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/communities/${communityId}/leave`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al salir de la comunidad');
  }
}

// Get community posts
export async function getCommunityPosts(
  communityId: string,
  page: number = 1,
  limit: number = 20
): Promise<PostsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`${API_BASE}/communities/${communityId}/posts?${params}`);

  if (!response.ok) {
    throw new Error('Error al obtener posts');
  }

  const data = await response.json();
  return data.data;
}

// Create post
export async function createPost(
  communityId: string,
  content: string,
  imageUrl: string | null | undefined,
  token: string
): Promise<CommunityPost> {
  const response = await fetch(`${API_BASE}/communities/${communityId}/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content, imageUrl: imageUrl || null }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al crear post');
  }

  const data = await response.json();
  return data.data;
}

// Delete post
export async function deletePost(
  communityId: string,
  postId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/communities/${communityId}/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al eliminar post');
  }
}

// Format time ago
export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'ahora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
