import { PrismaClient, CommunityRole, Prisma } from '@prisma/client';
import {
  CreateCommunityInput,
  UpdateCommunityInput,
  CreatePostInput,
  generateSlug,
} from '../schemas/community.schema.js';

export interface CommunityResponse {
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

export interface CommunityPostResponse {
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

export class CommunityService {
  constructor(private prisma: PrismaClient) {}

  // Create a new community
  async createCommunity(
    userId: string,
    data: CreateCommunityInput
  ): Promise<CommunityResponse> {
    // Generate unique slug
    let slug = generateSlug(data.name);
    let counter = 0;
    let uniqueSlug = slug;

    while (true) {
      const existing = await this.prisma.community.findUnique({
        where: { slug: uniqueSlug },
      });
      if (!existing) break;
      counter++;
      uniqueSlug = `${slug}-${counter}`;
    }

    const community = await this.prisma.community.create({
      data: {
        name: data.name,
        slug: uniqueSlug,
        description: data.description,
        isPublic: data.isPublic,
        createdById: userId,
        members: {
          create: {
            userId,
            role: 'ADMIN',
          },
        },
      },
      include: {
        createdBy: {
          select: { id: true, nombre: true, avatar: true },
        },
        _count: {
          select: { members: true, posts: true },
        },
      },
    });

    return {
      id: community.id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      imageUrl: community.imageUrl,
      coverUrl: community.coverUrl,
      isPublic: community.isPublic,
      membersCount: community._count.members,
      postsCount: community._count.posts,
      createdAt: community.createdAt.toISOString(),
      createdBy: community.createdBy,
      isMember: true,
      memberRole: 'ADMIN',
    };
  }

  // Get communities list
  async getCommunities(
    page: number = 1,
    limit: number = 20,
    search?: string,
    userId?: string
  ): Promise<{ communities: CommunityResponse[]; total: number; hasMore: boolean }> {
    const skip = (page - 1) * limit;
    const where: Prisma.CommunityWhereInput = {
      isPublic: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [communities, total] = await Promise.all([
      this.prisma.community.findMany({
        where,
        skip,
        take: limit,
        orderBy: { members: { _count: 'desc' } },
        include: {
          createdBy: {
            select: { id: true, nombre: true, avatar: true },
          },
          _count: {
            select: { members: true, posts: true },
          },
          members: userId
            ? {
                where: { userId },
                select: { role: true },
              }
            : false,
        },
      }),
      this.prisma.community.count({ where }),
    ]);

    return {
      communities: communities.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        coverUrl: c.coverUrl,
        isPublic: c.isPublic,
        membersCount: c._count.members,
        postsCount: c._count.posts,
        createdAt: c.createdAt.toISOString(),
        createdBy: c.createdBy,
        isMember: userId ? c.members.length > 0 : undefined,
        memberRole: userId && c.members.length > 0 ? c.members[0].role : undefined,
      })),
      total,
      hasMore: skip + limit < total,
    };
  }

