"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    const tenant = await prisma.tenant.upsert({
        where: { id: 'tenant-1' },
        update: {},
        create: {
            id: 'tenant-1',
            name: 'Test Tenant',
        },
    });
    console.log('Created tenant:', tenant.id);
    const sites = [
        { id: 'site-1', name: 'Main Office', location: 'New York, NY' },
        { id: 'site-2', name: 'West Coast Branch', location: 'San Francisco, CA' },
        { id: 'site-3', name: 'Chicago Facility', location: 'Chicago, IL' },
        { id: 'site-4', name: 'Dallas Warehouse', location: 'Dallas, TX' },
        { id: 'site-5', name: 'Boston Office', location: 'Boston, MA' },
        { id: 'site-6', name: 'Seattle Branch', location: 'Seattle, WA' },
        { id: 'site-7', name: 'Miami Location', location: 'Miami, FL' },
        { id: 'site-8', name: 'Denver Site', location: 'Denver, CO' },
    ];
    const createdSites = [];
    for (const siteData of sites) {
        const site = await prisma.site.upsert({
            where: { id: siteData.id },
            update: {},
            create: {
                id: siteData.id,
                tenantId: tenant.id,
                name: siteData.name,
                location: siteData.location,
            },
        });
        createdSites.push(site);
    }
    console.log('Created sites:', createdSites.map(s => s.name).join(', '));
    const site1 = createdSites[0];
    const site2 = createdSites[1];
    const users = [
        { id: 'admin-1', email: 'admin@example.com', password: 'admin123', name: 'Admin User', role: 'ADMIN' },
        { id: 'user-1', email: 'user@example.com', password: 'user123', name: 'Regular User', role: 'USER' },
        { id: 'user-2', email: 'john.doe@example.com', password: 'password123', name: 'John Doe', role: 'USER' },
        { id: 'user-3', email: 'jane.smith@example.com', password: 'password123', name: 'Jane Smith', role: 'USER' },
        { id: 'user-4', email: 'bob.jones@example.com', password: 'password123', name: 'Bob Jones', role: 'USER' },
        { id: 'user-5', email: 'alice.brown@example.com', password: 'password123', name: 'Alice Brown', role: 'USER' },
        { id: 'user-6', email: 'charlie.wilson@example.com', password: 'password123', name: 'Charlie Wilson', role: 'USER' },
        { id: 'user-7', email: 'diana.miller@example.com', password: 'password123', name: 'Diana Miller', role: 'USER' },
        { id: 'user-8', email: 'edward.davis@example.com', password: 'password123', name: 'Edward Davis', role: 'USER' },
        { id: 'admin-2', email: 'manager@example.com', password: 'manager123', name: 'Manager User', role: 'ADMIN' },
    ];
    const createdUsers = [];
    for (const userData of users) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: {
                id: userData.id,
                tenantId: tenant.id,
                email: userData.email,
                password: hashedPassword,
                name: userData.name,
                role: userData.role,
            },
        });
        createdUsers.push(user);
    }
    console.log('Created users:', createdUsers.map(u => u.email).join(', '));
    const admin = createdUsers.find(u => u.role === 'ADMIN');
    const user = createdUsers.find(u => u.role === 'USER');
    const issueTypes = [
        { key: 'SAFETY', label: 'Safety' },
        { key: 'FAULT', label: 'Fault' },
        { key: 'SECURITY', label: 'Security' },
        { key: 'MAINTENANCE', label: 'Maintenance' },
        { key: 'OTHER', label: 'Other' },
    ];
    for (const type of issueTypes) {
        await prisma.issueType.upsert({
            where: {
                tenantId_key: {
                    tenantId: tenant.id,
                    key: type.key,
                },
            },
            update: {},
            create: {
                tenantId: tenant.id,
                key: type.key,
                label: type.label,
                active: true,
            },
        });
    }
    console.log('Created issue types:', issueTypes.map(t => t.label).join(', '));
    const ticket1 = await prisma.ticket.upsert({
        where: { id: 'ticket-1' },
        update: {},
        create: {
            id: 'ticket-1',
            tenantId: tenant.id,
            siteId: site1.id,
            typeKey: 'SAFETY',
            description: 'Fire extinguisher needs inspection',
            details: 'Annual inspection is overdue',
            status: 'NEW',
            priority: 'P2',
            assignedUserId: user.id,
        },
    });
    const ticket2 = await prisma.ticket.upsert({
        where: { id: 'ticket-2' },
        update: {},
        create: {
            id: 'ticket-2',
            tenantId: tenant.id,
            siteId: site2.id,
            typeKey: 'FAULT',
            description: 'HVAC system not working',
            details: 'Temperature control unit is not responding',
            status: 'TRIAGE',
            priority: 'P1',
            assignedUserId: admin.id,
        },
    });
    console.log('Created tickets:', ticket1.id, ticket2.id);
    console.log('Seeding complete!');
    console.log('\n=== Test Credentials ===');
    console.log('\nAdmin Users:');
    createdUsers.filter(u => u.role === 'ADMIN').forEach(u => {
        const userData = users.find(ud => ud.email === u.email);
        console.log(`  ${u.name} - email: ${u.email}, password: ${userData.password}`);
    });
    console.log('\nRegular Users:');
    createdUsers.filter(u => u.role === 'USER').forEach(u => {
        const userData = users.find(ud => ud.email === u.email);
        console.log(`  ${u.name} - email: ${u.email}, password: ${userData.password}`);
    });
    console.log('\n=== Sites ===');
    createdSites.forEach(s => {
        console.log(`  ${s.name} (${s.location})`);
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map