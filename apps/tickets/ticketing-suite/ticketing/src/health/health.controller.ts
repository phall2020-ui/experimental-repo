import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';
@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService, private prisma: PrismaHealthIndicator, private redis: RedisHealthIndicator) {}
  @Get() @HealthCheck() check() { return this.health.check([ () => this.prisma.isHealthy(), () => this.redis.isHealthy() ]); }
}
