import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { HashingService } from '../hashing/hashing.service'
import { SignUpDto } from './dto/sign-up.dto/sign-up.dto'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { SignInDto } from './dto/sign-in.dto/sign-in.dto'
import { JwtService } from '@nestjs/jwt'
import jwtConfig from '../config/jwt.config'
import { ConfigType } from '@nestjs/config'
import { ActiveUserData } from '../interfaces/active-user-data.interface'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { User } from '@prisma/client'

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    try {
      const password = await this.hashingService.hash(signUpDto.password)
      await this.prismaService.user.create({
        data: { email: signUpDto.email, password },
      })
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ConflictException()
        }
      }
      throw e
    }
  }

  async signIn(signInDto: SignInDto) {
    const user = await this.prismaService.user.findFirst({
      where: { email: signInDto.email },
    })
    if (!user) {
      throw new UnauthorizedException('User does not exists')
    }

    const isEqual = await this.hashingService.compare(
      signInDto.password,
      user.password,
    )
    if (!isEqual) {
      throw new UnauthorizedException('Email or password mismatch')
    }

    return await this.generateTokens(user)
  }

  async generateTokens(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Partial<ActiveUserData>>(
        user.id,
        this.jwtConfiguration.accessTokenTtl,
        { email: user.email },
      ),
      this.signToken(user.id, this.jwtConfiguration.refreshTokenTtl),
    ])
    return { accessToken, refreshToken }
  }

  async signToken<T>(userId: number, expiresIn: number, payload?: T) {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        ...payload,
      },
      {
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.secret,
        expiresIn: this.jwtConfiguration.accessTokenTtl,
      },
    )
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    try {
      const { sub } = await this.jwtService.verifyAsync<
        Pick<ActiveUserData, 'sub'>
      >(refreshTokenDto.refreshToken, {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      })

      const user = await this.prismaService.user.findFirstOrThrow({
        where: { id: sub },
      })

      return this.generateTokens(user)
    } catch (e) {
      throw new UnauthorizedException()
    }
  }
}
