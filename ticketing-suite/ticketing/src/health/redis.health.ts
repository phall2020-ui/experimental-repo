import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import IORedis from 'ioredis';
@Injectable() export class RedisHealthIndicator extends HealthIndicator {
  private redis: IORedis;
  constructor() { super(); const url = process.env.REDIS_URL || 'redis://localhost:6379'; this.redis = new IORedis(url); }
  async isHealthy(): Promise<HealthIndicatorResult> { try { const pong = await this.redis.ping(); return this.getStatus('redis', pong === 'PONG'); } catch { return this.getStatus('redis', false); } }
}
