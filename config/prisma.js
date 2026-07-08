import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD || undefined,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT) || 3306,
    connectionLimit: 5,
  });

  return new PrismaClient({ adapter });
};

// Cek apakah di global sudah ada instance prisma? Kalau belum, bikin baru.
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// Simpan ke global object JIKA kita BUKAN di production (biar aman pas Nodemon/Next.js restart)
if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export default prisma;