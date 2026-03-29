import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { CommunityService } from '../services/community.service.js';
import {
  createCommunitySchema,
  updateCommunitySchema,
  createPostSchema,
} from '../schemas/community.schema.js';

const communitiesRoutes: FastifyPluginAsync = async (fastify) => {
  const communityService = new CommunityService(fastify.prisma);

  // Optional auth helper
  const optionalAuth = async (request: FastifyRequest) => {
    try {
      const decoded = await request.jwtVerify<{ userId: string }>();
      const user = await fastify.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, bannedAt: true },
      });
      if (user && !user.bannedAt) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (request as any).user = { ...user, userId: user.id };
      }
    } catch {
      // Not authenticated, continue
    }
  };

  // Get all communities
  fastify.get<{
    Querystring: { page?: string; limit?: string; search?: string };
  }>('/', async (request) => {
    await optionalAuth(request);
    const page = parseInt(request.query.page || '1', 10);
    const limit = Math.min(parseInt(request.query.limit || '20', 10), 50);
    const { search } = request.query;

    const userId = request.user?.id;
    const result = await communityService.getCommunities(page, limit, search, userId);

    return { success: true, data: result };
  });

  // Get my communities
  fastify.get(
    '/my',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = request.user.id;
      const result = await communityService.getMyCommunities(userId);
      return { success: true, data: result };
    }
  );

  // Get community by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await optionalAuth(request);
    const { id } = request.params;

    // Try by ID first, then by slug
    let community = await communityService.getCommunity(id, request.user?.id);
    if (!community) {
      community = await communityService.getCommunityBySlug(id, request.user?.id);
    }

    if (!community) {
      return reply.status(404).send({ error: 'Comunidad no encontrada' });
    }

    return { success: true, data: community };
  });

  // Create community
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = createCommunitySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Datos inválidos',
          details: parsed.error.errors,
        });
      }

      const userId = request.user.id;
      const community = await communityService.createCommunity(userId, parsed.data);

      return { success: true, data: community };
    }
  );

  // Update community
  fastify.put<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: communityId } = request.params;

      const parsed = updateCommunitySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Datos inválidos',
          details: parsed.error.errors,
        });
      }

      const userId = request.user.id;
      const community = await communityService.updateCommunity(communityId, userId, parsed.data);

      if (!community) {
        return reply.status(403).send({
          error: 'No tienes permisos para editar esta comunidad',
        });
      }

      return { success: true, data: community };
    }
  );

  // Join community
  fastify.post<{ Params: { id: string } }>(
    '/:id/join',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: communityId } = request.params;
      const userId = request.user.id;

      const result = await communityService.joinCommunity(communityId, userId);

      if (!result.success) {
        let errorMessage = 'No se pudo unir a la comunidad';
        
        if (result.reason === 'ALREADY_MEMBER') {
          errorMessage = 'Ya eres miembro de esta comunidad';
        } else if (result.reason === 'COMMUNITY_PRIVATE') {
          errorMessage = 'Esta comunidad es privada y no permite nuevas membresías';
        } else if (result.reason === 'COMUNITY_NOT_FOUND') {
          errorMessage = 'La comunidad no fue encontrada';
        }
        
        return reply.status(400).send({
          error: errorMessage,
        });
      }

      return { success: true, message: 'Te has unido a la comunidad' };
    }
  );

  // Leave community
  fastify.delete<{ Params: { id: string } }>(
    '/:id/leave',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: communityId } = request.params;
      const userId = request.user.id;

      const success = await communityService.leaveCommunity(communityId, userId);

      if (!success) {
        return reply.status(400).send({
          error: 'No se pudo salir de la comunidad. Si eres el único admin, debes transferir el rol primero.',
        });
      }

      return { success: true, message: 'Has salido de la comunidad' };
    }
  );

  // Get community posts
  fastify.get<{
    Params: { id: string };
    Querystring: { page?: string; limit?: string };
  }>('/:id/posts', async (request, reply) => {
    const { id: communityId } = request.params;
    const page = parseInt(request.query.page || '1', 10);
    const limit = Math.min(parseInt(request.query.limit || '20', 10), 50);

    // Check if community exists
    const community = await communityService.getCommunity(communityId);
    if (!community) {
      return reply.status(404).send({ error: 'Comunidad no encontrada' });
    }

    const result = await communityService.getCommunityPosts(communityId, page, limit);
    return { success: true, data: result };
  });

  // Create post in community
  fastify.post<{ Params: { id: string } }>(
    '/:id/posts',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: communityId } = request.params;

      const parsed = createPostSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Datos inválidos',
          details: parsed.error.errors,
        });
      }

      const userId = request.user.id;
      const post = await communityService.createPost(communityId, userId, parsed.data);

      if (!post) {
        return reply.status(403).send({
          error: 'Debes ser miembro de la comunidad para publicar',
        });
      }

      return { success: true, data: post };
    }
  );

  // Delete post
  fastify.delete<{ Params: { id: string; postId: string } }>(
    '/:id/posts/:postId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { postId } = request.params;
      const userId = request.user.id;

      const success = await communityService.deletePost(postId, userId);

      if (!success) {
        return reply.status(403).send({
          error: 'No tienes permisos para eliminar este post',
        });
      }

      return { success: true, message: 'Post eliminado' };
    }
  );

  // Get post comments
  fastify.get<{ Params: { id: string; postId: string } }>(
    '/:id/posts/:postId/comments',
    async (request, reply) => {
      const { postId } = request.params;

      const comments = await communityService.getPostComments(postId);
      return { success: true, data: comments };
    }
  );

  // Create comment
  fastify.post<{ Params: { id: string; postId: string } }>(
    '/:id/posts/:postId/comments',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { postId } = request.params;
      const userId = request.user.id;
      const { content, imageUrl } = request.body as { content: string; imageUrl?: string | null };

      if (!content?.trim()) {
        return reply.status(400).send({ error: 'El contenido del comentario es requerido' });
      }

      const comment = await communityService.createPostComment(postId, userId, content, imageUrl);

      if (!comment) {
        return reply.status(404).send({ error: 'Post no encontrado' });
      }

      return { success: true, data: comment };
    }
  );

  // Delete comment
  fastify.delete<{ Params: { id: string; postId: string; commentId: string } }>(
    '/:id/posts/:postId/comments/:commentId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { commentId } = request.params;
      const userId = request.user.id;

      const success = await communityService.deletePostComment(commentId, userId);

      if (!success) {
        return reply.status(403).send({
          error: 'No tienes permisos para eliminar este comentario',
        });
      }

      return { success: true, message: 'Comentario eliminado' };
    }
  );
};

export default communitiesRoutes;
