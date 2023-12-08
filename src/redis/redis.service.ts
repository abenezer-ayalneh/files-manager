import { Inject, Injectable } from '@nestjs/common'
import Redis, { RedisOptions } from 'ioredis'
import { MODULE_OPTIONS_TOKEN } from './redis.module-definition'

@Injectable()
export class RedisService {
  redisClient: Redis

  constructor(@Inject(MODULE_OPTIONS_TOKEN) private options: RedisOptions) {
    this.redisClient = new Redis({
      host: options.host,
      port: options.port,
    })
  }
}
