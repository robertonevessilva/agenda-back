import { NotFoundException } from '@nestjs/common';
import { RemindersService } from './reminders.service';

describe('RemindersService', () => {
  const auditService = {
    log: jest.fn(),
  };

  const prisma = {
    reminder: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  let service: RemindersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RemindersService(prisma as never, auditService as never);
  });

  it('findAll requests reminders ordered by done/remindAt', async () => {
    prisma.reminder.findMany.mockResolvedValue([]);

    await service.findAll('u1');

    expect(prisma.reminder.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: [{ done: 'asc' }, { remindAt: 'asc' }],
    });
  });

  it('create converts remindAt string to Date', async () => {
    prisma.reminder.create.mockResolvedValue({ id: 'r1' });

    await service.create('u1', {
      title: 'Teste',
      remindAt: '2026-03-06T10:30:00.000Z',
      notes: 'nota',
      priority: 'MEDIUM',
    });

    expect(prisma.reminder.create).toHaveBeenCalledWith({
      data: {
        title: 'Teste',
        notes: 'nota',
        remindAt: new Date('2026-03-06T10:30:00.000Z'),
        priority: 'MEDIUM',
        whatsappReminderSentAt: null,
        whatsappReminderError: null,
        userId: 'u1',
      },
    });
  });

  it('update throws when reminder does not belong to user', async () => {
    prisma.reminder.findFirst.mockResolvedValue(null);

    await expect(service.update('u1', 'r1', { done: true })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove deletes reminder when it belongs to user', async () => {
    prisma.reminder.findFirst.mockResolvedValue({ id: 'r1', userId: 'u1' });
    prisma.reminder.delete.mockResolvedValue({ id: 'r1' });

    const result = await service.remove('u1', 'r1');

    expect(prisma.reminder.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    expect(result).toEqual({ deleted: true });
  });
});
