import { NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  const auditService = {
    log: jest.fn(),
  };

  const prisma = {
    appointment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  let service: AppointmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AppointmentsService(prisma as never, auditService as never);
  });

  it('findAll requests appointments ordered by done/startsAt', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);

    await service.findAll('u1');

    expect(prisma.appointment.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: [{ done: 'asc' }, { startsAt: 'asc' }],
    });
  });

  it('create converts startsAt and endsAt strings to Date', async () => {
    prisma.appointment.create.mockResolvedValue({ id: 'a1' });

    await service.create('u1', {
      title: 'Reuniao',
      startsAt: '2026-03-06T12:00:00.000Z',
      endsAt: '2026-03-06T13:00:00.000Z',
      location: 'Meet',
      notes: 'Sprint',
    });

    expect(prisma.appointment.create).toHaveBeenCalledWith({
      data: {
        title: 'Reuniao',
        location: 'Meet',
        notes: 'Sprint',
        startsAt: new Date('2026-03-06T12:00:00.000Z'),
        endsAt: new Date('2026-03-06T13:00:00.000Z'),
        whatsappReminderSentAt: null,
        whatsappReminderError: null,
        userId: 'u1',
      },
    });
  });

  it('update throws when appointment does not belong to user', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);

    await expect(service.update('u1', 'a1', { done: true })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
