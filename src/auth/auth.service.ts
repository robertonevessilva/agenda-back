import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import nodemailer from 'nodemailer';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly loginAttempts = new Map<string, { count: number; blockedUntil: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const usersCount = await this.prisma.user.count();

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException('Email já cadastrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: usersCount === 0 ? UserRole.ADMIN : UserRole.USER,
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
      description:
        usersCount === 0
          ? 'Primeiro usuário administrador cadastrado.'
          : 'Novo usuário cadastrado via tela pública.',
    });

    return this.buildAuthResponse(
      user.id,
      user.email,
      user.name,
      user.role,
      user.whatsappPhone,
      user.whatsappOptIn,
    );
  }

  async login(dto: LoginDto, clientKey = dto.email.toLowerCase()) {
    this.ensureNotRateLimited(clientKey);
    await this.validateCaptcha(dto.captchaToken);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      this.registerFailedAttempt(clientKey);
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      this.registerFailedAttempt(clientKey);
      throw new UnauthorizedException('Credenciais inválidas.');
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

    return this.buildAuthResponse(
      user.id,
      user.email,
      user.name,
      user.role,
      user.whatsappPhone,
      user.whatsappOptIn,
    );
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    const currentMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw new UnauthorizedException('Senha atual inválida.');
    }

    const samePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (samePassword) {
      throw new BadRequestException('A nova senha deve ser diferente da atual.');
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

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return { message: 'Se o e-mail existir, você receberá instruções de recuperação.' };
    }

    const rawToken = randomBytes(32).toString('hex');
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

  async resetPassword(dto: ResetPasswordDto) {
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
      throw new BadRequestException('Token de recuperação inválido ou expirado.');
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

  async updateWhatsappSettings(userId: string, dto: UpdateWhatsappSettingsDto) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        whatsappPhone: true,
        whatsappOptIn: true,
      },
    });

    if (!currentUser) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    const nextPhone = dto.whatsappPhone !== undefined ? dto.whatsappPhone : currentUser.whatsappPhone;
    const nextOptIn = dto.whatsappOptIn !== undefined ? dto.whatsappOptIn : currentUser.whatsappOptIn;

    if (nextOptIn && !nextPhone) {
      throw new BadRequestException('Informe um telefone WhatsApp para ativar notificações.');
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
      description:
        `Configurações de WhatsApp atualizadas. Campos alterados: ` +
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

  async listUsersByAdmin(adminUserId: string) {
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

  async createUserByAdmin(adminUserId: string, dto: CreateUserByAdminDto) {
    const admin = await this.ensureAdmin(adminUserId, true);
    const adminPasswordOk = await bcrypt.compare(dto.adminPassword, admin.passwordHash);

    if (!adminPasswordOk) {
      throw new UnauthorizedException('Senha do administrador inválida.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException('Email já cadastrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role ?? UserRole.USER,
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

  async updateUserRoleByAdmin(adminUserId: string, targetUserId: string, role: UserRole) {
    await this.ensureAdmin(adminUserId);

    if (adminUserId === targetUserId && role !== UserRole.ADMIN) {
      throw new BadRequestException('Você não pode remover seu próprio status de administrador.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      throw new BadRequestException('Usuário não encontrado.');
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

  async logout(userId: string) {
    await this.auditService.log({
      actorUserId: userId,
      targetUserId: userId,
      operation: 'LOGOUT',
      entity: 'AUTH',
      entityId: userId,
      description: 'Logout realizado.',
    });
  }

  async getUserProfile(userId: string) {
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
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    return { user };
  }

  private async validateCaptcha(captchaToken?: string) {
    const recaptchaSecret = this.configService.get<string>('RECAPTCHA_SECRET_KEY');
    if (!recaptchaSecret) {
      return;
    }

    if (!captchaToken) {
      throw new BadRequestException('Confirme o CAPTCHA.');
    }

    const verifyUrl = this.configService.get<string>(
      'RECAPTCHA_VERIFY_URL',
      'https://www.google.com/recaptcha/api/siteverify',
    );

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
        throw new BadRequestException('Falha ao validar CAPTCHA.');
      }

      const result = (await response.json()) as { success?: boolean };
      if (!result.success) {
        throw new BadRequestException('CAPTCHA inválido.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Não foi possível validar o CAPTCHA.');
    }
  }

  private async ensureAdmin(userId: string, includePasswordHash = false) {
    const admin = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        ...(includePasswordHash ? { passwordHash: true } : {}),
      },
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Acesso permitido apenas para administradores.');
    }

    return admin;
  }

  private ensureNotRateLimited(clientKey: string) {
    const attempt = this.loginAttempts.get(clientKey);
    if (!attempt) return;

    if (attempt.blockedUntil > Date.now()) {
      throw new HttpException(
        'Muitas tentativas de login. Tente novamente em alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (attempt.blockedUntil <= Date.now()) {
      this.loginAttempts.delete(clientKey);
    }
  }

  private registerFailedAttempt(clientKey: string) {
    const now = Date.now();
    const current = this.loginAttempts.get(clientKey);
    const nextCount = (current?.count ?? 0) + 1;
    const blockedUntil = nextCount >= 5 ? now + 15 * 60 * 1000 : 0;
    this.loginAttempts.set(clientKey, { count: nextCount, blockedUntil });
  }

  private clearFailedAttempts(clientKey: string) {
    this.loginAttempts.delete(clientKey);
  }

  private buildAuthResponse(
    userId: string,
    email: string,
    name: string | null,
    role: UserRole,
    whatsappPhone: string | null,
    whatsappOptIn: boolean,
  ) {
    const payload: JwtPayload = { sub: userId, email };
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

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async sendPasswordResetEmail(email: string, name: string | null, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:9000');
    const resetUrl = `${frontendUrl}/#/reset-password?token=${encodeURIComponent(token)}`;
    const smtpHost = this.configService.get<string>('EMAIL_SMTP_HOST', '').trim();
    const smtpPortRaw = this.configService.get<string>('EMAIL_SMTP_PORT', '587');
    const smtpUser = this.configService.get<string>('EMAIL_SMTP_USER', '').trim();
    const smtpPass = this.configService.get<string>('EMAIL_SMTP_PASS', '').trim();
    const smtpFrom = this.configService.get<string>('EMAIL_FROM', '').trim();
    const smtpSecureRaw = this.configService.get<string>('EMAIL_SMTP_SECURE', '').trim().toLowerCase();
    const webhook = this.configService.get<string>('EMAIL_WEBHOOK_URL');

    const textMessage = `Olá${name ? `, ${name}` : ''}! Use este link para redefinir sua senha: ${resetUrl}`;
    const htmlMessage = `<p>Olá${name ? `, ${name}` : ''}!</p><p>Use este link para redefinir sua senha:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Se você não solicitou, ignore este e-mail.</p>`;

    const smtpPort = Number(smtpPortRaw);
    const smtpSecure = smtpSecureRaw ? smtpSecureRaw === 'true' : smtpPort === 465;

    if (smtpHost && smtpUser && smtpPass && smtpFrom && Number.isFinite(smtpPort)) {
      try {
        const transporter = nodemailer.createTransport({
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
      } catch (error) {
        this.logger.error(
          `Falha no envio SMTP para ${email}: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
        );
      }
    }

    if (!webhook) {
      this.logger.warn(
        `Email não configurado (SMTP/WEBHOOK). Link de reset para ${email}: ${resetUrl}`,
      );
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
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail de recuperação para ${email}: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
    }
  }
}
