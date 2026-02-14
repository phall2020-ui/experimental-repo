import { PrismaClient, Role, SiteType, ContractStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Default SPVs
const defaultSpvs = [
  { code: 'OS2', name: 'Olympus Solar 2 Ltd' },
  { code: 'AD1', name: 'AMPYR Distributed Energy 1 Ltd' },
  { code: 'FS', name: 'Fylde Solar Ltd' },
  { code: 'ESI8', name: 'Eden Sustainable Investments 8 Ltd' },
  { code: 'ESI1', name: 'Eden Sustainable Investments 1 Ltd' },
  { code: 'ESI10', name: 'Eden Sustainable Investments 10 Ltd' },
  { code: 'UV1', name: 'ULTRAVOLT SPV1 LIMITED' },
  { code: 'SKY', name: 'Skylight Energy Ltd' },
];

// Default rate tiers
const defaultRateTiers = [
  { tierName: '<20MW', minCapacityMW: 0, maxCapacityMW: 20, ratePerKwp: 2.0 },
  { tierName: '20-30MW', minCapacityMW: 20, maxCapacityMW: 30, ratePerKwp: 1.8 },
  { tierName: '30-40MW', minCapacityMW: 30, maxCapacityMW: 40, ratePerKwp: 1.7 },
];

// Sample Clearsol sites
const sampleSites = [
  { name: 'Meadow Solar Farm', systemSizeKwp: 2450, siteType: SiteType.GROUND_MOUNT, contractStatus: ContractStatus.YES, onboardDate: new Date('2023-01-15'), pmCost: 500, cctvCost: 200, cleaningCost: 300, spvCode: 'OS2' },
  { name: 'Hilltop Energy Park', systemSizeKwp: 1850, siteType: SiteType.ROOFTOP, contractStatus: ContractStatus.YES, onboardDate: new Date('2023-02-20'), pmCost: 450, cctvCost: 150, cleaningCost: 250, spvCode: 'AD1' },
  { name: 'Valley View Solar', systemSizeKwp: 3200, siteType: SiteType.GROUND_MOUNT, contractStatus: ContractStatus.YES, onboardDate: new Date('2023-03-10'), pmCost: 600, cctvCost: 250, cleaningCost: 400, spvCode: 'OS2' },
  { name: 'Sunrise Industrial', systemSizeKwp: 980, siteType: SiteType.ROOFTOP, contractStatus: ContractStatus.YES, onboardDate: new Date('2023-04-05'), pmCost: 300, cctvCost: 100, cleaningCost: 150, spvCode: 'ESI8' },
  { name: 'Northfield Array', systemSizeKwp: 1560, siteType: SiteType.GROUND_MOUNT, contractStatus: ContractStatus.YES, onboardDate: new Date('2023-05-18'), pmCost: 400, cctvCost: 150, cleaningCost: 200, spvCode: 'FS' },
  { name: 'Greenacre Station', systemSizeKwp: 2100, siteType: SiteType.GROUND_MOUNT, contractStatus: ContractStatus.YES, onboardDate: new Date('2023-06-22'), pmCost: 480, cctvCost: 180, cleaningCost: 280, spvCode: 'ESI1' },
  { name: 'Riverside Solar', systemSizeKwp: 890, siteType: SiteType.ROOFTOP, contractStatus: ContractStatus.NO, pmCost: 280, cctvCost: 80, cleaningCost: 120, spvCode: 'UV1' },
  { name: 'Lakeside Power', systemSizeKwp: 1720, siteType: SiteType.GROUND_MOUNT, contractStatus: ContractStatus.YES, onboardDate: new Date('2023-08-14'), pmCost: 420, cctvCost: 160, cleaningCost: 220, spvCode: 'SKY' },
  { name: 'Oakwood Farm', systemSizeKwp: 2680, siteType: SiteType.GROUND_MOUNT, contractStatus: ContractStatus.YES, onboardDate: new Date('2023-09-01'), pmCost: 550, cctvCost: 220, cleaningCost: 350, spvCode: 'OS2' },
  { name: 'Pinewood Solar', systemSizeKwp: 1340, siteType: SiteType.ROOFTOP, contractStatus: ContractStatus.YES, onboardDate: new Date('2023-10-12'), pmCost: 380, cctvCost: 140, cleaningCost: 180, spvCode: 'AD1' },
  { name: 'Cedar Heights', systemSizeKwp: 1980, siteType: SiteType.GROUND_MOUNT, contractStatus: ContractStatus.NO, pmCost: 460, cctvCost: 170, cleaningCost: 260, spvCode: 'ESI10' },
  { name: 'Willow Creek', systemSizeKwp: 760, siteType: SiteType.ROOFTOP, contractStatus: ContractStatus.YES, onboardDate: new Date('2023-11-28'), pmCost: 250, cctvCost: 70, cleaningCost: 100, spvCode: 'FS' },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@clearsol.co.uk' },
    update: {},
    create: {
      email: 'admin@clearsol.co.uk',
      name: 'Admin User',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create SPVs
  for (const spv of defaultSpvs) {
    await prisma.sPV.upsert({
      where: { code: spv.code },
      update: { name: spv.name },
      create: spv,
    });
  }
  console.log(`✅ Created ${defaultSpvs.length} SPVs`);

  // Create rate tiers
  for (const tier of defaultRateTiers) {
    const existing = await prisma.rateTier.findFirst({
      where: { tierName: tier.tierName, isActive: true },
    });
    if (!existing) {
      await prisma.rateTier.create({ data: tier });
    }
  }
  console.log(`✅ Created ${defaultRateTiers.length} rate tiers`);

  // Create sample sites
  console.log('📥 Creating sample Clearsol sites...');
  let sitesCreated = 0;

  for (const site of sampleSites) {
    // Find SPV by code
    let spvId: string | null = null;
    if (site.spvCode) {
      const spv = await prisma.sPV.findUnique({ where: { code: site.spvCode } });
      spvId = spv?.id || null;
    }

    // Check if site already exists
    const existing = await prisma.site.findFirst({
      where: { name: site.name },
    });

    if (!existing) {
      await prisma.site.create({
        data: {
          name: site.name,
          systemSizeKwp: site.systemSizeKwp,
          siteType: site.siteType,
          contractStatus: site.contractStatus,
          onboardDate: site.onboardDate || null,
          pmCost: site.pmCost || 0,
          cctvCost: site.cctvCost || 0,
          cleaningCost: site.cleaningCost || 0,
          spvId,
        },
      });
      sitesCreated++;
    }
  }
  console.log(`✅ Created ${sitesCreated} sample sites`);

  console.log('🎉 Database seed completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

