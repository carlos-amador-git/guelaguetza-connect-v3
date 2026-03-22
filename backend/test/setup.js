import { beforeAll, afterAll, afterEach, vi } from 'vitest';
// Mock de Prisma Client
export const prismaMock = {
    user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    story: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    transport: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    message: {
        findMany: vi.fn(),
        create: vi.fn(),
    },
    event: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    booking: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    experience: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    experienceTimeSlot: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    experienceReview: {
        findUnique: vi.fn(),
        create: vi.fn(),
        aggregate: vi.fn(),
    },
    product: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    cart: {
        findUnique: vi.fn(),
        create: vi.fn(),
    },
    cartItem: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
    },
    order: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
    },
    sellerProfile: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    productReview: {
        findUnique: vi.fn(),
        create: vi.fn(),
        aggregate: vi.fn(),
    },
    activityLog: {
        groupBy: vi.fn(),
    },
    community: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    like: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    comment: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    badge: {
        findMany: vi.fn(),
        create: vi.fn(),
    },
    userBadge: {
        findMany: vi.fn(),
        create: vi.fn(),
    },
    notification: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
};
// Mock del módulo @prisma/client
vi.mock('@prisma/client', async () => {
    const actual = await vi.importActual('@prisma/client');
    return {
        ...actual,
        PrismaClient: class {
            constructor() {
                return prismaMock;
            }
        },
    };
});
// Reset de mocks después de cada test
afterEach(() => {
    vi.clearAllMocks();
});
// Setup global
beforeAll(async () => {
    // Configuración inicial si es necesaria
});
// Cleanup global
afterAll(async () => {
    // Limpieza si es necesaria
});
//# sourceMappingURL=setup.js.map