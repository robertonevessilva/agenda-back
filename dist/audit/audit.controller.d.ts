import type { JwtPayload } from '../common/types/jwt-payload.type';
import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    listMine(user: JwtPayload): import("@prisma/client").Prisma.PrismaPromise<{
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
    clearMine(user: JwtPayload): Promise<{
        deletedCount: number;
    }>;
    clearOneMine(user: JwtPayload, id: string): Promise<{
        deleted: boolean;
    }>;
}
