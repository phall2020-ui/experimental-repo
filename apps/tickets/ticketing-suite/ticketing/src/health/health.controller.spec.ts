import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let prismaHealth: PrismaHealthIndicator;
  let redisHealth: RedisHealthIndicator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
        {
          provide: RedisHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    prismaHealth = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
    redisHealth = module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health check results', async () => {
    const mockHealthResult = {
      status: 'ok',
      info: {
        database: { status: 'up' },
        redis: { status: 'up' },
      },
      error: {},
      details: {
        database: { status: 'up' },
        redis: { status: 'up' },
      },
    };

    jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockHealthResult as any);
    jest.spyOn(prismaHealth, 'isHealthy').mockResolvedValue({ database: { status: 'up' } } as HealthIndicatorResult);
    jest.spyOn(redisHealth, 'isHealthy').mockResolvedValue({ redis: { status: 'up' } } as HealthIndicatorResult);

    const result = await controller.check();

    expect(result).toBeDefined();
    expect(healthCheckService.check).toHaveBeenCalled();
  });

  it('should call both health indicators', async () => {
    const mockHealthResult = {
      status: 'ok',
      info: {},
      error: {},
      details: {},
    };

    jest.spyOn(healthCheckService, 'check').mockImplementation(async (checks) => {
      // Execute the health check functions
      for (const check of checks) {
        await check();
      }
      return mockHealthResult as any;
    });

    const prismaSpy = jest.spyOn(prismaHealth, 'isHealthy').mockResolvedValue({ database: { status: 'up' } } as HealthIndicatorResult);
    const redisSpy = jest.spyOn(redisHealth, 'isHealthy').mockResolvedValue({ redis: { status: 'up' } } as HealthIndicatorResult);

    await controller.check();

    expect(prismaSpy).toHaveBeenCalled();
    expect(redisSpy).toHaveBeenCalled();
  });
});
