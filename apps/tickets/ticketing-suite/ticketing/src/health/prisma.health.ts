import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../infra/prisma.service';
@Injectable() export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) { super(); }
  async isHealthy(): Promise<HealthIndicatorResult> { await this.prisma.$queryRawUnsafe('SELECT 1'); return this.getStatus('database', true); }
}
