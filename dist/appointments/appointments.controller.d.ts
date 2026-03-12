import { AppointmentsService } from './appointments.service';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
export declare class AppointmentsController {
    private readonly appointmentsService;
    constructor(appointmentsService: AppointmentsService);
    create(user: JwtPayload, dto: CreateAppointmentDto): Promise<{
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
    findAll(user: JwtPayload): import("@prisma/client").Prisma.PrismaPromise<{
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
    update(user: JwtPayload, id: string, dto: UpdateAppointmentDto): Promise<{
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
    remove(user: JwtPayload, id: string): Promise<{
        deleted: boolean;
    }>;
}
