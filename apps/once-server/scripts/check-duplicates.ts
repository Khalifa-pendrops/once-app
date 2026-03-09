
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const duplicates = await prisma.$queryRaw`
    SELECT "deviceId", "keyType", COUNT(*)
    FROM public_keys
    GROUP BY "deviceId", "keyType"
    HAVING COUNT(*) > 1
  `
  console.log('Duplicates found:', JSON.stringify(duplicates, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
