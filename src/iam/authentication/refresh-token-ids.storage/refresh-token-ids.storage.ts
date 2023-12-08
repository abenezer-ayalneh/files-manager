import { Injectable } from '@nestjs/common'
import { RedisService } from '../../../redis/redis.service'

@Injectable()
export class RefreshTokenIdsStorage {
  constructor(private readonly redisService: RedisService) {}

  onApplicationShutdown(): any {
    return this.redisService.redisClient.quit()
  }

  private getKey(userId: number): string {
    return `user-${userId}`
  }

  async insert(userId: number, tokenId: string): Promise<void> {
    await this.redisService.redisClient.set(this.getKey(userId), tokenId)
  }

  async validate(userId: number, tokenId: string): Promise<boolean> {
    const storedId = await this.redisService.redisClient.get(
      this.getKey(userId),
    )
    return storedId === tokenId
  }

  async invalidate(userId: number): Promise<void> {
    await this.redisService.redisClient.del(this.getKey(userId))
  }
}
