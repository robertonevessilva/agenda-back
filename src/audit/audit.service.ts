import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          operation: input.operation,
          entity: input.entity,
          entityId: input.entityId,
          description: input.description,
          metadata: input.metadata as object | undefined,
          targetUserId: input.targetUserId,
        },
      });
    } catch {
      // Auditoria não deve quebrar a operação principal.
    }
  }

  listForUser(userId: string) {
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

  async clearForUser(userId: string) {
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        OR: [{ actorUserId: userId }, { targetUserId: userId }],
      },
    });

    return {
      deletedCount: result.count,
    };
  }

  async clearOneForUser(userId: string, logId: string) {
    const log = await this.prisma.auditLog.findFirst({
      where: {
        id: logId,
        OR: [{ actorUserId: userId }, { targetUserId: userId }],
      },
      select: { id: true },
    });

    if (!log) {
      throw new NotFoundException('Registro de histórico não encontrado.');
    }

    await this.prisma.auditLog.delete({ where: { id: logId } });
    return { deleted: true };
  }
}
