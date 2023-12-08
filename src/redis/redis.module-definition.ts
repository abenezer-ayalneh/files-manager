import { ConfigurableModuleBuilder } from '@nestjs/common'
import { RedisOptions } from 'ioredis'

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<RedisOptions>().build()
