import { registerAs } from '@nestjs/config'
import * as process from 'process'

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  audience: process.env.JWT_TOKEN_AUDIENCE,
  issuer: process.env.JWT_TOKEN_ISSUER,
  accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL,
}))
