import { UserRole } from '@prisma/client';
export declare class CreateUserByAdminDto {
    email: string;
    password: string;
    adminPassword: string;
    name?: string;
    timezone?: string;
    role?: UserRole;
    whatsappPhone?: string;
    whatsappOptIn?: boolean;
}
