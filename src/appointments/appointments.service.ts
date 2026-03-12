import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateAppointmentDto) {
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

  findAll(userId: string) {
    return this.prisma.appointment.findMany({
      where: { userId },
      orderBy: [{ done: 'asc' }, { startsAt: 'asc' }],
    });
  }

  async update(userId: string, id: string, dto: UpdateAppointmentDto) {
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

  private buildUpdateMetadata(
    before: {
      title: string;
      location: string | null;
      notes: string | null;
      startsAt: Date;
      endsAt: Date | null;
      done: boolean;
    },
    after: {
      title: string;
      location: string | null;
      notes: string | null;
      startsAt: Date;
      endsAt: Date | null;
      done: boolean;
    },
  ) {
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
      location: string | null;
      notes: string | null;
      startsAt: Date;
      endsAt: Date | null;
      done: boolean;
    },
    after: {
      title: string;
      location: string | null;
      notes: string | null;
      startsAt: Date;
      endsAt: Date | null;
      done: boolean;
    },
  ) {
    const metadata = this.buildUpdateMetadata(before, after);
    if (metadata.changedFields.length === 0) {
      return `Compromisso alterado: ${after.title}. Nenhum campo mudou.`;
    }

    const details = metadata.changedFields
      .map((field) => {
        const key = field as keyof typeof metadata.before;
        return `${field}: ${String(metadata.before[key] ?? '-')} -> ${String(metadata.after[key] ?? '-')}`;
      })
      .join('; ');

    return `Compromisso alterado: ${after.title}. Campos alterados: ${details}.`;
  }

  async remove(userId: string, id: string) {
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

  private async ensureBelongsToUser(userId: string, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, userId },
    });
    if (!appointment) {
      throw new NotFoundException('Compromisso não encontrado.');
    }
    return appointment;
  }
}