  // Get my communities
  async getMyCommunities(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ communities: CommunityResponse[]; total: number }> {
    const skip = (page - 1) * limit;

    const [memberships, total] = await Promise.all([
      this.prisma.communityMember.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { joinedAt: 'desc' },
        include: {
          community: {
            include: {
              createdBy: {
                select: { id: true, nombre: true, avatar: true },
              },
              _count: {
                select: { members: true, posts: true },
              },
            },
          },
        },
      }),
      this.prisma.communityMember.count({ where: { userId } }),
    ]);

    return {
      communities: memberships.map((m) => ({
        id: m.community.id,
        name: m.community.name,
        slug: m.community.slug,
        description: m.community.description,
        imageUrl: m.community.imageUrl,
        coverUrl: m.community.coverUrl,
        isPublic: m.community.isPublic,
        membersCount: m.community._count.members,
        postsCount: m.community._count.posts,
        createdAt: m.community.createdAt.toISOString(),
        createdBy: m.community.createdBy,
        isMember: true,
        memberRole: m.role,
      })),
      total,
    };
  }

  // Get single community
  async getCommunity(
    communityId: string,
    userId?: string
  ): Promise<CommunityResponse | null> {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: {
        createdBy: {
          select: { id: true, nombre: true, avatar: true },
        },
        _count: {
          select: { members: true, posts: true },
        },
        members: userId
          ? {
              where: { userId },
              select: { role: true },
            }
          : false,
      },
    });

    if (!community) return null;

    return {
      id: community.id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      imageUrl: community.imageUrl,
      coverUrl: community.coverUrl,
      isPublic: community.isPublic,
      membersCount: community._count.members,
      postsCount: community._count.posts,
      createdAt: community.createdAt.toISOString(),
      createdBy: community.createdBy,
      isMember: userId ? community.members.length > 0 : undefined,
      memberRole: userId && community.members.length > 0 ? community.members[0].role : undefined,
    };
  }

  // Get community by slug
  async getCommunityBySlug(
    slug: string,
    userId?: string
  ): Promise<CommunityResponse | null> {
    const community = await this.prisma.community.findUnique({
      where: { slug },
      include: {
        createdBy: {
          select: { id: true, nombre: true, avatar: true },
        },
        _count: {
          select: { members: true, posts: true },
        },
        members: userId
          ? {
              where: { userId },
              select: { role: true },
            }
          : false,
      },
    });

    if (!community) return null;

    return {
      id: community.id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      imageUrl: community.imageUrl,
      coverUrl: community.coverUrl,
      isPublic: community.isPublic,
      membersCount: community._count.members,
      postsCount: community._count.posts,
      createdAt: community.createdAt.toISOString(),
      createdBy: community.createdBy,
      isMember: userId ? community.members.length > 0 : undefined,
      memberRole: userId && community.members.length > 0 ? community.members[0].role : undefined,
    };
  }

  // Update community
  async updateCommunity(
    communityId: string,
    userId: string,
    data: UpdateCommunityInput
  ): Promise<CommunityResponse | null> {
    // Check if user is admin
    const membership = await this.prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId } },
    });

    if (!membership || membership.role !== 'ADMIN') {
      return null;
    }

    const community = await this.prisma.community.update({
      where: { id: communityId },
      data: {
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        imageUrl: data.imageUrl,
        coverUrl: data.coverUrl,
      },
      include: {
        createdBy: {
          select: { id: true, nombre: true, avatar: true },
        },
        _count: {
          select: { members: true, posts: true },
        },
      },
    });

    return {
      id: community.id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      imageUrl: community.imageUrl,
      coverUrl: community.coverUrl,
      isPublic: community.isPublic,
      membersCount: community._count.members,
      postsCount: community._count.posts,
      createdAt: community.createdAt.toISOString(),
      createdBy: community.createdBy,
      isMember: true,
      memberRole: 'ADMIN',
    };
  }

  // Join community - returns: { success: boolean, reason?: string }
  async joinCommunity(communityId: string, userId: string): Promise<{ success: boolean; reason?: string }> {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      return { success: false, reason: 'COMUNITY_NOT_FOUND' };
    }

    if (!community.isPublic) {
      return { success: false, reason: 'COMMUNITY_PRIVATE' };
    }

    // Check if already a member
    const existingMember = await this.prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId } },
    });

    if (existingMember) {
      return { success: false, reason: 'ALREADY_MEMBER' };
    }

    try {
      await this.prisma.communityMember.create({
        data: {
          userId,
          communityId,
          role: 'MEMBER',
        },
      });
      return { success: true };
    } catch {
      return { success: false, reason: 'ALREADY_MEMBER' };
    }
  }

  // Leave community
  async leaveCommunity(communityId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId } },
    });

    if (!membership) return false;

    // Don't allow the only admin to leave
    if (membership.role === 'ADMIN') {
      const adminCount = await this.prisma.communityMember.count({
        where: { communityId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return false;
      }
    }

    await this.prisma.communityMember.delete({
      where: { userId_communityId: { userId, communityId } },
    });

    return true;
  }

  // Get community posts
  async getCommunityPosts(
    communityId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ posts: CommunityPostResponse[]; total: number; hasMore: boolean }> {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where: { communityId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, nombre: true, avatar: true },
          },
        },
      }),
      this.prisma.communityPost.count({ where: { communityId } }),
    ]);

    return {
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        imageUrl: p.imageUrl,
        createdAt: p.createdAt.toISOString(),
        author: p.author,
      })),
      total,
      hasMore: skip + limit < total,
    };
  }

  // Create post
  async createPost(
    communityId: string,
    userId: string,
    data: CreatePostInput
  ): Promise<CommunityPostResponse | null> {
    // Check if user is a member
    const membership = await this.prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId } },
    });

    if (!membership) return null;

    const post = await this.prisma.communityPost.create({
      data: {
        communityId,
        authorId: userId,
        content: data.content,
        imageUrl: data.imageUrl,
      },
      include: {
        author: {
          select: { id: true, nombre: true, avatar: true },
        },
      },
    });

    return {
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt.toISOString(),
      author: post.author,
    };
  }

  // Delete post
  async deletePost(
    postId: string,
    userId: string
  ): Promise<boolean> {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        community: {
          include: {
            members: {
              where: { userId },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!post) return false;

    // Allow deletion by author or community admin/moderator
    const isAuthor = post.authorId === userId;
    const membership = post.community.members[0];
    const isModerator = membership && (membership.role === 'ADMIN' || membership.role === 'MODERATOR');

    if (!isAuthor && !isModerator) {
      return false;
    }

    await this.prisma.communityPost.delete({
      where: { id: postId },
    });

    return true;
  }

  // Get post comments
  async getPostComments(postId: string) {
    const comments = await this.prisma.communityPostComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, nombre: true, avatar: true },
        },
      },
    });

    return comments.map(c => ({
      id: c.id,
      content: c.content,
      imageUrl: c.imageUrl,
      createdAt: c.createdAt.toISOString(),
      author: c.author,
    }));
  }

  // Create post comment
  async createPostComment(
    postId: string,
    authorId: string,
    content: string,
    imageUrl?: string | null
  ) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) return null;

    const comment = await this.prisma.communityPostComment.create({
      data: {
        postId,
        authorId,
        content,
        imageUrl,
      },
      include: {
        author: {
          select: { id: true, nombre: true, avatar: true },
        },
      },
    });

    return {
      id: comment.id,
      content: comment.content,
      imageUrl: comment.imageUrl,
      createdAt: comment.createdAt.toISOString(),
      author: comment.author,
    };
  }

  // Delete post comment
  async deletePostComment(commentId: string, userId: string): Promise<boolean> {
    const comment = await this.prisma.communityPostComment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: {
            community: {
              include: {
                members: {
                  where: { userId },
                  select: { role: true },
                },
              },
            },
          },
        },
      },
    });

    if (!comment) return false;

    const isAuthor = comment.authorId === userId;
    const membership = comment.post.community.members[0];
    const isModerator = membership && (membership.role === 'ADMIN' || membership.role === 'MODERATOR');

    if (!isAuthor && !isModerator) {
      return false;
    }

    await this.prisma.communityPostComment.delete({
      where: { id: commentId },
    });

    return true;
  }
}
