import { seedAdminAccount } from "@/server/admin/seed-admin"

const result = await seedAdminAccount()

console.log(`Seeded admin account: ${result.email}`)
