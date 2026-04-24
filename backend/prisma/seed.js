const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Admin',
      email: 'admin@test.com',
      password: '123456', // depois a gente melhora isso com hash
      role: 'USER',
    },
  });

  console.log('✅ Seed executado com sucesso');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });