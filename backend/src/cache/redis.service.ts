import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client?: Redis;

  constructor() {
    const url = process.env.REDIS_URL;
    if (url) this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  }

  get enabled() { return Boolean(this.client); }

  async replaceRecentPatients(key: string, entries: Array<{ score: number; value: string }>, ttlSeconds: number) {
    if (!this.client) return false;
    try {
      await this.client.connect().catch(() => undefined);
      const pipeline = this.client.pipeline().del(key);
      for (const entry of entries) pipeline.zadd(key, entry.score, entry.value);
      pipeline.expire(key, ttlSeconds);
      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.warn(`Redis cache write skipped: ${(error as Error).message}`);
      return false;
    }
  }

  async addRecentPatient(key: string, score: number, value: string, cutoff: number, ttlSeconds: number) {
    if (!this.client) return false;
    try {
      await this.client.connect().catch(() => undefined);
      await this.client.multi().zadd(key, score, value).zremrangebyscore(key, 0, cutoff).expire(key, ttlSeconds).exec();
      return true;
    } catch (error) {
      this.logger.warn(`Redis cache write skipped: ${(error as Error).message}`);
      return false;
    }
  }

  async recentPatients(key: string, cutoff: number) {
    if (!this.client) return null;
    try {
      await this.client.connect().catch(() => undefined);
      return await this.client.zrangebyscore(key, cutoff, '+inf');
    } catch (error) {
      this.logger.warn(`Redis cache read skipped: ${(error as Error).message}`);
      return null;
    }
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit().catch(() => undefined);
  }
}
