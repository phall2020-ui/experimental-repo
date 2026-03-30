import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Features Endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/features (GET)', () => {
    it('should return feature availability status', () => {
      return request(app.getHttpServer())
        .get('/features')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('search');
          expect(res.body).toHaveProperty('attachments');
          expect(typeof res.body.search).toBe('boolean');
          expect(typeof res.body.attachments).toBe('boolean');
        });
    });

    it('should disable search when OPENSEARCH_NODE is not set', () => {
      const originalValue = process.env.OPENSEARCH_NODE;
      delete process.env.OPENSEARCH_NODE;

      return request(app.getHttpServer())
        .get('/features')
        .expect(200)
        .expect((res) => {
          expect(res.body.search).toBe(false);
        })
        .then(() => {
          // Restore original value
          if (originalValue !== undefined) {
            process.env.OPENSEARCH_NODE = originalValue;
          }
        });
    });

    it('should disable attachments when S3_BUCKET is not set', () => {
      const originalBucket = process.env.S3_BUCKET;
      const originalRegion = process.env.AWS_REGION;
      delete process.env.S3_BUCKET;
      delete process.env.AWS_REGION;

      return request(app.getHttpServer())
        .get('/features')
        .expect(200)
        .expect((res) => {
          expect(res.body.attachments).toBe(false);
        })
        .then(() => {
          // Restore original values
          if (originalBucket !== undefined) {
            process.env.S3_BUCKET = originalBucket;
          }
          if (originalRegion !== undefined) {
            process.env.AWS_REGION = originalRegion;
          }
        });
    });
  });
});
