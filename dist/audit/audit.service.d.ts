import { PrismaService } from '../prisma/prisma.service';
export type AuditLogInput = {
    actorUserId: string;
    operation: string;
    entity: string;
    entityId?: string;
    description?: string;
    metadata?: unknown;
    targetUserId?: string;
};
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(input: AuditLogInput): Promise<void>;
    listForUser(userId: string): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        operation: string;
        entity: string;
        entityId: string | null;
        description: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        targetUserId: string | null;
        createdAt: Date;
        actorUserId: string;
    }[]>;
    clearForUser(userId: string): Promise<{
        deletedCount: number;
    }>;
    clearOneForUser(userId: string, logId: string): Promise<{
        deleted: boolean;
    }>;
}
