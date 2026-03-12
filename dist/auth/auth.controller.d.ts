import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateWhatsappSettingsDto } from './dto/update-whatsapp-settings.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { JwtPayload } from '../common/types/jwt-payload.type';
export declare class AuthController {
    private readonly authService;
    private readonly configService;
    constructor(authService: AuthService, configService: ConfigService);
    register(res: Response, dto: RegisterDto): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            whatsappPhone: string | null;
            whatsappOptIn: boolean;
        };
    }>;
    login(req: Request, res: Response, dto: LoginDto): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            whatsappPhone: string | null;
            whatsappOptIn: boolean;
        };
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    me(user: JwtPayload): Promise<{
        user: {
            email: string;
            name: string | null;
            whatsappPhone: string | null;
            whatsappOptIn: boolean;
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
        };
    }>;
    logout(user: JwtPayload, res: Response): Promise<{
        message: string;
    }>;
    changePassword(user: JwtPayload, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    updateWhatsappSettings(user: JwtPayload, dto: UpdateWhatsappSettingsDto): Promise<{
        user: {
            email: string;
            name: string | null;
            whatsappPhone: string | null;
            whatsappOptIn: boolean;
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
        };
    }>;
    listUsers(user: JwtPayload): Promise<{
        email: string;
        name: string | null;
        timezone: string;
        whatsappPhone: string | null;
        whatsappOptIn: boolean;
        role: import("@prisma/client").$Enums.UserRole;
        id: string;
        createdAt: Date;
    }[]>;
    createUser(user: JwtPayload, dto: CreateUserByAdminDto): Promise<{
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
    updateUserRole(user: JwtPayload, targetUserId: string, dto: UpdateUserRoleDto): Promise<{
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
    private setAuthCookie;
    private clearAuthCookie;
    private getCookieName;
    private isSecureCookie;
    private getCookieMaxAgeMs;
}
