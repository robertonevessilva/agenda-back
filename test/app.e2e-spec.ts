import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    prisma = app.get(PrismaService);

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@e2e.agenda.local',
        },
      },
    });

    await app.init();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@e2e.agenda.local',
        },
      },
    });
    await app.close();
  });

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'agenda-api',
    });
  });

  it('auth + reminders + appointments full flow', async () => {
    const suffix = Date.now().toString();
    const userAEmail = `user-a-${suffix}@e2e.agenda.local`;
    const userBEmail = `user-b-${suffix}@e2e.agenda.local`;
    const password = '123456';

    const userARegister = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: userAEmail,
        password,
        name: 'User A',
        timezone: 'America/Recife',
      })
      .expect(201);

    const userBRegister = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: userBEmail,
        password,
        name: 'User B',
      })
      .expect(201);

    const userAToken = userARegister.body.accessToken as string;
    const userBToken = userBRegister.body.accessToken as string;
    expect(userAToken).toBeTruthy();
    expect(userBToken).toBeTruthy();

    await request(app.getHttpServer())
      .get('/reminders')
      .expect(401);

    const reminderCreate = await request(app.getHttpServer())
      .post('/reminders')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Reminder e2e',
        remindAt: '2026-03-05T18:00:00.000Z',
        notes: 'e2e note',
        priority: 'HIGH',
      })
      .expect(201);
    const reminderId = reminderCreate.body.id as string;
    expect(reminderId).toBeTruthy();

    const remindersList = await request(app.getHttpServer())
      .get('/reminders')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);
    expect(remindersList.body).toHaveLength(1);
    expect(remindersList.body[0].title).toBe('Reminder e2e');

    await request(app.getHttpServer())
      .patch(`/reminders/${reminderId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ done: true, title: 'Reminder updated' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/reminders/${reminderId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ done: false })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/reminders/${reminderId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200)
      .expect({ deleted: true });

    const appointmentCreate = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Appointment e2e',
        startsAt: '2026-03-06T10:00:00.000Z',
        endsAt: '2026-03-06T11:00:00.000Z',
        location: 'Meet',
      })
      .expect(201);
    const appointmentId = appointmentCreate.body.id as string;

    const appointmentsList = await request(app.getHttpServer())
      .get('/appointments')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);
    expect(appointmentsList.body).toHaveLength(1);
    expect(appointmentsList.body[0].title).toBe('Appointment e2e');

    await request(app.getHttpServer())
      .patch(`/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ done: true, location: 'Office' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ done: false })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200)
      .expect({ deleted: true });
  });
});
