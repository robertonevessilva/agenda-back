import { RemindersService } from './reminders.service';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
export declare class RemindersController {
    private readonly remindersService;
    constructor(remindersService: RemindersService);
    create(user: JwtPayload, dto: CreateReminderDto): Promise<{
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
    findAll(user: JwtPayload): import("@prisma/client").Prisma.PrismaPromise<{
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
    update(user: JwtPayload, id: string, dto: UpdateReminderDto): Promise<{
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
    remove(user: JwtPayload, id: string): Promise<{
        deleted: boolean;
    }>;
}
