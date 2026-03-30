import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../infra/prisma.service';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';
@Module({ imports: [TerminusModule], controllers: [HealthController], providers: [PrismaService, PrismaHealthIndicator, RedisHealthIndicator] })
export class HealthModule {}
