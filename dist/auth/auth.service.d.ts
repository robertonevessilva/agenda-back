import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';
import { UpdateWhatsappSettingsDto } from './dto/update-whatsapp-settings.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    private readonly auditService;
    private readonly logger;
    private readonly loginAttempts;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService, auditService: AuditService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            whatsappPhone: string | null;
            whatsappOptIn: boolean;
        };
    }>;
    login(dto: LoginDto, clientKey?: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            whatsappPhone: string | null;
            whatsappOptIn: boolean;
        };
    }>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    updateWhatsappSettings(userId: string, dto: UpdateWhatsappSettingsDto): Promise<{
        user: {
            email: string;
            name: string | null;
            whatsappPhone: string | null;
            whatsappOptIn: boolean;
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
        };
    }>;
    listUsersByAdmin(adminUserId: string): Promise<{
        email: string;
        name: string | null;
        timezone: string;
        whatsappPhone: string | null;
        whatsappOptIn: boolean;
        role: import("@prisma/client").$Enums.UserRole;
        id: string;
        createdAt: Date;
    }[]>;
    createUserByAdmin(adminUserId: string, dto: CreateUserByAdminDto): Promise<{
        message: string;
        user: {
            email: string;
            name: string | null;
            timezone: string;
            whatsappPhone: string | null;
            whatsappOptIn: boolean;
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
        };
    }>;
    updateUserRoleByAdmin(adminUserId: string, targetUserId: string, role: UserRole): Promise<{
        message: string;
        user: {
            email: string;
            name: string | null;
            timezone: string;
            whatsappPhone: string | null;
            whatsappOptIn: boolean;
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
        };
    }>;
    logout(userId: string): Promise<void>;
    getUserProfile(userId: string): Promise<{
        user: {
            email: string;
            name: string | null;
            whatsappPhone: string | null;
            whatsappOptIn: boolean;
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
        };
    }>;
    private validateCaptcha;
    private ensureAdmin;
    private ensureNotRateLimited;
    private registerFailedAttempt;
    private clearFailedAttempts;
    private buildAuthResponse;
    private hashToken;
    private sendPasswordResetEmail;
}
