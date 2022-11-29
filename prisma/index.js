import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'warn', 'error']
});

prisma.$connect()
  .then(() => console.log('Database has been connected'))
  .catch((err) => console.log('Unable to connect database:', err));

export default prisma;