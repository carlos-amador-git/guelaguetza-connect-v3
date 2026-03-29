import { PrismaClient, Prisma } from '@prisma/client';
import {
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
  CreateProductReviewInput,
  CreateSellerProfileInput,
  UpdateSellerProfileInput,
} from '../schemas/marketplace.schema.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import { CacheService } from './cache.service.js';
import { EventBus } from '../infrastructure/events/index.js';

export class MarketplaceService {
  // Cache TTLs (in seconds)
  private readonly CACHE_TTL = {
    PRODUCT_DETAIL: 120, // 2 minutos - detalle de producto
    PRODUCT_LIST: 600, // 10 minutos - listado de productos
    SELLER_PROFILE: 300, // 5 minutos - perfil de vendedor
  };

  constructor(
    private prisma: PrismaClient,
    private cache?: CacheService,
    private eventBus?: EventBus
  ) {}

  // ============================================
  // PRODUCTS
  // ============================================

  async getProducts(query: ProductQuery) {
    const { category, minPrice, maxPrice, status, sellerId, search, page, limit } = query;
    const skip = (page - 1) * limit;

    // Cache key based on query params
    const cacheKey = `products:list:cat:${category || 'all'}:status:${status || 'ACTIVE'}:seller:${sellerId || 'all'}:price:${minPrice || 0}-${maxPrice || 'inf'}:search:${search || 'none'}:page:${page}:limit:${limit}`;

    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const where: Prisma.ProductWhereInput = {
      status: status || 'ACTIVE',
      ...(category && { category }),
      ...(sellerId && { sellerId }),
      ...(minPrice !== undefined && { price: { gte: minPrice } }),
      ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sellerId: true,
          name: true,
          description: true,
          price: true,
          category: true,
          status: true,
          stock: true,
          images: true,
          createdAt: true,
          seller: {
            select: {
              id: true,
              userId: true,
              businessName: true,
              description: true,
              bannerUrl: true,
              location: true,
              rating: true,
              reviewCount: true,
              verified: true,
              user: {
                select: { id: true, nombre: true, avatar: true },
              },
            },
          },
          _count: {
            select: { reviews: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const result = {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the result
    if (this.cache) {
      await this.cache.set(cacheKey, result, this.CACHE_TTL.PRODUCT_LIST);
    }

    return result;
  }

  async getProductById(id: string) {
    // Try cache first
    const cacheKey = `product:${id}:detail`;
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          include: {
            user: {
              select: { id: true, nombre: true, apellido: true, avatar: true },
            },
          },
        },
        reviews: {
          include: {
            user: {
              select: { id: true, nombre: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { reviews: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Cache the result
    if (this.cache) {
      await this.cache.set(cacheKey, product, this.CACHE_TTL.PRODUCT_DETAIL);
    }

    return product;
  }

  async createProduct(userId: string, data: CreateProductInput) {
    // Get or create seller profile
    let seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new AppError('Necesitas crear un perfil de vendedor primero', 400);
    }

    const product = await this.prisma.product.create({
      data: {
        ...data,
        price: new Prisma.Decimal(data.price),
        sellerId: seller.id,
        status: 'ACTIVE',
      },
      include: {
        seller: true,
      },
    });

    // Invalidate product listings cache
    if (this.cache) {
      await this.cache.invalidate('products:list:*');
    }

    return product;
  }

  async updateProduct(id: string, userId: string, data: UpdateProductInput) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    if (product.seller.userId !== userId) {
      throw new AppError('No tienes permiso para editar este producto', 403);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...(data.price && { price: new Prisma.Decimal(data.price) }),
      },
    });

    // Invalidate cache
    if (this.cache) {
      await Promise.all([
        this.cache.del(`product:${id}:detail`),
        this.cache.invalidate('products:list:*'),
      ]);
    }

    return updated;
  }

  async deleteProduct(id: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    if (product.seller.userId !== userId) {
      throw new AppError('No tienes permiso para eliminar este producto', 403);
    }

    await this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    // Invalidate cache
    if (this.cache) {
      await Promise.all([
        this.cache.del(`product:${id}:detail`),
        this.cache.invalidate('products:list:*'),
      ]);
    }

    return { message: 'Producto eliminado' };
  }

  // ============================================
  // SELLER PROFILE
  // ============================================

  async getSellerProfile(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, nombre: true, apellido: true, avatar: true },
        },
        products: {
          where: { status: 'ACTIVE' },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    return profile;
  }

  async createSellerProfile(userId: string, data: CreateSellerProfileInput) {
    const existing = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new AppError('Ya tienes un perfil de vendedor', 400);
    }

    return this.prisma.sellerProfile.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async updateSellerProfile(userId: string, data: UpdateSellerProfileInput) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError('Perfil de vendedor no encontrado');
    }

    return this.prisma.sellerProfile.update({
      where: { userId },
      data,
    });
  }

  // ============================================
  // REVIEWS
  // ============================================

  async createProductReview(userId: string, productId: string, data: CreateProductReviewInput) {
    // Check for existing review
    const existingReview = await this.prisma.productReview.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existingReview) {
      throw new AppError('Ya has resenado este producto', 400);
    }

    const review = await this.prisma.productReview.create({
      data: {
        userId,
        productId,
        rating: data.rating,
        comment: data.comment,
      },
      include: {
        user: {
          select: { id: true, nombre: true, avatar: true },
        },
      },
    });

    // Update seller rating
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (product) {
      const stats = await this.prisma.productReview.aggregate({
        where: { product: { sellerId: product.sellerId } },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await this.prisma.sellerProfile.update({
        where: { id: product.sellerId },
        data: {
          rating: stats._avg.rating || 0,
          reviewCount: stats._count.rating,
        },
      });
    }

    return review;
  }
}
