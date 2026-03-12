"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const nodemailer_1 = __importDefault(require("nodemailer"));
const audit_service_1 = require("../audit/audit.service");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwtService;
    configService;
    auditService;
    logger = new common_1.Logger(AuthService_1.name);
    loginAttempts = new Map();
    constructor(prisma, jwtService, configService, auditService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.auditService = auditService;
    }
    async register(dto) {
        const usersCount = await this.prisma.user.count();
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (existing) {
            throw new common_1.BadRequestException('Email já cadastrado.');
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                passwordHash,
                role: usersCount === 0 ? client_1.UserRole.ADMIN : client_1.UserRole.USER,
                name: dto.name,
                timezone: dto.timezone,
                whatsappPhone: dto.whatsappPhone,
                whatsappOptIn: Boolean(dto.whatsappOptIn && dto.whatsappPhone),
            },
        });
        await this.auditService.log({
            actorUserId: user.id,
            targetUserId: user.id,
            operation: 'CREATE',
            entity: 'USER',
            entityId: user.id,
            description: usersCount === 0
                ? 'Primeiro usuário administrador cadastrado.'
                : 'Novo usuário cadastrado via tela pública.',
        });
        return this.buildAuthResponse(user.id, user.email, user.name, user.role, user.whatsappPhone, user.whatsappOptIn);
    }
    async login(dto, clientKey = dto.email.toLowerCase()) {
        this.ensureNotRateLimited(clientKey);
        await this.validateCaptcha(dto.captchaToken);
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (!user) {
            this.registerFailedAttempt(clientKey);
            throw new common_1.UnauthorizedException('Credenciais inválidas.');
        }
        const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordMatches) {
            this.registerFailedAttempt(clientKey);
            throw new common_1.UnauthorizedException('Credenciais inválidas.');
        }
        this.clearFailedAttempts(clientKey);
        await this.auditService.log({
            actorUserId: user.id,
            targetUserId: user.id,
            operation: 'LOGIN',
            entity: 'AUTH',
            entityId: user.id,
            description: 'Login realizado com sucesso.',
        });
        return this.buildAuthResponse(user.id, user.email, user.name, user.role, user.whatsappPhone, user.whatsappOptIn);
    }
    async changePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { passwordHash: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Usuário não encontrado.');
        }
        const currentMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!currentMatches) {
            throw new common_1.UnauthorizedException('Senha atual inválida.');
        }
        const samePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
        if (samePassword) {
            throw new common_1.BadRequestException('A nova senha deve ser diferente da atual.');
        }
        const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });
        await this.auditService.log({
            actorUserId: userId,
            targetUserId: userId,
            operation: 'PASSWORD_CHANGE',
            entity: 'USER',
            entityId: userId,
            description: 'Senha alterada. Campo alterado: password (valor protegido).',
            metadata: {
                changedFields: ['password'],
                before: { password: '[PROTECTED]' },
                after: { password: '[PROTECTED]' },
            },
        });
        return { message: 'Senha alterada com sucesso.' };
    }
    async forgotPassword(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
            select: { id: true, email: true, name: true },
        });
        if (!user) {
            return { message: 'Se o e-mail existir, você receberá instruções de recuperação.' };
        }
        const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const tokenHash = this.hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await this.prisma.passwordResetToken.create({
            data: {
                tokenHash,
                expiresAt,
                userId: user.id,
            },
        });
        await this.auditService.log({
            actorUserId: user.id,
            targetUserId: user.id,
            operation: 'FORGOT_PASSWORD',
            entity: 'AUTH',
            entityId: user.id,
            description: 'Solicitação de recuperação de senha recebida.',
        });
        await this.sendPasswordResetEmail(user.email, user.name, rawToken);
        return { message: 'Se o e-mail existir, você receberá instruções de recuperação.' };
    }
    async resetPassword(dto) {
        const tokenHash = this.hashToken(dto.token);
        const resetToken = await this.prisma.passwordResetToken.findUnique({
            where: { tokenHash },
            select: {
                userId: true,
                expiresAt: true,
                usedAt: true,
            },
        });
        if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Token de recuperação inválido ou expirado.');
        }
        const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
        await this.prisma.user.update({
            where: { id: resetToken.userId },
            data: { passwordHash: newPasswordHash },
        });
        await this.prisma.passwordResetToken.update({
            where: { tokenHash },
            data: { usedAt: new Date() },
        });
        await this.auditService.log({
            actorUserId: resetToken.userId,
            targetUserId: resetToken.userId,
            operation: 'PASSWORD_RESET',
            entity: 'AUTH',
            entityId: resetToken.userId,
            description: 'Senha redefinida por recuperação via e-mail.',
        });
        return { message: 'Senha redefinida com sucesso.' };
    }
    async updateWhatsappSettings(userId, dto) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                whatsappPhone: true,
                whatsappOptIn: true,
            },
        });
        if (!currentUser) {
            throw new common_1.UnauthorizedException('Usuário não encontrado.');
        }
        const nextPhone = dto.whatsappPhone !== undefined ? dto.whatsappPhone : currentUser.whatsappPhone;
        const nextOptIn = dto.whatsappOptIn !== undefined ? dto.whatsappOptIn : currentUser.whatsappOptIn;
        if (nextOptIn && !nextPhone) {
            throw new common_1.BadRequestException('Informe um telefone WhatsApp para ativar notificações.');
        }
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                whatsappPhone: nextPhone,
                whatsappOptIn: Boolean(nextOptIn && nextPhone),
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                whatsappPhone: true,
                whatsappOptIn: true,
            },
        });
        await this.auditService.log({
            actorUserId: userId,
            targetUserId: userId,
            operation: 'UPDATE',
            entity: 'WHATSAPP_SETTINGS',
            entityId: userId,
            description: `Configurações de WhatsApp atualizadas. Campos alterados: ` +
                `whatsappPhone: ${currentUser.whatsappPhone ?? '-'} -> ${user.whatsappPhone ?? '-'}; ` +
                `whatsappOptIn: ${currentUser.whatsappOptIn} -> ${user.whatsappOptIn}.`,
            metadata: {
                changedFields: ['whatsappPhone', 'whatsappOptIn'],
                before: {
                    whatsappPhone: currentUser.whatsappPhone,
                    whatsappOptIn: currentUser.whatsappOptIn,
                },
                after: {
                    whatsappPhone: user.whatsappPhone,
                    whatsappOptIn: user.whatsappOptIn,
                },
            },
        });
        return { user };
    }
    async listUsersByAdmin(adminUserId) {
        await this.ensureAdmin(adminUserId);
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                timezone: true,
                whatsappPhone: true,
                whatsappOptIn: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });
    }
    async createUserByAdmin(adminUserId, dto) {
        const admin = await this.ensureAdmin(adminUserId, true);
        const adminPasswordOk = await bcrypt.compare(dto.adminPassword, admin.passwordHash);
        if (!adminPasswordOk) {
            throw new common_1.UnauthorizedException('Senha do administrador inválida.');
        }
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (existing) {
            throw new common_1.BadRequestException('Email já cadastrado.');
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                passwordHash,
                role: dto.role ?? client_1.UserRole.USER,
                name: dto.name,
                timezone: dto.timezone,
                whatsappPhone: dto.whatsappPhone,
                whatsappOptIn: Boolean(dto.whatsappOptIn && dto.whatsappPhone),
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                timezone: true,
                whatsappPhone: true,
                whatsappOptIn: true,
            },
        });
        await this.auditService.log({
            actorUserId: adminUserId,
            targetUserId: user.id,
            operation: 'CREATE',
            entity: 'USER',
            entityId: user.id,
            description: `Usuário criado por administrador: ${user.email}`,
            metadata: { role: user.role },
        });
        return {
            message: 'Usuário criado com sucesso.',
            user,
        };
    }
    async updateUserRoleByAdmin(adminUserId, targetUserId, role) {
        await this.ensureAdmin(adminUserId);
        if (adminUserId === targetUserId && role !== client_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('Você não pode remover seu próprio status de administrador.');
        }
        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, role: true },
        });
        if (!targetUser) {
            throw new common_1.BadRequestException('Usuário não encontrado.');
        }
        const updated = await this.prisma.user.update({
            where: { id: targetUserId },
            data: { role },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                timezone: true,
                whatsappPhone: true,
                whatsappOptIn: true,
            },
        });
        await this.auditService.log({
            actorUserId: adminUserId,
            targetUserId,
            operation: 'ROLE_CHANGE',
            entity: 'USER',
            entityId: targetUserId,
            description: `Status de usuário alterado. Campo alterado: role: ${targetUser.role} -> ${role}.`,
            metadata: {
                changedFields: ['role'],
                before: { role: targetUser.role },
                after: { role },
            },
        });
        return {
            message: 'Status do usuário atualizado com sucesso.',
            user: updated,
        };
    }
    async logout(userId) {
        await this.auditService.log({
            actorUserId: userId,
            targetUserId: userId,
            operation: 'LOGOUT',
            entity: 'AUTH',
            entityId: userId,
            description: 'Logout realizado.',
        });
    }
    async getUserProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                whatsappPhone: true,
                whatsappOptIn: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Usuário não encontrado.');
        }
        return { user };
    }
    async validateCaptcha(captchaToken) {
        const recaptchaSecret = this.configService.get('RECAPTCHA_SECRET_KEY');
        if (!recaptchaSecret) {
            return;
        }
        if (!captchaToken) {
            throw new common_1.BadRequestException('Confirme o CAPTCHA.');
        }
        const verifyUrl = this.configService.get('RECAPTCHA_VERIFY_URL', 'https://www.google.com/recaptcha/api/siteverify');
        const body = new URLSearchParams({
            secret: recaptchaSecret,
            response: captchaToken,
        });
        try {
            const response = await fetch(verifyUrl, {
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                body,
            });
            if (!response.ok) {
                throw new common_1.BadRequestException('Falha ao validar CAPTCHA.');
            }
            const result = (await response.json());
            if (!result.success) {
                throw new common_1.BadRequestException('CAPTCHA inválido.');
            }
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Não foi possível validar o CAPTCHA.');
        }
    }
    async ensureAdmin(userId, includePasswordHash = false) {
        const admin = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                role: true,
                ...(includePasswordHash ? { passwordHash: true } : {}),
            },
        });
        if (!admin || admin.role !== client_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Acesso permitido apenas para administradores.');
        }
        return admin;
    }
    ensureNotRateLimited(clientKey) {
        const attempt = this.loginAttempts.get(clientKey);
        if (!attempt)
            return;
        if (attempt.blockedUntil > Date.now()) {
            throw new common_1.HttpException('Muitas tentativas de login. Tente novamente em alguns minutos.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        if (attempt.blockedUntil <= Date.now()) {
            this.loginAttempts.delete(clientKey);
        }
    }
    registerFailedAttempt(clientKey) {
        const now = Date.now();
        const current = this.loginAttempts.get(clientKey);
        const nextCount = (current?.count ?? 0) + 1;
        const blockedUntil = nextCount >= 5 ? now + 15 * 60 * 1000 : 0;
        this.loginAttempts.set(clientKey, { count: nextCount, blockedUntil });
    }
    clearFailedAttempts(clientKey) {
        this.loginAttempts.delete(clientKey);
    }
    buildAuthResponse(userId, email, name, role, whatsappPhone, whatsappOptIn) {
        const payload = { sub: userId, email };
        return {
            accessToken: this.jwtService.sign(payload),
            user: {
                id: userId,
                email,
                name,
                role,
                whatsappPhone,
                whatsappOptIn,
            },
        };
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    async sendPasswordResetEmail(email, name, token) {
        const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:9000');
        const resetUrl = `${frontendUrl}/#/reset-password?token=${encodeURIComponent(token)}`;
        const smtpHost = this.configService.get('EMAIL_SMTP_HOST', '').trim();
        const smtpPortRaw = this.configService.get('EMAIL_SMTP_PORT', '587');
        const smtpUser = this.configService.get('EMAIL_SMTP_USER', '').trim();
        const smtpPass = this.configService.get('EMAIL_SMTP_PASS', '').trim();
        const smtpFrom = this.configService.get('EMAIL_FROM', '').trim();
        const smtpSecureRaw = this.configService.get('EMAIL_SMTP_SECURE', '').trim().toLowerCase();
        const webhook = this.configService.get('EMAIL_WEBHOOK_URL');
        const textMessage = `Olá${name ? `, ${name}` : ''}! Use este link para redefinir sua senha: ${resetUrl}`;
        const htmlMessage = `<p>Olá${name ? `, ${name}` : ''}!</p><p>Use este link para redefinir sua senha:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Se você não solicitou, ignore este e-mail.</p>`;
        const smtpPort = Number(smtpPortRaw);
        const smtpSecure = smtpSecureRaw ? smtpSecureRaw === 'true' : smtpPort === 465;
        if (smtpHost && smtpUser && smtpPass && smtpFrom && Number.isFinite(smtpPort)) {
            try {
                const transporter = nodemailer_1.default.createTransport({
                    host: smtpHost,
                    port: smtpPort,
                    secure: smtpSecure,
                    auth: {
                        user: smtpUser,
                        pass: smtpPass,
                    },
                });
                await transporter.sendMail({
                    from: smtpFrom,
                    to: email,
                    subject: 'Recuperação de senha',
                    text: textMessage,
                    html: htmlMessage,
                });
                return;
            }
            catch (error) {
                this.logger.error(`Falha no envio SMTP para ${email}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
            }
        }
        if (!webhook) {
            this.logger.warn(`Email não configurado (SMTP/WEBHOOK). Link de reset para ${email}: ${resetUrl}`);
            return;
        }
        try {
            await fetch(webhook, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    subject: 'Recuperação de senha',
                    text: textMessage,
                    html: htmlMessage,
                }),
            });
        }
        catch (error) {
            this.logger.error(`Falha ao enviar e-mail de recuperação para ${email}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        audit_service_1.AuditService])
], AuthService);
//# sourceMappingURL=auth.service.js.map