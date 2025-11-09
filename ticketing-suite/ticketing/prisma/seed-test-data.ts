import { PrismaClient, TicketStatus, TicketPriority } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding comprehensive test data...\n');

  // Create test tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'test-tenant-001' },
    update: {},
    create: {
      id: 'test-tenant-001',
      name: 'Acme Corporation',
    },
  });
  console.log('✅ Created tenant:', tenant.name);

  // Create sites
  const sitesData = [
    { id: 'site-hq', name: 'Headquarters', location: 'New York, NY' },
    { id: 'site-west', name: 'West Coast Office', location: 'San Francisco, CA' },
    { id: 'site-midwest', name: 'Midwest Hub', location: 'Chicago, IL' },
    { id: 'site-south', name: 'Southern Branch', location: 'Austin, TX' },
    { id: 'site-east', name: 'East Coast Center', location: 'Boston, MA' },
  ];

  const sites = [];
  for (const siteData of sitesData) {
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
    sites.push(site);
  }
  console.log('✅ Created sites:', sites.length);

  // Create users with hashed passwords
  const password = await bcrypt.hash('password123', 10);
  
  const usersData = [
    { id: 'user-admin', email: 'admin@acme.com', name: 'Admin User', role: 'ADMIN' as const },
    { id: 'user-john', email: 'john@acme.com', name: 'John Smith', role: 'USER' as const },
    { id: 'user-sarah', email: 'sarah@acme.com', name: 'Sarah Johnson', role: 'USER' as const },
    { id: 'user-mike', email: 'mike@acme.com', name: 'Mike Chen', role: 'USER' as const },
    { id: 'user-emma', email: 'emma@acme.com', name: 'Emma Davis', role: 'USER' as const },
    { id: 'user-alex', email: 'alex@acme.com', name: 'Alex Rodriguez', role: 'USER' as const },
  ];

  const users = [];
  for (const userData of usersData) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        id: userData.id,
        tenantId: tenant.id,
        email: userData.email,
        password: password,
        name: userData.name,
        role: userData.role,
      },
    });
    users.push(user);
  }
  console.log('✅ Created users:', users.length);
  console.log('   📧 Login credentials: any email above with password "password123"');

  // Create issue types
  const issueTypesData = [
    { key: 'BUG', label: 'Bug Report' },
    { key: 'FEATURE', label: 'Feature Request' },
    { key: 'SUPPORT', label: 'Support Request' },
    { key: 'INCIDENT', label: 'Incident' },
    { key: 'MAINTENANCE', label: 'Maintenance' },
    { key: 'SECURITY', label: 'Security Issue' },
    { key: 'DOCUMENTATION', label: 'Documentation' },
    { key: 'INFRASTRUCTURE', label: 'Infrastructure' },
  ];

  const issueTypes = [];
  for (const typeData of issueTypesData) {
    const issueType = await prisma.issueType.upsert({
      where: { 
        tenantId_key: {
          tenantId: tenant.id,
          key: typeData.key
        }
      },
      update: {},
      create: {
        tenantId: tenant.id,
        key: typeData.key,
        label: typeData.label,
        active: true,
      },
    });
    issueTypes.push(issueType);
  }
  console.log('✅ Created issue types:', issueTypes.length);

  // Create custom field definitions
  const fieldDefsData = [
    {
      key: 'severity',
      label: 'Severity',
      datatype: 'enum' as const,
      required: false,
      enumOptions: ['Critical', 'High', 'Medium', 'Low'],
    },
    {
      key: 'environment',
      label: 'Environment',
      datatype: 'enum' as const,
      required: false,
      enumOptions: ['Production', 'Staging', 'Development', 'Testing'],
    },
    {
      key: 'estimated_hours',
      label: 'Estimated Hours',
      datatype: 'number' as const,
      required: false,
      enumOptions: [],
    },
    {
      key: 'customer_impact',
      label: 'Customer Impact',
      datatype: 'boolean' as const,
      required: false,
      enumOptions: [],
    },
  ];

  const fieldDefs = [];
  for (const fieldData of fieldDefsData) {
    const fieldDef = await prisma.ticketFieldDef.upsert({
      where: {
        tenantId_key: {
          tenantId: tenant.id,
          key: fieldData.key
        }
      },
      update: {},
      create: {
        tenantId: tenant.id,
        key: fieldData.key,
        label: fieldData.label,
        datatype: fieldData.datatype,
        required: fieldData.required,
        enumOptions: fieldData.enumOptions,
      },
    });
    fieldDefs.push(fieldDef);
  }
  console.log('✅ Created custom field definitions:', fieldDefs.length);

  // Create diverse tickets
  const ticketsData = [
    {
      siteId: sites[0].id,
      typeKey: 'BUG',
      description: 'Login page not loading on mobile devices',
      details: 'Users on iOS Safari are unable to access the login page. The page shows a blank screen after the initial load.',
      status: 'NEW' as TicketStatus,
      priority: 'P1' as TicketPriority,
      assignedUserId: users[1].id,
      customFields: { severity: 'Critical', environment: 'Production', customer_impact: true },
    },
    {
      siteId: sites[0].id,
      typeKey: 'FEATURE',
      description: 'Add dark mode support to dashboard',
      details: 'Implement a dark mode theme option for users who prefer working in low-light environments.',
      status: 'IN_PROGRESS' as TicketStatus,
      priority: 'P3' as TicketPriority,
      assignedUserId: users[2].id,
      customFields: { estimated_hours: 16, environment: 'Development' },
    },
    {
      siteId: sites[1].id,
      typeKey: 'SUPPORT',
      description: 'User unable to reset password',
      details: 'Customer reports not receiving password reset emails. Email address verified as correct.',
      status: 'TRIAGE' as TicketStatus,
      priority: 'P2' as TicketPriority,
      assignedUserId: users[3].id,
      customFields: { severity: 'High', customer_impact: true },
    },
    {
      siteId: sites[1].id,
      typeKey: 'INCIDENT',
      description: 'Database connection timeout errors',
      details: 'Multiple users experiencing intermittent database connection timeouts during peak hours.',
      status: 'IN_PROGRESS' as TicketStatus,
      priority: 'P1' as TicketPriority,
      assignedUserId: users[1].id,
      customFields: { severity: 'Critical', environment: 'Production', customer_impact: true },
    },
    {
      siteId: sites[2].id,
      typeKey: 'MAINTENANCE',
      description: 'Scheduled server maintenance - Chicago datacenter',
      details: 'Routine maintenance window scheduled for Saturday 2 AM - 6 AM CST.',
      status: 'PENDING' as TicketStatus,
      priority: 'P3' as TicketPriority,
      assignedUserId: users[4].id,
      customFields: { environment: 'Production' },
    },
    {
      siteId: sites[2].id,
      typeKey: 'SECURITY',
      description: 'Potential SQL injection vulnerability in search',
      details: 'Security audit revealed potential SQL injection point in the advanced search feature.',
      status: 'NEW' as TicketStatus,
      priority: 'P1' as TicketPriority,
      assignedUserId: users[1].id,
      customFields: { severity: 'Critical', environment: 'Production', customer_impact: false },
    },
    {
      siteId: sites[3].id,
      typeKey: 'BUG',
      description: 'Export to CSV function not working',
      details: 'When attempting to export ticket data to CSV, the download fails with a 500 error.',
      status: 'RESOLVED' as TicketStatus,
      priority: 'P2' as TicketPriority,
      assignedUserId: users[2].id,
      customFields: { severity: 'Medium', environment: 'Production' },
    },
    {
      siteId: sites[3].id,
      typeKey: 'DOCUMENTATION',
      description: 'Update API documentation for v2 endpoints',
      details: 'New API endpoints need to be documented in the developer portal.',
      status: 'IN_PROGRESS' as TicketStatus,
      priority: 'P4' as TicketPriority,
      assignedUserId: users[5].id,
      customFields: { estimated_hours: 8 },
    },
    {
      siteId: sites[4].id,
      typeKey: 'INFRASTRUCTURE',
      description: 'Upgrade Redis cluster to latest version',
      details: 'Plan and execute upgrade of Redis cluster from 6.2 to 7.0 for improved performance.',
      status: 'PENDING' as TicketStatus,
      priority: 'P3' as TicketPriority,
      assignedUserId: users[4].id,
      customFields: { estimated_hours: 24, environment: 'Production' },
    },
    {
      siteId: sites[4].id,
      typeKey: 'FEATURE',
      description: 'Implement bulk ticket operations',
      details: 'Add ability to select multiple tickets and perform bulk actions like status change, assignment, etc.',
      status: 'CLOSED' as TicketStatus,
      priority: 'P2' as TicketPriority,
      assignedUserId: users[2].id,
      customFields: { estimated_hours: 20 },
    },
    {
      siteId: sites[0].id,
      typeKey: 'BUG',
      description: 'Notification emails not being sent',
      details: 'Email notifications for ticket updates are not being delivered to users.',
      status: 'NEW' as TicketStatus,
      priority: 'P2' as TicketPriority,
      assignedUserId: null,
      customFields: { severity: 'High', environment: 'Production', customer_impact: true },
    },
    {
      siteId: sites[1].id,
      typeKey: 'SUPPORT',
      description: 'Help with custom field configuration',
      details: 'User needs assistance setting up custom fields for their workflow.',
      status: 'RESOLVED' as TicketStatus,
      priority: 'P4' as TicketPriority,
      assignedUserId: users[3].id,
      customFields: {},
    },
    {
      siteId: sites[2].id,
      typeKey: 'FEATURE',
      description: 'Add keyboard shortcuts for power users',
      details: 'Implement keyboard shortcuts for common actions to improve productivity.',
      status: 'CLOSED' as TicketStatus,
      priority: 'P3' as TicketPriority,
      assignedUserId: users[2].id,
      customFields: { estimated_hours: 12 },
    },
    {
      siteId: sites[0].id,
      typeKey: 'INCIDENT',
      description: 'Payment processing system outage',
      details: 'Payment gateway is returning errors. All transactions are failing.',
      status: 'RESOLVED' as TicketStatus,
      priority: 'P1' as TicketPriority,
      assignedUserId: users[1].id,
      customFields: { severity: 'Critical', environment: 'Production', customer_impact: true },
    },
    {
      siteId: sites[3].id,
      typeKey: 'MAINTENANCE',
      description: 'Clean up old log files',
      details: 'Server disk space running low. Need to archive and clean up old application logs.',
      status: 'NEW' as TicketStatus,
      priority: 'P3' as TicketPriority,
      assignedUserId: users[4].id,
      customFields: { environment: 'Production' },
    },
  ];

  const tickets = [];
  for (const ticketData of ticketsData) {
    const ticket = await prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        siteId: ticketData.siteId,
        typeKey: ticketData.typeKey,
        description: ticketData.description,
        details: ticketData.details,
        status: ticketData.status,
        priority: ticketData.priority,
        assignedUserId: ticketData.assignedUserId,
        customFields: ticketData.customFields as any,
      },
    });
    tickets.push(ticket);
  }
  console.log('✅ Created tickets:', tickets.length);

  // Create some comments on tickets
  const commentsData = [
    {
      ticketId: tickets[0].id,
      authorUserId: users[1].id,
      body: 'I\'ve reproduced this issue on iOS 16. Investigating the root cause.',
      visibility: 'PUBLIC' as const,
    },
    {
      ticketId: tickets[0].id,
      authorUserId: users[2].id,
      body: 'This might be related to the recent CSS changes. Checking the mobile stylesheet.',
      visibility: 'INTERNAL' as const,
    },
    {
      ticketId: tickets[1].id,
      authorUserId: users[2].id,
      body: 'Dark mode implementation is 60% complete. Working on the dashboard components.',
      visibility: 'PUBLIC' as const,
    },
    {
      ticketId: tickets[3].id,
      authorUserId: users[1].id,
      body: 'Database team has been notified. They\'re investigating connection pool settings.',
      visibility: 'INTERNAL' as const,
    },
  ];

  for (const commentData of commentsData) {
    await prisma.comment.create({
      data: {
        tenantId: tenant.id,
        ticketId: commentData.ticketId,
        authorUserId: commentData.authorUserId,
        body: commentData.body,
        visibility: commentData.visibility,
      },
    });
  }
  console.log('✅ Created comments:', commentsData.length);

  console.log('\n🎉 Seed data creation complete!\n');
  console.log('📊 Summary:');
  console.log(`   - Tenant: ${tenant.name}`);
  console.log(`   - Sites: ${sites.length}`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Issue Types: ${issueTypes.length}`);
  console.log(`   - Custom Fields: ${fieldDefs.length}`);
  console.log(`   - Tickets: ${tickets.length}`);
  console.log(`   - Comments: ${commentsData.length}`);
  console.log('\n🔐 Test Credentials:');
  console.log('   Email: admin@acme.com');
  console.log('   Password: password123');
  console.log('\n   Or use any other user email with the same password.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
