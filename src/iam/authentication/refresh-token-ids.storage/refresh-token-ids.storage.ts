import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common'
import Redis from 'ioredis'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class RefreshTokenIdsStorage
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private redisClient: Redis

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap(): any {
    //TODO: Ideally, this should be moved to a separate redis module
    this.redisClient = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
    })
  }

  onApplicationShutdown(): any {
    return this.redisClient.quit()
  }

  private getKey(userId: number): string {
    return `user-${userId}`
  }

  async insert(userId: number, tokenId: string): Promise<void> {
    await this.redisClient.set(this.getKey(userId), tokenId)
  }

  async validate(userId: number, tokenId: string): Promise<boolean> {
    const storedId = await this.redisClient.get(this.getKey(userId))
    return storedId === tokenId
  }

  async invalidate(userId: number): Promise<void> {
    await this.redisClient.del(this.getKey(userId))
  }
}
