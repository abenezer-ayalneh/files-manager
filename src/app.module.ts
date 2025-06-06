import { Logger, Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'
import { IamModule } from './iam/iam.module'
import { PrismaModule } from './prisma/prisma.module'
import { GameModule } from './game/game.module'
import { APP_FILTER } from '@nestjs/core'
import GlobalExceptionFilter from './utils/filters/global-exception.filter'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IamModule,
    GameModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Logger,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
