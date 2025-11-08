import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/prisma.service';

describe('New Filtering Features E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testTenantId: string;
  let testSiteId: string;
  let testUserId: string;
  let testUserId2: string;
  let testTicketId1: string;
  let testTicketId2: string;
  let testAttachmentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await setupTestData();
    authToken = generateDevToken();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test tenant
    testTenantId = 'test-tenant-filtering-' + Date.now();
    await prisma.tenant.create({
      data: {
        id: testTenantId,
        name: 'Test Tenant for Filtering',
      },
    });

    // Create test site
    testSiteId = 'test-site-filtering-' + Date.now();
    await prisma.site.create({
      data: {
        id: testSiteId,
        tenantId: testTenantId,
        name: 'Test Site',
        location: 'Test Location',
      },
    });

    // Create test users
    testUserId = 'test-user-filtering-1-' + Date.now();
    await prisma.user.create({
      data: {
        id: testUserId,
        tenantId: testTenantId,
        email: `test-filtering-1-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Test User 1',
        role: 'USER',
      },
    });

    testUserId2 = 'test-user-filtering-2-' + Date.now();
    await prisma.user.create({
      data: {
        id: testUserId2,
        tenantId: testTenantId,
        email: `test-filtering-2-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Test User 2',
        role: 'USER',
      },
    });

    // Create test issue type
    await prisma.issueType.create({
      data: {
        tenantId: testTenantId,
        key: 'FILTER_TEST',
        label: 'Filter Test Type',
        active: true,
      },
    });

    // Create test field definition for custom field filtering
    await prisma.ticketFieldDef.create({
      data: {
        tenantId: testTenantId,
        key: 'test_custom_field',
        label: 'Test Custom Field',
        datatype: 'string',
        required: false,
      },
    });
  }

  async function cleanupTestData() {
    if (testTenantId) {
      await prisma.tenant.delete({
        where: { id: testTenantId },
      }).catch(() => {});
    }
  }

  function generateDevToken(): string {
    const payload = {
      sub: testUserId,
      tenantId: testTenantId,
      roles: ['ADMIN', 'USER'],
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    };
    const header = { alg: 'HS256', typ: 'JWT' };
    const base64url = (str: any) =>
      Buffer.from(JSON.stringify(str))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    return base64url(header) + '.' + base64url(payload) + '.dev-signature';
  }

  describe('Date Range Filtering', () => {
    beforeAll(async () => {
      // Create tickets with different creation dates
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      testTicketId1 = await prisma.ticket.create({
        data: {
          tenantId: testTenantId,
          siteId: testSiteId,
          typeKey: 'FILTER_TEST',
          description: 'Ticket created yesterday',
          status: 'NEW',
          priority: 'P2',
          createdAt: yesterday,
        },
      }).then(t => t.id);

      testTicketId2 = await prisma.ticket.create({
        data: {
          tenantId: testTenantId,
          siteId: testSiteId,
          typeKey: 'FILTER_TEST',
          description: 'Ticket created today',
          status: 'NEW',
          priority: 'P2',
        },
      }).then(t => t.id);
    });

    it('GET /tickets?createdFrom - should filter tickets by created date from', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await request(app.getHttpServer())
        .get(`/tickets?createdFrom=${today}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should include ticket created today, but not yesterday
      const hasToday = response.body.some((t: any) => t.id === testTicketId2);
      expect(hasToday).toBe(true);
    });

    it('GET /tickets?createdTo - should filter tickets by created date to', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await request(app.getHttpServer())
        .get(`/tickets?createdTo=${today}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should include tickets created up to today
      const hasYesterday = response.body.some((t: any) => t.id === testTicketId1);
      expect(hasYesterday).toBe(true);
    });

    it('GET /tickets?createdFrom&createdTo - should filter tickets by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const response = await request(app.getHttpServer())
        .get(`/tickets?createdFrom=${yesterday.toISOString().split('T')[0]}&createdTo=${tomorrow.toISOString().split('T')[0]}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('Assigned User Filtering', () => {
    beforeAll(async () => {
      // Create tickets with different assigned users
      await prisma.ticket.create({
        data: {
          tenantId: testTenantId,
          siteId: testSiteId,
          typeKey: 'FILTER_TEST',
          description: 'Ticket assigned to user 1',
          status: 'NEW',
          priority: 'P2',
          assignedUserId: testUserId,
        },
      });

      await prisma.ticket.create({
        data: {
          tenantId: testTenantId,
          siteId: testSiteId,
          typeKey: 'FILTER_TEST',
          description: 'Ticket assigned to user 2',
          status: 'NEW',
          priority: 'P2',
          assignedUserId: testUserId2,
        },
      });

      await prisma.ticket.create({
        data: {
          tenantId: testTenantId,
          siteId: testSiteId,
          typeKey: 'FILTER_TEST',
          description: 'Unassigned ticket',
          status: 'NEW',
          priority: 'P2',
          assignedUserId: null,
        },
      });
    });

    it('GET /tickets?assignedUserId - should filter tickets by assigned user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tickets?assignedUserId=${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      // All returned tickets should be assigned to testUserId
      response.body.forEach((ticket: any) => {
        expect(ticket.assignedUserId).toBe(testUserId);
      });
    });

    it('GET /tickets?assignedUserId - should return different results for different users', async () => {
      const response1 = await request(app.getHttpServer())
        .get(`/tickets?assignedUserId=${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get(`/tickets?assignedUserId=${testUserId2}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response1.body)).toBe(true);
      expect(Array.isArray(response2.body)).toBe(true);
      
      // Results should be different
      const user1Tickets = response1.body.filter((t: any) => t.assignedUserId === testUserId);
      const user2Tickets = response2.body.filter((t: any) => t.assignedUserId === testUserId2);
      
      expect(user1Tickets.length).toBeGreaterThan(0);
      expect(user2Tickets.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Field Filtering', () => {
    beforeAll(async () => {
      // Create tickets with custom fields
      await prisma.ticket.create({
        data: {
          tenantId: testTenantId,
          siteId: testSiteId,
          typeKey: 'FILTER_TEST',
          description: 'Ticket with custom field value A',
          status: 'NEW',
          priority: 'P2',
          customFields: { test_custom_field: 'value_a' },
        },
      });

      await prisma.ticket.create({
        data: {
          tenantId: testTenantId,
          siteId: testSiteId,
          typeKey: 'FILTER_TEST',
          description: 'Ticket with custom field value B',
          status: 'NEW',
          priority: 'P2',
          customFields: { test_custom_field: 'value_b' },
        },
      });

      await prisma.ticket.create({
        data: {
          tenantId: testTenantId,
          siteId: testSiteId,
          typeKey: 'FILTER_TEST',
          description: 'Ticket without custom field',
          status: 'NEW',
          priority: 'P2',
          customFields: {},
        },
      });
    });

    it('GET /tickets?cf_key&cf_val - should filter tickets by custom field', async () => {
      const response = await request(app.getHttpServer())
        .get('/tickets?cf_key=test_custom_field&cf_val=value_a')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // All returned tickets should have the custom field value
      response.body.forEach((ticket: any) => {
        expect(ticket.customFields).toHaveProperty('test_custom_field');
        expect(ticket.customFields.test_custom_field).toBe('value_a');
      });
    });

    it('GET /tickets?cf_key&cf_val - should return different results for different values', async () => {
      const responseA = await request(app.getHttpServer())
        .get('/tickets?cf_key=test_custom_field&cf_val=value_a')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get('/tickets?cf_key=test_custom_field&cf_val=value_b')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(responseA.body)).toBe(true);
      expect(Array.isArray(responseB.body)).toBe(true);
      
      // Check that tickets are filtered correctly
      const ticketsA = responseA.body.filter((t: any) => 
        t.customFields?.test_custom_field === 'value_a'
      );
      const ticketsB = responseB.body.filter((t: any) => 
        t.customFields?.test_custom_field === 'value_b'
      );
      
      expect(ticketsA.length).toBeGreaterThan(0);
      expect(ticketsB.length).toBeGreaterThan(0);
    });
  });

  describe('Attachment Listing', () => {
    let testTicketForAttachments: string;

    beforeAll(async () => {
      // Create a ticket for attachment testing
      testTicketForAttachments = await prisma.ticket.create({
        data: {
          tenantId: testTenantId,
          siteId: testSiteId,
          typeKey: 'FILTER_TEST',
          description: 'Ticket for attachment listing test',
          status: 'NEW',
          priority: 'P2',
        },
      }).then(t => t.id);

      // Create test attachments
      await prisma.attachment.create({
        data: {
          tenantId: testTenantId,
          ticketId: testTicketForAttachments,
          objectKey: 'test-key-1',
          filename: 'test-file-1.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          checksumSha256: 'checksum1',
        },
      });

      await prisma.attachment.create({
        data: {
          tenantId: testTenantId,
          ticketId: testTicketForAttachments,
          objectKey: 'test-key-2',
          filename: 'test-file-2.png',
          mimeType: 'image/png',
          sizeBytes: 2048,
          checksumSha256: 'checksum2',
        },
      });
    });

    it('GET /tickets/:ticketId/attachments - should list attachments', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tickets/${testTicketForAttachments}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      
      // Check attachment properties
      response.body.forEach((attachment: any) => {
        expect(attachment).toHaveProperty('id');
        expect(attachment).toHaveProperty('ticketId');
        expect(attachment).toHaveProperty('filename');
        expect(attachment).toHaveProperty('mimeType');
        expect(attachment).toHaveProperty('sizeBytes');
        expect(attachment).toHaveProperty('createdAt');
        expect(attachment).toHaveProperty('downloadUrl');
        expect(attachment.ticketId).toBe(testTicketForAttachments);
      });
    });

    it('GET /tickets/:ticketId/attachments - should return empty array for ticket without attachments', async () => {
      const ticketWithoutAttachments = await prisma.ticket.create({
        data: {
          tenantId: testTenantId,
          siteId: testSiteId,
          typeKey: 'FILTER_TEST',
          description: 'Ticket without attachments',
          status: 'NEW',
          priority: 'P2',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/tickets/${ticketWithoutAttachments.id}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('GET /tickets/:ticketId/attachments - should fail without auth', async () => {
      await request(app.getHttpServer())
        .get(`/tickets/${testTicketForAttachments}/attachments`)
        .expect(401);
    });

    it('GET /tickets/:ticketId/attachments - should fail for invalid ticket', async () => {
      await request(app.getHttpServer())
        .get('/tickets/invalid-ticket-id/attachments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('Combined Filtering', () => {
    it('GET /tickets - should support multiple filters at once', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await request(app.getHttpServer())
        .get(`/tickets?status=NEW&priority=P2&assignedUserId=${testUserId}&createdFrom=${today}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // All returned tickets should match all filters
      response.body.forEach((ticket: any) => {
        expect(ticket.status).toBe('NEW');
        expect(ticket.priority).toBe('P2');
        expect(ticket.assignedUserId).toBe(testUserId);
      });
    });
  });
});
