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
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let AppointmentsService = class AppointmentsService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async create(userId, dto) {
        const appointment = await this.prisma.appointment.create({
            data: {
                title: dto.title,
                location: dto.location,
                notes: dto.notes,
                startsAt: new Date(dto.startsAt),
                endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
                whatsappReminderSentAt: null,
                whatsappReminderError: null,
                userId,
            },
        });
        await this.auditService.log({
            actorUserId: userId,
            targetUserId: userId,
            operation: 'CREATE',
            entity: 'APPOINTMENT',
            entityId: appointment.id,
            description: `Compromisso criado: ${appointment.title}. Data: ${new Date(dto.startsAt).toLocaleString('pt-BR')}.`,
            metadata: {
                startsAt: dto.startsAt,
                endsAt: dto.endsAt ?? null,
            },
        });
        return appointment;
    }
    findAll(userId) {
        return this.prisma.appointment.findMany({
            where: { userId },
            orderBy: [{ done: 'asc' }, { startsAt: 'asc' }],
        });
    }
    async update(userId, id, dto) {
        const before = await this.ensureBelongsToUser(userId, id);
        const appointment = await this.prisma.appointment.update({
            where: { id },
            data: {
                title: dto.title,
                location: dto.location,
                notes: dto.notes,
                startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
                endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
                done: dto.done,
                whatsappReminderSentAt: dto.startsAt ? null : undefined,
                whatsappReminderError: dto.startsAt ? null : undefined,
            },
        });
        await this.auditService.log({
            actorUserId: userId,
            targetUserId: userId,
            operation: 'UPDATE',
            entity: 'APPOINTMENT',
            entityId: appointment.id,
            description: this.buildUpdateDescription(before, appointment),
            metadata: this.buildUpdateMetadata(before, appointment),
        });
        return appointment;
    }
    buildUpdateMetadata(before, after) {
        const beforeData = {
            title: before.title,
            location: before.location,
            notes: before.notes,
            startsAt: before.startsAt.toISOString(),
            endsAt: before.endsAt ? before.endsAt.toISOString() : null,
            done: before.done,
        };
        const afterData = {
            title: after.title,
            location: after.location,
            notes: after.notes,
            startsAt: after.startsAt.toISOString(),
            endsAt: after.endsAt ? after.endsAt.toISOString() : null,
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
            return `Compromisso alterado: ${after.title}. Nenhum campo mudou.`;
        }
        const details = metadata.changedFields
            .map((field) => {
            const key = field;
            return `${field}: ${String(metadata.before[key] ?? '-')} -> ${String(metadata.after[key] ?? '-')}`;
        })
            .join('; ');
        return `Compromisso alterado: ${after.title}. Campos alterados: ${details}.`;
    }
    async remove(userId, id) {
        const appointment = await this.ensureBelongsToUser(userId, id);
        await this.prisma.appointment.delete({ where: { id } });
        await this.auditService.log({
            actorUserId: userId,
            targetUserId: userId,
            operation: 'DELETE',
            entity: 'APPOINTMENT',
            entityId: appointment.id,
            description: `Compromisso removido: ${appointment.title}`,
        });
        return { deleted: true };
    }
    async ensureBelongsToUser(userId, id) {
        const appointment = await this.prisma.appointment.findFirst({
            where: { id, userId },
        });
        if (!appointment) {
            throw new common_1.NotFoundException('Compromisso não encontrado.');
        }
        return appointment;
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AppointmentsService);
//# sourceMappingURL=appointments.service.js.map