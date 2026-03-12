import { PrismaService } from '../prisma/prisma.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { AuditService } from '../audit/audit.service';
export declare class RemindersService {
    private readonly prisma;
    private readonly auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    create(userId: string, dto: CreateReminderDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        notes: string | null;
        remindAt: Date;
        priority: import("@prisma/client").$Enums.Priority;
        done: boolean;
        whatsappReminderSentAt: Date | null;
        whatsappReminderError: string | null;
    }>;
    findAll(userId: string): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        notes: string | null;
        remindAt: Date;
        priority: import("@prisma/client").$Enums.Priority;
        done: boolean;
        whatsappReminderSentAt: Date | null;
        whatsappReminderError: string | null;
    }[]>;
    update(userId: string, id: string, dto: UpdateReminderDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        notes: string | null;
        remindAt: Date;
        priority: import("@prisma/client").$Enums.Priority;
        done: boolean;
        whatsappReminderSentAt: Date | null;
        whatsappReminderError: string | null;
    }>;
    private buildUpdateMetadata;
    private buildUpdateDescription;
    remove(userId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    private ensureBelongsToUser;
}
