import { PrismaClient, Prisma, StreamStatus } from '@prisma/client';
import {
  CreateStreamInput,
  UpdateStreamInput,
  StreamQuery,
} from '../schemas/stream.schema.js';
import { NotFoundError, AppError } from '../utils/errors.js';

export class StreamService {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // STREAMS
  // ============================================

  async getStreams(query: StreamQuery) {
    const { status, category, userId, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.LiveStreamWhereInput = {
      ...(status && { status }),
      ...(category && { category }),
      ...(userId && { userId }),
    };

    const [streams, total] = await Promise.all([
      this.prisma.liveStream.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // LIVE first
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.liveStream.count({ where }),
    ]);

    return {
      streams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLiveStreams() {
    return this.prisma.liveStream.findMany({
      where: { status: 'LIVE' },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            avatar: true,
          },
        },
      },
      orderBy: { viewerCount: 'desc' },
    });
  }

  async getUpcomingStreams() {
    console.log('[getUpcomingStreams] Querying for SCHEDULED streams...');
    const streams = await this.prisma.liveStream.findMany({
      where: {
        status: 'SCHEDULED',
        OR: [
          { scheduledAt: { gte: new Date() } },
          { scheduledAt: null },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            avatar: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
    });
    console.log('[getUpcomingStreams] Found:', streams.length, 'streams');
    return streams;
  }

  async getStreamById(id: string) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            avatar: true,
          },
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                nombre: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!stream) {
      throw new NotFoundError('Stream no encontrado');
    }

    return stream;
  }

  async createStream(userId: string, data: CreateStreamInput) {
    const stream = await this.prisma.liveStream.create({
      data: {
        ...data,
        userId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        status: data.scheduledAt ? 'SCHEDULED' : 'SCHEDULED',
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            avatar: true,
          },
        },
      },
    });

    return stream;
  }

  async updateStream(id: string, userId: string, data: UpdateStreamInput) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundError('Stream no encontrado');
    }

    if (stream.userId !== userId) {
      throw new AppError('No tienes permiso para editar este stream', 403);
    }

    return this.prisma.liveStream.update({
      where: { id },
      data: {
        ...data,
        ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }),
      },
    });
  }

  async deleteStream(id: string, userId: string) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundError('Stream no encontrado');
    }

    if (stream.userId !== userId) {
      throw new AppError('No tienes permiso para eliminar este stream', 403);
    }

    if (stream.status === 'LIVE') {
      throw new AppError('No puedes eliminar un stream en vivo', 400);
    }

    await this.prisma.liveStream.delete({
      where: { id },
    });

    return { message: 'Stream eliminado' };
  }

  async startStream(id: string, userId: string) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundError('Stream no encontrado');
    }

    if (stream.userId !== userId) {
      throw new AppError('No tienes permiso para iniciar este stream', 403);
    }

    if (stream.status === 'LIVE') {
      throw new AppError('El stream ya esta en vivo', 400);
    }

    if (stream.status === 'ENDED') {
      throw new AppError('Este stream ya termino', 400);
    }

    // Use embedUrl if available (YouTube/Facebook Live embed), otherwise mock playback URL
    const playbackUrl = stream.embedUrl ? null : `https://stream.guelaguetza.mx/${stream.streamKey}`;

    return this.prisma.liveStream.update({
      where: { id },
      data: {
        status: 'LIVE',
        startedAt: new Date(),
        ...(playbackUrl ? { playbackUrl } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            avatar: true,
          },
        },
      },
    });
  }

  async endStream(id: string, userId: string) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundError('Stream no encontrado');
    }

    if (stream.userId !== userId) {
      throw new AppError('No tienes permiso para terminar este stream', 403);
    }

    if (stream.status !== 'LIVE') {
      throw new AppError('El stream no esta en vivo', 400);
    }

    return this.prisma.liveStream.update({
      where: { id },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
        vodUrl: stream.playbackUrl?.replace('stream.', 'vod.'),
      },
    });
  }

  // ============================================
  // VIEWER TRACKING
  // ============================================

  async incrementViewerCount(id: string) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream || stream.status !== 'LIVE') {
      return null;
    }

    return this.prisma.liveStream.update({
      where: { id },
      data: {
        viewerCount: { increment: 1 },
        peakViewers: {
          set: Math.max(stream.peakViewers, stream.viewerCount + 1),
        },
      },
    });
  }

  async decrementViewerCount(id: string) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      return null;
    }

    return this.prisma.liveStream.update({
      where: { id },
      data: {
        viewerCount: { decrement: 1 },
      },
    });
  }

  // ============================================
  // CHAT MESSAGES
  // ============================================

  async createMessage(streamId: string, userId: string, content: string) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw new NotFoundError('Stream no encontrado');
    }

    if (stream.status !== 'LIVE') {
      throw new AppError('El chat solo esta disponible durante el stream', 400);
    }

    return this.prisma.streamMessage.create({
      data: {
        streamId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            avatar: true,
          },
        },
      },
    });
  }

  async getRecentMessages(streamId: string, limit: number = 50) {
    return this.prisma.streamMessage.findMany({
      where: { streamId },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ============================================
  // USER STREAMS
  // ============================================

  async getMyStreams(userId: string) {
    return this.prisma.liveStream.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStreamByKey(streamKey: string) {
    return this.prisma.liveStream.findUnique({
      where: { streamKey },
    });
  }
}
