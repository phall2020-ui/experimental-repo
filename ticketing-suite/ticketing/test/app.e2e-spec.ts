import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/prisma.service';

describe('Ticketing System E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testTenantId: string;
  let testSiteId: string;
  let testUserId: string;
  let testTicketId: string;
  let testCommentId: string;
  let testAttachmentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Clean up and prepare test data
    await setupTestData();
    authToken = generateDevToken();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test tenant
    testTenantId = 'test-tenant-' + Date.now();
    await prisma.tenant.create({
      data: {
        id: testTenantId,
        name: 'Test Tenant',
      },
    });

    // Create test site
    testSiteId = 'test-site-' + Date.now();
    await prisma.site.create({
      data: {
        id: testSiteId,
        tenantId: testTenantId,
        name: 'Test Site',
        location: 'Test Location',
      },
    });

    // Create test user
    testUserId = 'test-user-' + Date.now();
    await prisma.user.create({
      data: {
        id: testUserId,
        tenantId: testTenantId,
        email: `test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Test User',
        role: 'USER',
      },
    });

    // Create test issue type
    await prisma.issueType.create({
      data: {
        tenantId: testTenantId,
        key: 'TEST_TYPE',
        label: 'Test Issue Type',
        active: true,
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

  describe('Health Checks', () => {
    it('GET /health - should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
        });
    });
  });

  describe('Directory Module', () => {
    it('GET /directory/sites - should list sites', () => {
      return request(app.getHttpServer())
        .get('/directory/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('name');
        });
    });

    it('GET /directory/users - should list users', () => {
      return request(app.getHttpServer())
        .get('/directory/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('email');
          expect(res.body[0]).toHaveProperty('name');
        });
    });

    it('GET /directory/issue-types - should list issue types', () => {
      return request(app.getHttpServer())
        .get('/directory/issue-types')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('key');
          expect(res.body[0]).toHaveProperty('label');
        });
    });

    it('GET /directory/sites - should fail without auth', () => {
      return request(app.getHttpServer())
        .get('/directory/sites')
        .expect(401);
    });
  });

  describe('Tickets Module - CRUD Operations', () => {
    it('POST /tickets - should create a new ticket', () => {
      return request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          siteId: testSiteId,
          type: 'TEST_TYPE',
          description: 'Test ticket description',
          status: 'NEW',
          priority: 'P2',
          details: 'Test ticket details',
          assignedUserId: testUserId,
          custom_fields: { testField: 'testValue' },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.description).toBe('Test ticket description');
          expect(res.body.status).toBe('NEW');
          expect(res.body.priority).toBe('P2');
          testTicketId = res.body.id;
        });
    });

    it('GET /tickets - should list all tickets', () => {
      return request(app.getHttpServer())
        .get('/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('description');
        });
    });

    it('GET /tickets?status=NEW - should filter tickets by status', () => {
      return request(app.getHttpServer())
        .get('/tickets?status=NEW')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0].status).toBe('NEW');
          }
        });
    });

    it('GET /tickets?priority=P2 - should filter tickets by priority', () => {
      return request(app.getHttpServer())
        .get('/tickets?priority=P2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0].priority).toBe('P2');
          }
        });
    });

    it('GET /tickets?search=test - should search tickets', () => {
      return request(app.getHttpServer())
        .get('/tickets?search=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /tickets/:id - should get a specific ticket', () => {
      return request(app.getHttpServer())
        .get(`/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testTicketId);
          expect(res.body).toHaveProperty('description');
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('priority');
        });
    });

    it('PATCH /tickets/:id - should update a ticket', () => {
      return request(app.getHttpServer())
        .patch(`/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated test ticket description',
          status: 'IN_PROGRESS',
          priority: 'P1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testTicketId);
          expect(res.body.description).toBe('Updated test ticket description');
          expect(res.body.status).toBe('IN_PROGRESS');
          expect(res.body.priority).toBe('P1');
        });
    });

    it('GET /tickets/:id/history - should get ticket history', () => {
      return request(app.getHttpServer())
        .get(`/tickets/${testTicketId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('POST /tickets - should fail without auth', () => {
      return request(app.getHttpServer())
        .post('/tickets')
        .send({
          siteId: testSiteId,
          type: 'TEST_TYPE',
          description: 'Test ticket',
          status: 'NEW',
          priority: 'P2',
        })
        .expect(401);
    });

    it('POST /tickets - should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          description: 'Test ticket',
        })
        .expect(400);
    });
  });

  describe('Comments Module', () => {
    it('POST /tickets/:ticketId/comments - should add a comment', () => {
      return request(app.getHttpServer())
        .post(`/tickets/${testTicketId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          body: 'This is a test comment',
          visibility: 'INTERNAL',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.body).toBe('This is a test comment');
          expect(res.body.visibility).toBe('INTERNAL');
          testCommentId = res.body.id;
        });
    });

    it('GET /tickets/:ticketId/comments - should list comments', () => {
      return request(app.getHttpServer())
        .get(`/tickets/${testTicketId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('body');
          expect(res.body[0]).toHaveProperty('visibility');
        });
    });

    it('POST /tickets/:ticketId/comments - should fail without auth', () => {
      return request(app.getHttpServer())
        .post(`/tickets/${testTicketId}/comments`)
        .send({
          body: 'Test comment',
          visibility: 'INTERNAL',
        })
        .expect(401);
    });

    it('POST /tickets/:ticketId/comments - should validate body field', () => {
      return request(app.getHttpServer())
        .post(`/tickets/${testTicketId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing body field
          visibility: 'INTERNAL',
        })
        .expect(400);
    });
  });

  describe('Attachments Module', () => {
    it('POST /tickets/:ticketId/attachments/presign - should create presigned URL', () => {
      return request(app.getHttpServer())
        .post(`/tickets/${testTicketId}/attachments/presign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'test-file.pdf',
          mime: 'application/pdf',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('attachment_id');
          expect(res.body).toHaveProperty('upload_url');
          expect(res.body).toHaveProperty('object_key');
          testAttachmentId = res.body.attachment_id;
        });
    });

    it('POST /tickets/:ticketId/attachments/:attachmentId/finalize - should finalize upload', () => {
      return request(app.getHttpServer())
        .post(`/tickets/${testTicketId}/attachments/${testAttachmentId}/finalize`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          size: 1024,
          checksumSha256: 'abc123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.sizeBytes).toBe(1024);
          expect(res.body.checksumSha256).toBe('abc123');
        });
    });

    it('POST /tickets/:ticketId/attachments/presign - should fail without auth', () => {
      return request(app.getHttpServer())
        .post(`/tickets/${testTicketId}/attachments/presign`)
        .send({
          filename: 'test-file.pdf',
          mime: 'application/pdf',
        })
        .expect(401);
    });

    it('POST /tickets/:ticketId/attachments/presign - should validate required fields', () => {
      return request(app.getHttpServer())
        .post(`/tickets/${testTicketId}/attachments/presign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          filename: 'test-file.pdf',
        })
        .expect(400);
    });
  });

  describe('Attachments Module - List and Delete', () => {
    it('GET /tickets/:ticketId/attachments - should list attachments', () => {
      return request(app.getHttpServer())
        .get(`/tickets/${testTicketId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('filename');
          expect(res.body[0]).toHaveProperty('downloadUrl');
        });
    });

    it('DELETE /tickets/:ticketId/attachments/:id - should delete attachment', () => {
      return request(app.getHttpServer())
        .delete(`/tickets/${testTicketId}/attachments/${testAttachmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body.success).toBe(true);
        });
    });

    it('GET /tickets/:ticketId/attachments - should fail without auth', () => {
      return request(app.getHttpServer())
        .get(`/tickets/${testTicketId}/attachments`)
        .expect(401);
    });
  });

  describe('Comments Module - Edit and Delete', () => {
    it('PATCH /tickets/:ticketId/comments/:id - should update comment', () => {
      return request(app.getHttpServer())
        .patch(`/tickets/${testTicketId}/comments/${testCommentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          body: 'Updated test comment',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.body).toBe('Updated test comment');
        });
    });

    it('DELETE /tickets/:ticketId/comments/:id - should delete comment', () => {
      return request(app.getHttpServer())
        .delete(`/tickets/${testTicketId}/comments/${testCommentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body.success).toBe(true);
        });
    });

    it('PATCH /tickets/:ticketId/comments/:id - should fail without auth', () => {
      return request(app.getHttpServer())
        .patch(`/tickets/${testTicketId}/comments/${testCommentId}`)
        .send({
          body: 'Updated comment',
        })
        .expect(401);
    });
  });

  describe('User Management', () => {
    let testUser2Id: string;

    it('PATCH /users/:id - should update user', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Test User',
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Updated Test User');
    });

    it('PATCH /users/me - should update own profile', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Self Updated User',
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Self Updated User');
    });

    it('POST /users/me/change-password - should change own password', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/me/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          oldPassword: 'hashed-password',
          newPassword: 'new-password',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('POST /auth/register - should create new user for testing', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `test-user-2-${Date.now()}@example.com`,
          password: 'test-password',
          name: 'Test User 2',
          role: 'USER',
          tenantId: testTenantId,
        })
        .expect(201);

      testUser2Id = response.body.id;
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
    });

    it('POST /users/:id/reset-password - should reset user password', async () => {
      const response = await request(app.getHttpServer())
        .post(`/users/${testUser2Id}/reset-password`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'reset-password',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });

    it('DELETE /users/:id - should delete user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${testUser2Id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });

    it('PATCH /users/:id - should fail without auth', () => {
      return request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .send({
          name: 'Updated User',
        })
        .expect(401);
    });
  });

  describe('Issue Type Management', () => {
    let testIssueTypeId: string;

    it('POST /directory/issue-types - should create issue type', async () => {
      const response = await request(app.getHttpServer())
        .post('/directory/issue-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'TEST_ISSUE_TYPE',
          label: 'Test Issue Type',
        })
        .expect(201);

      testIssueTypeId = response.body.id;
      expect(response.body).toHaveProperty('id');
      expect(response.body.key).toBe('TEST_ISSUE_TYPE');
      expect(response.body.label).toBe('Test Issue Type');
    });

    it('PATCH /directory/issue-types/:id - should update issue type', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/directory/issue-types/${testIssueTypeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          label: 'Updated Issue Type',
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.label).toBe('Updated Issue Type');
    });

    it('DELETE /directory/issue-types/:id - should deactivate issue type', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/directory/issue-types/${testIssueTypeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('active');
      expect(response.body.active).toBe(false);
    });

    it('POST /directory/issue-types - should fail without auth', () => {
      return request(app.getHttpServer())
        .post('/directory/issue-types')
        .send({
          key: 'TEST_TYPE',
          label: 'Test Type',
        })
        .expect(401);
    });
  });

  describe('Field Definition Management', () => {
    let testFieldDefId: string;

    it('POST /directory/field-definitions - should create field definition', async () => {
      const response = await request(app.getHttpServer())
        .post('/directory/field-definitions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'test_field',
          label: 'Test Field',
          datatype: 'string',
          required: false,
        })
        .expect(201);

      testFieldDefId = response.body.id;
      expect(response.body).toHaveProperty('id');
      expect(response.body.key).toBe('test_field');
      expect(response.body.label).toBe('Test Field');
      expect(response.body.datatype).toBe('string');
    });

    it('PATCH /directory/field-definitions/:id - should update field definition', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/directory/field-definitions/${testFieldDefId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          label: 'Updated Field',
          required: true,
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.label).toBe('Updated Field');
      expect(response.body.required).toBe(true);
    });

    it('DELETE /directory/field-definitions/:id - should delete field definition', async () => {
      await request(app.getHttpServer())
        .delete(`/directory/field-definitions/${testFieldDefId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('POST /directory/field-definitions - should fail without auth', () => {
      return request(app.getHttpServer())
        .post('/directory/field-definitions')
        .send({
          key: 'test_field',
          label: 'Test Field',
          datatype: 'string',
        })
        .expect(401);
    });
  });

  describe('Multi-tenancy Isolation', () => {
    let otherTenantToken: string;
    let otherTenantId: string;

    beforeAll(async () => {
      // Create another tenant
      otherTenantId = 'other-tenant-' + Date.now();
      await prisma.tenant.create({
        data: {
          id: otherTenantId,
          name: 'Other Tenant',
        },
      });

      const payload = {
        sub: 'other-user',
        tenantId: otherTenantId,
        roles: ['USER'],
        email: 'other@example.com',
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
      otherTenantToken = base64url(header) + '.' + base64url(payload) + '.dev-signature';
    });

    afterAll(async () => {
      await prisma.tenant.delete({
        where: { id: otherTenantId },
      }).catch(() => {});
    });

    it('GET /tickets - should not see tickets from other tenant', () => {
      return request(app.getHttpServer())
        .get('/tickets')
        .set('Authorization', `Bearer ${otherTenantToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Should not contain testTicketId from other tenant
          const containsOtherTenantTicket = res.body.some(
            (ticket: any) => ticket.id === testTicketId,
          );
          expect(containsOtherTenantTicket).toBe(false);
        });
    });

    it('GET /tickets/:id - should not access ticket from other tenant', () => {
      return request(app.getHttpServer())
        .get(`/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${otherTenantToken}`)
        .expect((res) => {
          // Should return 404 or empty result, not the ticket
          expect(res.status).not.toBe(200);
        });
    });

    it('GET /directory/sites - should only see own tenant sites', () => {
      return request(app.getHttpServer())
        .get('/directory/sites')
        .set('Authorization', `Bearer ${otherTenantToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Should not contain testSiteId from other tenant
          const containsOtherTenantSite = res.body.some(
            (site: any) => site.id === testSiteId,
          );
          expect(containsOtherTenantSite).toBe(false);
        });
    });
  });

  describe('Error Handling', () => {
    it('GET /tickets/invalid-id - should return 404 for non-existent ticket', () => {
      return request(app.getHttpServer())
        .get('/tickets/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBe(404);
        });
    });

    it('PATCH /tickets/invalid-id - should return 404 for non-existent ticket', () => {
      return request(app.getHttpServer())
        .patch('/tickets/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated description',
        })
        .expect((res) => {
          expect(res.status).toBe(404);
        });
    });

    it('POST /tickets/:ticketId/comments - should return 404 for non-existent ticket', () => {
      return request(app.getHttpServer())
        .post('/tickets/00000000-0000-0000-0000-000000000000/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          body: 'Test comment',
          visibility: 'INTERNAL',
        })
        .expect((res) => {
          expect(res.status).toBe(404);
        });
    });
  });

  describe('Integration Flow - Complete Ticket Lifecycle', () => {
    let flowTicketId: string;

    it('should complete full ticket lifecycle', async () => {
      // Step 1: Create a new ticket
      const createResponse = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          siteId: testSiteId,
          type: 'TEST_TYPE',
          description: 'Lifecycle test ticket',
          status: 'NEW',
          priority: 'P1',
          details: 'Testing complete lifecycle',
        })
        .expect(201);

      flowTicketId = createResponse.body.id;
      expect(createResponse.body.status).toBe('NEW');

      // Step 2: Add a comment to the ticket
      const commentResponse = await request(app.getHttpServer())
        .post(`/tickets/${flowTicketId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          body: 'Initial comment on ticket',
          visibility: 'INTERNAL',
        })
        .expect(201);

      expect(commentResponse.body.body).toBe('Initial comment on ticket');

      // Step 3: Update ticket to IN_PROGRESS
      const updateResponse = await request(app.getHttpServer())
        .patch(`/tickets/${flowTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'IN_PROGRESS',
          assignedUserId: testUserId,
        })
        .expect(200);

      expect(updateResponse.body.status).toBe('IN_PROGRESS');
      expect(updateResponse.body.assignedUserId).toBe(testUserId);

      // Step 4: Add another comment
      await request(app.getHttpServer())
        .post(`/tickets/${flowTicketId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          body: 'Work in progress comment',
          visibility: 'PUBLIC',
        })
        .expect(201);

      // Step 5: Create presigned URL for attachment
      const presignResponse = await request(app.getHttpServer())
        .post(`/tickets/${flowTicketId}/attachments/presign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'work-log.pdf',
          mime: 'application/pdf',
        })
        .expect(201);

      const attachmentId = presignResponse.body.attachment_id;
      expect(presignResponse.body).toHaveProperty('upload_url');

      // Step 6: Finalize attachment
      await request(app.getHttpServer())
        .post(`/tickets/${flowTicketId}/attachments/${attachmentId}/finalize`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          size: 2048,
          checksumSha256: 'def456',
        })
        .expect(201);

      // Step 7: Get comments list
      const commentsResponse = await request(app.getHttpServer())
        .get(`/tickets/${flowTicketId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(commentsResponse.body.length).toBe(2);

      // Step 8: Get ticket history
      const historyResponse = await request(app.getHttpServer())
        .get(`/tickets/${flowTicketId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(historyResponse.body)).toBe(true);

      // Step 9: Update ticket to RESOLVED
      const resolveResponse = await request(app.getHttpServer())
        .patch(`/tickets/${flowTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'RESOLVED',
        })
        .expect(200);

      expect(resolveResponse.body.status).toBe('RESOLVED');

      // Step 10: Verify final state
      const finalResponse = await request(app.getHttpServer())
        .get(`/tickets/${flowTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalResponse.body.status).toBe('RESOLVED');
      expect(finalResponse.body.assignedUserId).toBe(testUserId);
    });
  });
});
