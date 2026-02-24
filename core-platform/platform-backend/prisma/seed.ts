import { PrismaClient, GlobalRole, AppType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Check if database already has data
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  // Get admin credentials from environment
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD environment variable is required for seeding');
  }

  // Hash admin password
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      username: adminUsername,
      passwordHash,
      globalRole: GlobalRole.admin,
      isActive: true,
    },
  });

  console.log(`Created admin user: ${adminUsername}`);

  // Create sample apps
  const apps = [
    {
      name: 'Trade Show',
      slug: 'trade-show',
      type: AppType.internal,
      internalPath: '/apps/trade-show',
      icon: 'shop',
      version: '1.0.0',
      isActive: true,
    },
    {
      name: 'Tablets',
      slug: 'tablets',
      type: AppType.internal,
      internalPath: '/apps/tablets',
      icon: 'grid',
      version: '1.0.0',
      isActive: true,
    },
    {
      name: 'Expenses',
      slug: 'expenses',
      type: AppType.external,
      externalUrl: 'https://example.com/expenses',
      icon: 'credit-card',
      version: '1.0.0',
      isActive: true,
    },
  ];

  const createdApps = [];
  for (const appData of apps) {
    const app = await prisma.app.create({
      data: appData,
    });
    createdApps.push(app);
    console.log(`Created app: ${app.name} (${app.slug})`);
  }

  // Assign all apps to admin user
  for (const app of createdApps) {
    await prisma.userApp.create({
      data: {
        userId: adminUser.id,
        appId: app.id,
      },
    });
  }

  console.log('Assigned all apps to admin user');

  // Create audit log entry
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'seed_completed',
      metadata: {
        appsCreated: createdApps.length,
        timestamp: new Date().toISOString(),
      },
    },
  });

  console.log('Database seeding completed successfully');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
