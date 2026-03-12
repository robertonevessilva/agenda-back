"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AuditService = class AuditService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(input) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    actorUserId: input.actorUserId,
                    operation: input.operation,
                    entity: input.entity,
                    entityId: input.entityId,
                    description: input.description,
                    metadata: input.metadata,
                    targetUserId: input.targetUserId,
                },
            });
        }
        catch {
        }
    }
    listForUser(userId) {
        return this.prisma.auditLog.findMany({
            where: {
                OR: [{ actorUserId: userId }, { targetUserId: userId }],
            },
            orderBy: { createdAt: 'desc' },
            take: 300,
            select: {
                id: true,
                operation: true,
                entity: true,
                entityId: true,
                description: true,
                metadata: true,
                actorUserId: true,
                targetUserId: true,
                createdAt: true,
            },
        });
    }
    async clearForUser(userId) {
        const result = await this.prisma.auditLog.deleteMany({
            where: {
                OR: [{ actorUserId: userId }, { targetUserId: userId }],
            },
        });
        return {
            deletedCount: result.count,
        };
    }
    async clearOneForUser(userId, logId) {
        const log = await this.prisma.auditLog.findFirst({
            where: {
                id: logId,
                OR: [{ actorUserId: userId }, { targetUserId: userId }],
            },
            select: { id: true },
        });
        if (!log) {
            throw new common_1.NotFoundException('Registro de histórico não encontrado.');
        }
        await this.prisma.auditLog.delete({ where: { id: logId } });
        return { deleted: true };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map