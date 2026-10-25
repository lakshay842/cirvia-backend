import { PrismaClient, SettingValueType, CmsContentStatus } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = [
  { name: 'USER', description: 'Registered platform user' },
  { name: 'HOST', description: 'Verified event host' },
  { name: 'MODERATOR', description: 'Content and report moderator' },
  { name: 'ADMIN', description: 'Platform administrator' },
  { name: 'SUPER_ADMIN', description: 'Full platform control' },
] as const;

const PERMISSIONS = [
  { module: 'users', action: 'read' },
  { module: 'users', action: 'update' },
  { module: 'users', action: 'delete' },
  { module: 'events', action: 'create' },
  { module: 'events', action: 'publish' },
  { module: 'events', action: 'delete' },
  { module: 'events', action: 'moderate' },
  { module: 'payments', action: 'read' },
  { module: 'payments', action: 'refund' },
  { module: 'admin', action: 'dashboard' },
  { module: 'cms', action: 'update' },
  { module: 'hosts', action: 'verify' },
  { module: 'reports', action: 'moderate' },
  { module: 'reviews', action: 'read' },
  { module: 'reviews', action: 'moderate' },
  { module: 'verification', action: 'review' },
  { module: 'settings', action: 'manage' },
  { module: 'analytics', action: 'read' },
] as const;

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  USER: ['events.create'],
  HOST: ['events.create', 'events.publish'],
  MODERATOR: ['users.read', 'reports.moderate', 'reviews.read', 'reviews.moderate', 'verification.review', 'events.delete', 'events.moderate'],
  ADMIN: [
    'users.read',
    'users.update',
    'users.delete',
    'events.create',
    'events.publish',
    'events.delete',
    'events.moderate',
    'payments.read',
    'payments.refund',
    'admin.dashboard',
    'cms.update',
    'hosts.verify',
    'reports.moderate',
    'reviews.read',
    'reviews.moderate',
    'verification.review',
    'analytics.read',
  ],
  SUPER_ADMIN: PERMISSIONS.map((p) => `${p.module}.${p.action}`),
};

const CATEGORIES = [
  { name: 'House Gathering', slug: 'house-gathering', sortOrder: 1 },
  { name: 'Coffee Meetup', slug: 'coffee-meetup', sortOrder: 2 },
  { name: 'Movie Night', slug: 'movie-night', sortOrder: 3 },
  { name: 'Networking', slug: 'networking', sortOrder: 4 },
  { name: 'Board Games', slug: 'board-games', sortOrder: 5 },
  { name: 'Workshop', slug: 'workshop', sortOrder: 6 },
  { name: 'Music Session', slug: 'music-session', sortOrder: 7 },
  { name: 'Birthday Meetup', slug: 'birthday-meetup', sortOrder: 8 },
  { name: 'Sports Watch Party', slug: 'sports-watch-party', sortOrder: 9 },
  { name: 'Community Meetup', slug: 'community-meetup', sortOrder: 10 },
] as const;

const SYSTEM_SETTINGS: Array<{
  key: string;
  value: string;
  type: SettingValueType;
}> = [
  { key: 'platform_fee_percent', value: '10', type: SettingValueType.NUMBER },
  { key: 'maintenance_mode', value: 'false', type: SettingValueType.BOOLEAN },
  { key: 'otp_expiry_minutes', value: '5', type: SettingValueType.NUMBER },
  { key: 'booking_timeout_minutes', value: '15', type: SettingValueType.NUMBER },
  { key: 'account_lock_attempts', value: '5', type: SettingValueType.NUMBER },
  { key: 'account_lock_duration_minutes', value: '30', type: SettingValueType.NUMBER },
  { key: 'jwt_access_expiry', value: '15m', type: SettingValueType.STRING },
  { key: 'jwt_refresh_expiry', value: '30d', type: SettingValueType.STRING },
  { key: 'trust_score_initial', value: '50', type: SettingValueType.NUMBER },
  { key: 'default_currency', value: 'INR', type: SettingValueType.STRING },
];

const ADMIN_ROLES = [
  { name: 'SUPER_ADMIN', description: 'Full admin access', priority: 100 },
  { name: 'ADMIN', description: 'Standard admin access', priority: 80 },
  { name: 'MODERATOR', description: 'Moderation access', priority: 60 },
  { name: 'FINANCE_ADMIN', description: 'Payments and refunds', priority: 50 },
  { name: 'SUPPORT_ADMIN', description: 'Support ticket management', priority: 40 },
] as const;

