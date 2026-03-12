import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AppointmentsWhatsappNotifierService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppointmentsWhatsappNotifierService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit() {
    const intervalMs = this.getNumberEnv('WHATSAPP_SCAN_INTERVAL_MS', 60_000);
    this.timer = setInterval(() => {
      void this.processUpcomingItems();
    }, intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async processUpcomingItems() {
    if (this.running) return;
    this.running = true;

    try {
      await this.processUpcomingReminders();
      await this.processUpcomingAppointments();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`Erro no processamento de lembretes WhatsApp: ${message}`);
    } finally {
      this.running = false;
    }
  }

  private async processUpcomingReminders() {
    const now = new Date();
    const leadMinutes = this.getNumberEnv('WHATSAPP_REMINDER_LEAD_MINUTES', 30);
    const until = new Date(now.getTime() + leadMinutes * 60 * 1000);

    const reminders = await this.prisma.reminder.findMany({
      where: {
        done: false,
        whatsappReminderSentAt: null,
        remindAt: {
          gte: now,
          lte: until,
        },
        user: {
          whatsappOptIn: true,
          whatsappPhone: {
            not: null,
          },
        },
      },
      select: {
        id: true,
        title: true,
        remindAt: true,
        notes: true,
        priority: true,
        userId: true,
        user: {
          select: {
            whatsappPhone: true,
            name: true,
          },
        },
      },
    });

    for (const reminder of reminders) {
      const to = reminder.user.whatsappPhone;
      if (!to) continue;

      const message = this.buildReminderMessage({
        title: reminder.title,
        remindAt: reminder.remindAt,
        notes: reminder.notes,
        priority: reminder.priority,
        name: reminder.user.name,
      });

      const sendResult = await this.sendWhatsappMessage(to, message);
      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          whatsappReminderSentAt: new Date(),
          whatsappReminderError: sendResult.ok ? null : sendResult.error,
        },
      });

      await this.auditService.log({
        actorUserId: reminder.userId,
        targetUserId: reminder.userId,
        operation: sendResult.ok ? 'WHATSAPP_SENT' : 'WHATSAPP_ERROR',
        entity: 'REMINDER',
        entityId: reminder.id,
        description: sendResult.ok
          ? `Lembrete WhatsApp enviado para lembrete: ${reminder.title}.`
          : `Falha ao enviar WhatsApp do lembrete: ${reminder.title}. Erro: ${sendResult.error}`,
        metadata: {
          phone: to,
          remindAt: reminder.remindAt.toISOString(),
        },
      });
    }
  }

  private async processUpcomingAppointments() {
    try {
      const now = new Date();
      const leadMinutes = this.getNumberEnv('WHATSAPP_APPOINTMENT_LEAD_MINUTES', 30);
      const until = new Date(now.getTime() + leadMinutes * 60 * 1000);

      const appointments = await this.prisma.appointment.findMany({
        where: {
          done: false,
          whatsappReminderSentAt: null,
          startsAt: {
            gte: now,
            lte: until,
          },
          user: {
            whatsappOptIn: true,
            whatsappPhone: {
              not: null,
            },
          },
        },
        select: {
          id: true,
          title: true,
          startsAt: true,
          location: true,
          userId: true,
          user: {
            select: {
              whatsappPhone: true,
              name: true,
              email: true,
            },
          },
        },
      });

      for (const appointment of appointments) {
        const to = appointment.user.whatsappPhone;
        if (!to) continue;

        const message = this.buildMessage({
          title: appointment.title,
          startsAt: appointment.startsAt,
          location: appointment.location,
          name: appointment.user.name,
        });

        const sendResult = await this.sendWhatsappMessage(to, message);
        await this.prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            whatsappReminderSentAt: new Date(),
            whatsappReminderError: sendResult.ok ? null : sendResult.error,
          },
        });

        await this.auditService.log({
          actorUserId: appointment.userId,
          targetUserId: appointment.userId,
          operation: sendResult.ok ? 'WHATSAPP_SENT' : 'WHATSAPP_ERROR',
          entity: 'APPOINTMENT',
          entityId: appointment.id,
          description: sendResult.ok
            ? `Lembrete WhatsApp enviado para compromisso: ${appointment.title}.`
            : `Falha ao enviar WhatsApp do compromisso: ${appointment.title}. Erro: ${sendResult.error}`,
          metadata: {
            phone: to,
            startsAt: appointment.startsAt.toISOString(),
          },
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`Erro no processamento de compromissos WhatsApp: ${message}`);
    }
  }

  private buildReminderMessage(input: {
    title: string;
    remindAt: Date;
    notes: string | null;
    priority: string;
    name: string | null;
  }) {
    const dateText = input.remindAt.toLocaleString('pt-BR');
    const greeting = input.name ? `Olá, ${input.name}` : 'Olá';
    const notesPart = input.notes ? `\nNotas: ${input.notes}` : '';
    return `${greeting}! Lembrete:\n${input.title}\nQuando: ${dateText}\nPrioridade: ${input.priority}${notesPart}`;
  }

  private buildMessage(input: {
    title: string;
    startsAt: Date;
    location: string | null;
    name: string | null;
  }) {
    const dateText = input.startsAt.toLocaleString('pt-BR');
    const greeting = input.name ? `Olá, ${input.name}` : 'Olá';
    const locationPart = input.location ? `\nLocal: ${input.location}` : '';
    return `${greeting}! Lembrete de compromisso:\n${input.title}\nQuando: ${dateText}${locationPart}`;
  }

  private async sendWhatsappMessage(to: string, body: string) {
    const provider = this.configService.get<string>('WHATSAPP_PROVIDER', 'mock').toLowerCase();
    if (provider === 'mock') {
      this.logger.log(`[MOCK] WhatsApp para ${to}: ${body}`);
      return { ok: true as const };
    }

    if (provider !== 'meta') {
      return { ok: false as const, error: `Provider inválido: ${provider}` };
    }

    const token = this.configService.get<string>('WHATSAPP_META_TOKEN');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_META_PHONE_NUMBER_ID');
    const apiVersion = this.configService.get<string>('WHATSAPP_META_API_VERSION', 'v20.0');

    if (!token || !phoneNumberId) {
      return { ok: false as const, error: 'Configuração da Meta API incompleta.' };
    }

    try {
      const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body },
        }),
      });

      if (!response.ok) {
        const raw = await response.text();
        return { ok: false as const, error: `HTTP ${response.status}: ${raw.slice(0, 300)}` };
      }

      return { ok: true as const };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : 'Erro de rede no envio WhatsApp.',
      };
    }
  }

  private getNumberEnv(key: string, defaultValue: number) {
    const raw = this.configService.get<string>(key);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
  }
}
