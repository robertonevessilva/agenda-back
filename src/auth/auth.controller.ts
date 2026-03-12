import { Body, Controller, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
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
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload.type';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Res({ passthrough: true }) res: Response, @Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    this.setAuthCookie(res, result.accessToken);
    return { user: result.user };
  }

  @Post('login')
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LoginDto,
  ) {
    const clientKey = `${dto.email.toLowerCase()}::${req.ip || 'unknown'}`;
    const result = await this.authService.login(dto, clientKey);
    this.setAuthCookie(res, result.accessToken);
    return { user: result.user };
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.getUserProfile(user.sub);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.sub);
    this.clearAuthCookie(res);
    return { message: 'Sessão encerrada com sucesso.' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('whatsapp-settings')
  updateWhatsappSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateWhatsappSettingsDto) {
    return this.authService.updateWhatsappSettings(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  listUsers(@CurrentUser() user: JwtPayload) {
    return this.authService.listUsersByAdmin(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('users')
  createUser(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserByAdminDto) {
    return this.authService.createUserByAdmin(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('users/:id/role')
  updateUserRole(
    @CurrentUser() user: JwtPayload,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.authService.updateUserRoleByAdmin(user.sub, targetUserId, dto.role);
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie(this.getCookieName(), token, {
      httpOnly: true,
      secure: this.isSecureCookie(),
      sameSite: 'lax',
      path: '/',
      maxAge: this.getCookieMaxAgeMs(),
    });
  }

  private clearAuthCookie(res: Response) {
    res.clearCookie(this.getCookieName(), {
      httpOnly: true,
      secure: this.isSecureCookie(),
      sameSite: 'lax',
      path: '/',
    });
  }

  private getCookieName() {
    return this.configService.get<string>('AUTH_COOKIE_NAME', 'agenda_auth');
  }

  private isSecureCookie() {
    const forceSecure = this.configService.get<string>('AUTH_COOKIE_SECURE', '').toLowerCase();
    if (forceSecure === 'true') return true;
    if (forceSecure === 'false') return false;
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  private getCookieMaxAgeMs() {
    const raw = this.configService.get<string>('AUTH_COOKIE_MAX_AGE_MS', '604800000');
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 604800000;
  }
}
