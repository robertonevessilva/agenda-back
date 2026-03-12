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
exports.RemindersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let RemindersService = class RemindersService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async create(userId, dto) {
        const reminder = await this.prisma.reminder.create({
            data: {
                title: dto.title,
                notes: dto.notes,
                remindAt: new Date(dto.remindAt),
                priority: dto.priority,
                whatsappReminderSentAt: null,
                whatsappReminderError: null,
                userId,
            },
        });
        await this.auditService.log({
            actorUserId: userId,
            targetUserId: userId,
            operation: 'CREATE',
            entity: 'REMINDER',
            entityId: reminder.id,
            description: `Lembrete criado: ${reminder.title}. Data: ${new Date(dto.remindAt).toLocaleString('pt-BR')}.`,
            metadata: {
                priority: dto.priority,
                remindAt: dto.remindAt,
            },
        });
        return reminder;
    }
    findAll(userId) {
        return this.prisma.reminder.findMany({
            where: { userId },
            orderBy: [{ done: 'asc' }, { remindAt: 'asc' }],
        });
    }
    async update(userId, id, dto) {
        const before = await this.ensureBelongsToUser(userId, id);
        const reminder = await this.prisma.reminder.update({
            where: { id },
            data: {
                title: dto.title,
                notes: dto.notes,
                remindAt: dto.remindAt ? new Date(dto.remindAt) : undefined,
                priority: dto.priority,
                done: dto.done,
                whatsappReminderSentAt: dto.remindAt ? null : undefined,
                whatsappReminderError: dto.remindAt ? null : undefined,
            },
        });
        await this.auditService.log({
            actorUserId: userId,
            targetUserId: userId,
            operation: 'UPDATE',
            entity: 'REMINDER',
            entityId: reminder.id,
            description: this.buildUpdateDescription(before, reminder),
            metadata: this.buildUpdateMetadata(before, reminder),
        });
        return reminder;
    }
    buildUpdateMetadata(before, after) {
        const beforeData = {
            title: before.title,
            notes: before.notes,
            remindAt: before.remindAt.toISOString(),
            priority: before.priority,
            done: before.done,
        };
        const afterData = {
            title: after.title,
            notes: after.notes,
            remindAt: after.remindAt.toISOString(),
            priority: after.priority,
            done: after.done,
        };
        const changedFields = Object.keys(beforeData).filter((field) => {
            const key = field;
            return beforeData[key] !== afterData[key];
        });
        return {
            changedFields,
            before: beforeData,
            after: afterData,
        };
    }
    buildUpdateDescription(before, after) {
        const metadata = this.buildUpdateMetadata(before, after);
        if (metadata.changedFields.length === 0) {
            return `Lembrete alterado: ${after.title}. Nenhum campo mudou.`;
        }
        const details = metadata.changedFields
            .map((field) => {
            const key = field;
            return `${field}: ${String(metadata.before[key] ?? '-')} -> ${String(metadata.after[key] ?? '-')}`;
        })
            .join('; ');
        return `Lembrete alterado: ${after.title}. Campos alterados: ${details}.`;
    }
    async remove(userId, id) {
        const reminder = await this.ensureBelongsToUser(userId, id);
        await this.prisma.reminder.delete({ where: { id } });
        await this.auditService.log({
            actorUserId: userId,
            targetUserId: userId,
            operation: 'DELETE',
            entity: 'REMINDER',
            entityId: reminder.id,
            description: `Lembrete removido: ${reminder.title}`,
        });
        return { deleted: true };
    }
    async ensureBelongsToUser(userId, id) {
        const reminder = await this.prisma.reminder.findFirst({ where: { id, userId } });
        if (!reminder) {
            throw new common_1.NotFoundException('Lembrete não encontrado.');
        }
        return reminder;
    }
};
exports.RemindersService = RemindersService;
exports.RemindersService = RemindersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], RemindersService);
//# sourceMappingURL=reminders.service.js.map