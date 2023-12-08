import { Module } from '@nestjs/common'
import { HashingService } from './hashing/hashing.service'
import { BcryptService } from './hashing/bcrypt.service'
import { AuthenticationController } from './authentication/authentication.controller'
import { AuthenticationService } from './authentication/authentication.service'
import { JwtModule } from '@nestjs/jwt'
import jwtConfig from './config/jwt.config'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { AuthenticationGuard } from './authentication/guards/authentication/authentication.guard'
import { AccessTokenGuard } from './authentication/guards/access-token/access-token.guard'
import { RefreshTokenIdsStorage } from './authentication/refresh-token-ids.storage/refresh-token-ids.storage'
import { RedisModule } from '../redis/redis.module'

@Module({
  imports: [
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    RedisModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        host: config.get('REDIS_HOST'),
        port: config.get('REDIS_PORT'),
      }),
    }),
  ],
  providers: [
    {
      provide: HashingService,
      useClass: BcryptService,
    },
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    AccessTokenGuard,
    RefreshTokenIdsStorage,
    AuthenticationService,
  ],
  controllers: [AuthenticationController],
})
export class IamModule {}
