import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AuditService } from '../audit/audit.service';
export declare class AppointmentsService {
    private readonly prisma;
    private readonly auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    create(userId: string, dto: CreateAppointmentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        notes: string | null;
        done: boolean;
        whatsappReminderSentAt: Date | null;
        whatsappReminderError: string | null;
        location: string | null;
        startsAt: Date;
        endsAt: Date | null;
    }>;
    findAll(userId: string): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        notes: string | null;
        done: boolean;
        whatsappReminderSentAt: Date | null;
        whatsappReminderError: string | null;
        location: string | null;
        startsAt: Date;
        endsAt: Date | null;
    }[]>;
    update(userId: string, id: string, dto: UpdateAppointmentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        notes: string | null;
        done: boolean;
        whatsappReminderSentAt: Date | null;
        whatsappReminderError: string | null;
        location: string | null;
        startsAt: Date;
        endsAt: Date | null;
    }>;
    private buildUpdateMetadata;
    private buildUpdateDescription;
    remove(userId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    private ensureBelongsToUser;
}