const ADMIN_PERMISSIONS = [
  { module: 'users', action: 'read', description: 'View users' },
  { module: 'users', action: 'update', description: 'Edit users' },
  { module: 'users', action: 'suspend', description: 'Suspend users' },
  { module: 'hosts', action: 'verify', description: 'Verify hosts' },
  { module: 'events', action: 'moderate', description: 'Moderate events' },
  { module: 'payments', action: 'read', description: 'View payments' },
  { module: 'payments', action: 'refund', description: 'Process refunds' },
  { module: 'reports', action: 'moderate', description: 'Handle reports' },
  { module: 'cms', action: 'update', description: 'Manage CMS content' },
  { module: 'analytics', action: 'read', description: 'View analytics' },
  { module: 'settings', action: 'manage', description: 'Manage system settings' },
  { module: 'audit', action: 'read', description: 'View audit logs' },
] as const;

const FEATURE_FLAGS = [
  { featureName: 'wallet', enabled: true, environment: 'development' },
  { featureName: 'chat', enabled: false, environment: 'development' },
  { featureName: 'communities', enabled: false, environment: 'development' },
  { featureName: 'membership', enabled: false, environment: 'development' },
  { featureName: 'ai_recommendations', enabled: false, environment: 'development' },
] as const;

function permissionKey(module: string, action: string): string {
  return `${module}.${action}`;
}

async function seedRolesAndPermissions(): Promise<Map<string, string>> {
  const roleIdMap = new Map<string, string>();

  for (const role of ROLES) {
    const record = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
    roleIdMap.set(role.name, record.id);
  }

  const permissionIdMap = new Map<string, string>();

  for (const perm of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { module_action: { module: perm.module, action: perm.action } },
      update: {},
      create: perm,
    });
    permissionIdMap.set(permissionKey(perm.module, perm.action), record.id);
  }

  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = roleIdMap.get(roleName);
    if (!roleId) continue;

    for (const key of permKeys) {
      const permissionId = permissionIdMap.get(key);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  return roleIdMap;
}

async function seedCategories(): Promise<void> {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
  }
}

async function seedSystemSettings(): Promise<void> {
  for (const setting of SYSTEM_SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, type: setting.type },
      create: setting,
    });
  }
}

async function seedAdminRoles(): Promise<void> {
  const permissionIdMap = new Map<string, string>();

  for (const perm of ADMIN_PERMISSIONS) {
    const record = await prisma.adminPermission.upsert({
      where: { module_action: { module: perm.module, action: perm.action } },
      update: { description: perm.description },
      create: perm,
    });
    permissionIdMap.set(permissionKey(perm.module, perm.action), record.id);
  }

  for (const role of ADMIN_ROLES) {
    const adminRole = await prisma.adminRole.upsert({
      where: { name: role.name },
      update: { description: role.description, priority: role.priority },
      create: role,
    });

    if (role.name === 'SUPER_ADMIN') {
      for (const permId of permissionIdMap.values()) {
        await prisma.adminRolePermission.upsert({
          where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permId } },
          update: {},
          create: { roleId: adminRole.id, permissionId: permId },
        });
      }
    }
  }
}

async function seedFeatureFlags(): Promise<void> {
  for (const flag of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { featureName: flag.featureName },
      update: { enabled: flag.enabled, environment: flag.environment },
      create: flag,
    });
  }
}

async function seedCmsPages(): Promise<void> {
  const pages = [
    {
      title: 'Privacy Policy',
      slug: 'privacy-policy',
      content: 'Privacy policy content will be managed via CMS.',
      status: CmsContentStatus.PUBLISHED,
    },
    {
      title: 'Terms of Service',
      slug: 'terms-of-service',
      content: 'Terms of service content will be managed via CMS.',
      status: CmsContentStatus.PUBLISHED,
    },
  ];

  for (const page of pages) {
    await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      update: { title: page.title, content: page.content, status: page.status },
      create: page,
    });
  }
}

async function main(): Promise<void> {
  console.log('Seeding Cirvia database...');

  await seedRolesAndPermissions();
  console.log('  ✓ Roles and permissions');

  await seedCategories();
  console.log('  ✓ Event categories');

  await seedSystemSettings();
  console.log('  ✓ System settings');

  await seedAdminRoles();
  console.log('  ✓ Admin roles and permissions');

  await seedFeatureFlags();
  console.log('  ✓ Feature flags');

  await seedCmsPages();
  console.log('  ✓ CMS pages');

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
