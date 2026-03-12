import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateReminderDto) {
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

  findAll(userId: string) {
    return this.prisma.reminder.findMany({
      where: { userId },
      orderBy: [{ done: 'asc' }, { remindAt: 'asc' }],
    });
  }

  async update(userId: string, id: string, dto: UpdateReminderDto) {
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

  private buildUpdateMetadata(
    before: {
      title: string;
      notes: string | null;
      remindAt: Date;
      priority: string;
      done: boolean;
    },
    after: {
      title: string;
      notes: string | null;
      remindAt: Date;
      priority: string;
      done: boolean;
    },
  ) {
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
      const key = field as keyof typeof beforeData;
      return beforeData[key] !== afterData[key];
    });

    return {
      changedFields,
      before: beforeData,
      after: afterData,
    };
  }

  private buildUpdateDescription(
    before: {
      title: string;
      notes: string | null;
      remindAt: Date;
      priority: string;
      done: boolean;
    },
    after: {
      title: string;
      notes: string | null;
      remindAt: Date;
      priority: string;
      done: boolean;
    },
  ) {
    const metadata = this.buildUpdateMetadata(before, after);
    if (metadata.changedFields.length === 0) {
      return `Lembrete alterado: ${after.title}. Nenhum campo mudou.`;
    }

    const details = metadata.changedFields
      .map((field) => {
        const key = field as keyof typeof metadata.before;
        return `${field}: ${String(metadata.before[key] ?? '-')} -> ${String(metadata.after[key] ?? '-')}`;
      })
      .join('; ');

    return `Lembrete alterado: ${after.title}. Campos alterados: ${details}.`;
  }

  async remove(userId: string, id: string) {
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

  private async ensureBelongsToUser(userId: string, id: string) {
    const reminder = await this.prisma.reminder.findFirst({ where: { id, userId } });
    if (!reminder) {
      throw new NotFoundException('Lembrete não encontrado.');
    }
    return reminder;
  }
}
