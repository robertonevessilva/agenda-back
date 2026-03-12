"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const change_password_dto_1 = require("./dto/change-password.dto");
const create_user_by_admin_dto_1 = require("./dto/create-user-by-admin.dto");
const update_user_role_dto_1 = require("./dto/update-user-role.dto");
const update_whatsapp_settings_dto_1 = require("./dto/update-whatsapp-settings.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let AuthController = class AuthController {
    authService;
    configService;
    constructor(authService, configService) {
        this.authService = authService;
        this.configService = configService;
    }
    async register(res, dto) {
        const result = await this.authService.register(dto);
        this.setAuthCookie(res, result.accessToken);
        return { user: result.user };
    }
    async login(req, res, dto) {
        const clientKey = `${dto.email.toLowerCase()}::${req.ip || 'unknown'}`;
        const result = await this.authService.login(dto, clientKey);
        this.setAuthCookie(res, result.accessToken);
        return { user: result.user };
    }
    forgotPassword(dto) {
        return this.authService.forgotPassword(dto);
    }
    resetPassword(dto) {
        return this.authService.resetPassword(dto);
    }
    me(user) {
        return this.authService.getUserProfile(user.sub);
    }
    async logout(user, res) {
        await this.authService.logout(user.sub);
        this.clearAuthCookie(res);
        return { message: 'Sessão encerrada com sucesso.' };
    }
    changePassword(user, dto) {
        return this.authService.changePassword(user.sub, dto);
    }
    updateWhatsappSettings(user, dto) {
        return this.authService.updateWhatsappSettings(user.sub, dto);
    }
    listUsers(user) {
        return this.authService.listUsersByAdmin(user.sub);
    }
    createUser(user, dto) {
        return this.authService.createUserByAdmin(user.sub, dto);
    }
    updateUserRole(user, targetUserId, dto) {
        return this.authService.updateUserRoleByAdmin(user.sub, targetUserId, dto.role);
    }
    setAuthCookie(res, token) {
        res.cookie(this.getCookieName(), token, {
            httpOnly: true,
            secure: this.isSecureCookie(),
            sameSite: 'lax',
            path: '/',
            maxAge: this.getCookieMaxAgeMs(),
        });
    }
    clearAuthCookie(res) {
        res.clearCookie(this.getCookieName(), {
            httpOnly: true,
            secure: this.isSecureCookie(),
            sameSite: 'lax',
            path: '/',
        });
    }
    getCookieName() {
        return this.configService.get('AUTH_COOKIE_NAME', 'agenda_auth');
    }
    isSecureCookie() {
        const forceSecure = this.configService.get('AUTH_COOKIE_SECURE', '').toLowerCase();
        if (forceSecure === 'true')
            return true;
        if (forceSecure === 'false')
            return false;
        return this.configService.get('NODE_ENV') === 'production';
    }
    getCookieMaxAgeMs() {
        const raw = this.configService.get('AUTH_COOKIE_MAX_AGE_MS', '604800000');
        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 604800000;
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('change-password'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('whatsapp-settings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_whatsapp_settings_dto_1.UpdateWhatsappSettingsDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "updateWhatsappSettings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('users'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "listUsers", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('users'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_user_by_admin_dto_1.CreateUserByAdminDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "createUser", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('users/:id/role'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_user_role_dto_1.UpdateUserRoleDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "updateUserRole", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map