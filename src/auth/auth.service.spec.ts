import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  const prisma = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtService = {
    sign: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };

  const auditService = {
    log: jest.fn(),
  };

  let service: AuthService;

  beforeAll(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockReset();
    prisma.user.count.mockResolvedValue(0);
    configService.get.mockImplementation(
      (_key: string, defaultValue?: string) => defaultValue,
    );
    service = new AuthService(
      prisma as never,
      jwtService as never,
      configService as never,
      auditService as never,
    );
  });

  it('register creates user and returns token', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u1',
      email: 'john@example.com',
      name: 'John',
      role: 'ADMIN',
      whatsappPhone: null,
      whatsappOptIn: false,
    });
    jwtService.sign.mockReturnValue('jwt-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pass');

    const result = await service.register({
      email: 'JOHN@EXAMPLE.COM',
      password: '123456',
      name: 'John',
      timezone: 'America/Recife',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'john@example.com' },
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'john@example.com',
        passwordHash: 'hashed-pass',
        role: 'ADMIN',
        name: 'John',
        timezone: 'America/Recife',
        whatsappPhone: undefined,
        whatsappOptIn: false,
      },
    });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'john@example.com',
    });
    expect(result).toEqual({
      accessToken: 'jwt-token',
      user: {
        id: 'u1',
        email: 'john@example.com',
        name: 'John',
        role: 'ADMIN',
        whatsappPhone: null,
        whatsappOptIn: false,
      },
    });
  });

  it('register rejects duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });

    await expect(
      service.register({
        email: 'existing@example.com',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('register creates USER when there is already at least one user', async () => {
    prisma.user.count.mockResolvedValue(1);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u2',
      email: 'new-user@example.com',
      name: null,
      role: 'USER',
      whatsappPhone: null,
      whatsappOptIn: false,
    });
    jwtService.sign.mockReturnValue('jwt-token-2');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pass-2');

    const result = await service.register({
      email: 'new-user@example.com',
      password: '123456',
    });

    expect(result.user.role).toBe('USER');
  });

  it('login rejects invalid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login returns token when password matches', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'john@example.com',
      passwordHash: 'hashed',
      name: 'John',
      role: 'USER',
      whatsappPhone: null,
      whatsappOptIn: false,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.sign.mockReturnValue('jwt-token');

    const result = await service.login({
      email: 'JOHN@EXAMPLE.COM',
      password: '123456',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'john@example.com' },
    });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'john@example.com',
    });
    expect(result).toEqual({
      accessToken: 'jwt-token',
      user: {
        id: 'u1',
        email: 'john@example.com',
        name: 'John',
        role: 'USER',
        whatsappPhone: null,
        whatsappOptIn: false,
      },
    });
  });

  it('login rejects when captcha is enabled and token is missing', async () => {
    configService.get.mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'RECAPTCHA_SECRET_KEY') return 'recaptcha-secret';
      return defaultValue;
    });

    await expect(
      service.login({
        email: 'john@example.com',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('login validates captcha when enabled', async () => {
    configService.get.mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'RECAPTCHA_SECRET_KEY') return 'recaptcha-secret';
      return defaultValue;
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'john@example.com',
      passwordHash: 'hashed',
      name: 'John',
      role: 'USER',
      whatsappPhone: null,
      whatsappOptIn: false,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.sign.mockReturnValue('jwt-token');

    await service.login({
      email: 'john@example.com',
      password: '123456',
      captchaToken: 'captcha-token',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('changePassword updates password when current password is valid', async () => {
    prisma.user.findUnique.mockResolvedValue({ passwordHash: 'old-hash' });
    (bcrypt.compare as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

    const result = await service.changePassword('u1', {
      currentPassword: '123456',
      newPassword: '654321',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: 'new-hash' },
    });
    expect(result).toEqual({ message: 'Senha alterada com sucesso.' });
  });

  it('changePassword rejects invalid current password', async () => {
    prisma.user.findUnique.mockResolvedValue({ passwordHash: 'old-hash' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.changePassword('u1', {
        currentPassword: 'wrong-pass',
        newPassword: '654321',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('changePassword rejects same password', async () => {
    prisma.user.findUnique.mockResolvedValue({ passwordHash: 'old-hash' });
    (bcrypt.compare as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await expect(
      service.changePassword('u1', {
        currentPassword: '123456',
        newPassword: '123456',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createUserByAdmin creates a user when admin password matches', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ role: 'ADMIN', passwordHash: 'admin-hash' })
      .mockResolvedValueOnce(null);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-user-hash');
    prisma.user.create.mockResolvedValue({
      id: 'u2',
      email: 'new@example.com',
      name: 'New User',
      role: 'USER',
      timezone: 'America/Recife',
      whatsappPhone: null,
      whatsappOptIn: false,
    });

    const result = await service.createUserByAdmin('admin-id', {
      email: 'new@example.com',
      password: '123456',
      adminPassword: '123456',
      name: 'New User',
      timezone: 'America/Recife',
    });

    expect(result).toEqual({
      message: 'Usuário criado com sucesso.',
      user: {
        id: 'u2',
        email: 'new@example.com',
        name: 'New User',
        role: 'USER',
        timezone: 'America/Recife',
        whatsappPhone: null,
        whatsappOptIn: false,
      },
    });
  });

  it('updateUserRoleByAdmin allows demotion of another admin user', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ role: 'ADMIN' })
      .mockResolvedValueOnce({ id: 'u-admin-2', role: 'ADMIN' });
    prisma.user.update.mockResolvedValue({
      id: 'u-admin-2',
      email: 'admin2@example.com',
      name: 'Admin 2',
      role: 'USER',
      timezone: 'America/Recife',
      whatsappPhone: null,
      whatsappOptIn: false,
    });

    const result = await service.updateUserRoleByAdmin('u-admin-1', 'u-admin-2', 'USER' as never);

    expect(result).toEqual({
      message: 'Status do usuário atualizado com sucesso.',
      user: {
        id: 'u-admin-2',
        email: 'admin2@example.com',
        name: 'Admin 2',
        role: 'USER',
        timezone: 'America/Recife',
        whatsappPhone: null,
        whatsappOptIn: false,
      },
    });
  });
});
