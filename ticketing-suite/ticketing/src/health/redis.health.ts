import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import IORedis from 'ioredis';

@Injectable() 
export class RedisHealthIndicator extends HealthIndicator {
  private redis: IORedis | null = null;
  private connectionError: string | null = null;

  constructor() { 
    super(); 
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
      // IORedis automatically handles both redis:// and rediss:// protocols
      this.redis = new IORedis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000);
        }
      });

      this.redis.on('error', (error) => {
        this.connectionError = error.message;
        console.warn('Redis connection error:', error.message);
      });

      this.redis.on('connect', () => {
        this.connectionError = null;
      });
    } catch (error: any) {
      this.connectionError = error.message;
      console.warn('Redis initialization failed:', error.message);
    }
  }

  async isHealthy(): Promise<HealthIndicatorResult> { 
    if (!this.redis) {
      return this.getStatus('redis', false, { message: 'Redis client not initialized' });
    }

    try { 
      const pong = await this.redis.ping(); 
      return this.getStatus('redis', pong === 'PONG', { 
        message: pong === 'PONG' ? 'Connected' : 'Unexpected response' 
      }); 
    } catch (error: any) { 
      return this.getStatus('redis', false, { 
        message: this.connectionError || error.message || 'Connection failed' 
      }); 
    } 
  }
}
