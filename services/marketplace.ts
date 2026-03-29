import { api } from './api';
import { MOCK_PRODUCTS, MOCK_USERS } from './mockData';

// Types
export type ProductCategory = 'ARTESANIA' | 'MEZCAL' | 'TEXTIL' | 'CERAMICA' | 'JOYERIA' | 'GASTRONOMIA' | 'OTRO';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'SOLD_OUT' | 'ARCHIVED';

export interface SellerProfile {
  id: string;
  userId: string;
  businessName: string;
  description: string | null;
  bannerUrl: string | null;
  location: string | null;
  rating: number;
  reviewCount: number;
  verified: boolean;
  user: {
    id: string;
    nombre: string;
    apellido?: string;
    avatar: string | null;
  };
  _count?: {
    products: number;
  };
}

export interface Product {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  price: string;
  category: ProductCategory;
  status: ProductStatus;
  stock: number;
  images: string[];
  createdAt: string;
  seller: SellerProfile;
  _count?: {
    reviews: number;
  };
}

export interface ProductReview {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    nombre: string;
    avatar: string | null;
  };
}

export interface ProductQuery {
  category?: ProductCategory;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
}

// API Functions

// Products
export async function getProducts(query: ProductQuery = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });

    const response = await api.get<{
      products: Product[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/marketplace/products?${params}`);
    return response;
  } catch {
    // Return mock data when backend is unavailable
    const { page = 1, limit = 20, category, search } = query;
    let filtered = MOCK_PRODUCTS.map(p => ({
      id: p.id,
      sellerId: p.seller.id,
      name: p.name,
      description: p.description,
      price: String(p.price),
      category: p.category as ProductCategory,
      status: 'ACTIVE' as ProductStatus,
      stock: p.stock,
      images: [p.imageUrl],
      createdAt: new Date().toISOString(),
      seller: {
        id: p.seller.id,
        userId: p.seller.id,
        businessName: p.seller.nombre + ' Artesanias',
        description: p.seller.bio || null,
        bannerUrl: null,
        location: p.seller.region || null,
        rating: 4.5,
        reviewCount: 12,
        verified: true,
        user: {
          id: p.seller.id,
          nombre: p.seller.nombre,
          apellido: p.seller.apellido,
          avatar: p.seller.avatar,
        },
      },
    }));

    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s)
      );
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      products: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }
}

export async function getProduct(id: string) {
  try {
    const response = await api.get<Product & { reviews: ProductReview[] }>(`/marketplace/products/${id}`);
    return response;
  } catch {
    // Return mock data when backend is unavailable
    const mockProduct = MOCK_PRODUCTS.find(p => p.id === id);
    if (!mockProduct) {
      throw new Error('Product not found');
    }

    return {
      id: mockProduct.id,
      sellerId: mockProduct.seller.id,
      name: mockProduct.name,
      description: mockProduct.description,
      price: String(mockProduct.price),
      category: mockProduct.category as ProductCategory,
      status: 'ACTIVE' as ProductStatus,
      stock: mockProduct.stock,
      images: [mockProduct.imageUrl],
      createdAt: new Date().toISOString(),
      seller: {
        id: mockProduct.seller.id,
        userId: mockProduct.seller.id,
        businessName: mockProduct.seller.nombre + ' Artesanías',
        description: mockProduct.seller.bio || null,
        bannerUrl: null,
        location: mockProduct.seller.region || null,
        rating: 4.5,
        reviewCount: 12,
        verified: true,
        user: {
          id: mockProduct.seller.id,
          nombre: mockProduct.seller.nombre,
          apellido: mockProduct.seller.apellido,
          avatar: mockProduct.seller.avatar,
        },
      },
      reviews: [
        {
          id: 'review_1',
          userId: MOCK_USERS[0].id,
          productId: mockProduct.id,
          rating: 5,
          comment: '¡Excelente producto! La calidad es impresionante.',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          user: {
            id: MOCK_USERS[0].id,
            nombre: MOCK_USERS[0].nombre,
            avatar: MOCK_USERS[0].avatar,
          },
        },
        {
          id: 'review_2',
          userId: MOCK_USERS[1].id,
          productId: mockProduct.id,
          rating: 4,
          comment: 'Muy bonito, llegó bien empacado.',
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          user: {
            id: MOCK_USERS[1].id,
            nombre: MOCK_USERS[1].nombre,
            avatar: MOCK_USERS[1].avatar,
          },
        },
      ],
    };
  }
}

// Seller
export async function getSellerProfile() {
  const response = await api.get<SellerProfile | null>('/marketplace/seller/profile');
  return response;
}

export async function createSellerProfile(data: {
  businessName: string;
  description?: string;
  location?: string;
}) {
  const response = await api.post<SellerProfile>('/marketplace/seller/profile', data);
  return response;
}

export async function updateSellerProfile(data: {
  businessName?: string;
  description?: string;
  location?: string;
}) {
  const response = await api.put<SellerProfile>('/marketplace/seller/profile', data);
  return response;
}

// Seller product CRUD
export async function getMyProducts(params: { category?: string; status?: string; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page || 1));
  query.set('limit', String(params.limit || 50));
  query.set('sellerId', 'me');

  const response = await api.get<{ products: Product[]; pagination: { total: number; page: number; totalPages: number } }>(`/marketplace/products?${query}`);
  return response;
}

export async function createProduct(data: {
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  stock?: number;
  images?: string[];
}) {
  const response = await api.post<Product>('/marketplace/products', data);
  return response;
}

export async function updateProduct(id: string, data: Partial<{
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  stock: number;
  status: string;
  images: string[];
}>) {
  const response = await api.put<Product>(`/marketplace/products/${id}`, data);
  return response;
}

export async function deleteProduct(id: string) {
  await api.delete(`/marketplace/products/${id}`);
}

// Image upload
export async function uploadProductImage(file: File): Promise<string> {
  const token = localStorage.getItem('auth_token');
  const formData = new FormData();
  formData.append('file', file);

  const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';
  const res = await fetch(`${API_URL}/upload/image`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error('Error al subir imagen');
  const data = await res.json();
  // Return full URL so images work across ports
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const url = data.data.url;
  return url.startsWith('http') ? url : `${apiUrl}${url}`;
}

// Reviews
export async function createProductReview(productId: string, data: { rating: number; comment?: string }) {
  const response = await api.post<ProductReview>(`/marketplace/products/${productId}/reviews`, data);
  return response;
}

// Helpers
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  ARTESANIA: 'Artesania',
  MEZCAL: 'Mezcal',
  TEXTIL: 'Textiles',
  CERAMICA: 'Ceramica',
  JOYERIA: 'Joyeria',
  GASTRONOMIA: 'Gastronomia',
  OTRO: 'Otro',
};

export function formatPrice(price: string | number): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  const hasDecimals = numPrice % 1 !== 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(numPrice);
}

// Wishlist (Lista de Deseos)
const WISHLIST_STORAGE_KEY = 'guelaguetza_wishlist';

export interface WishlistItem {
  productId: string;
  addedAt: string;
}

function getStoredWishlist(): WishlistItem[] {
  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveWishlist(items: WishlistItem[]) {
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
}

export async function getWishlist(): Promise<Product[]> {
  const wishlistItems = getStoredWishlist();
  const products: Product[] = [];

  for (const item of wishlistItems) {
    const mockProduct = MOCK_PRODUCTS.find(p => p.id === item.productId);
    if (mockProduct) {
      products.push({
        id: mockProduct.id,
        sellerId: mockProduct.seller.id,
        name: mockProduct.name,
        description: mockProduct.description,
        price: String(mockProduct.price),
        category: mockProduct.category as ProductCategory,
        status: 'ACTIVE' as ProductStatus,
        stock: mockProduct.stock,
        images: [mockProduct.imageUrl],
        createdAt: item.addedAt,
        seller: {
          id: mockProduct.seller.id,
          userId: mockProduct.seller.id,
          businessName: mockProduct.seller.nombre + ' Artesanías',
          description: mockProduct.seller.bio || null,
          bannerUrl: null,
          location: mockProduct.seller.region || null,
          rating: 4.5,
          reviewCount: 12,
          verified: true,
          user: {
            id: mockProduct.seller.id,
            nombre: mockProduct.seller.nombre,
            apellido: mockProduct.seller.apellido,
            avatar: mockProduct.seller.avatar,
          },
        },
      });
    }
  }

  return products;
}

export async function addToWishlist(productId: string): Promise<boolean> {
  const wishlist = getStoredWishlist();
  const exists = wishlist.some(item => item.productId === productId);

  if (!exists) {
    wishlist.push({ productId, addedAt: new Date().toISOString() });
    saveWishlist(wishlist);
    return true;
  }

  return false;
}

export async function removeFromWishlist(productId: string): Promise<boolean> {
  const wishlist = getStoredWishlist();
  const index = wishlist.findIndex(item => item.productId === productId);

  if (index >= 0) {
    wishlist.splice(index, 1);
    saveWishlist(wishlist);
    return true;
  }

  return false;
}

export async function isInWishlist(productId: string): Promise<boolean> {
  const wishlist = getStoredWishlist();
  return wishlist.some(item => item.productId === productId);
}

export async function getWishlistCount(): Promise<number> {
  return getStoredWishlist().length;
}
