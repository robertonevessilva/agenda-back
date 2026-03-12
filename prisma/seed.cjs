const { PrismaClient, Priority, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const demoEmail = 'demo@agenda.local';
  const demoPassword = '123456';
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      name: 'Usuario Demo',
      timezone: 'America/Recife',
      passwordHash,
      role: UserRole.ADMIN,
    },
    create: {
      email: demoEmail,
      name: 'Usuario Demo',
      timezone: 'America/Recife',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  await prisma.reminder.deleteMany({ where: { userId: user.id } });
  await prisma.appointment.deleteMany({ where: { userId: user.id } });

  await prisma.reminder.createMany({
    data: [
      {
        title: 'Tomar agua',
        notes: 'Beber ao menos 2L no dia.',
        remindAt: new Date(Date.now() + 60 * 60 * 1000),
        priority: Priority.MEDIUM,
        userId: user.id,
      },
      {
        title: 'Enviar relatorio semanal',
        notes: 'Enviar para o time ate 17h.',
        remindAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        priority: Priority.HIGH,
        userId: user.id,
      },
      {
        title: 'Ligar para a familia',
        remindAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: Priority.LOW,
        userId: user.id,
      },
    ],
  });

  await prisma.appointment.createMany({
    data: [
      {
        title: 'Daily com o time',
        location: 'Google Meet',
        notes: 'Atualizar status das tarefas.',
        startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
        userId: user.id,
      },
      {
        title: 'Consulta odontologica',
        location: 'Clinica Central',
        startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 49 * 60 * 60 * 1000),
        userId: user.id,
      },
    ],
  });

  console.log('Seed concluido.');
  console.log(`Login demo: ${demoEmail}`);
  console.log(`Senha demo: ${demoPassword}`);
}

main()
  .catch((error) => {
    console.error('Falha no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
