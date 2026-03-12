import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
export declare class AppointmentsWhatsappNotifierService implements OnModuleInit, OnModuleDestroy {
    private readonly prisma;
    private readonly configService;
    private readonly auditService;
    private readonly logger;
    private timer;
    private running;
    constructor(prisma: PrismaService, configService: ConfigService, auditService: AuditService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private processUpcomingItems;
    private processUpcomingReminders;
    private processUpcomingAppointments;
    private buildReminderMessage;
    private buildMessage;
    private sendWhatsappMessage;
    private getNumberEnv;
}
