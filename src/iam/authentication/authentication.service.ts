import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { HashingService } from '../hashing/hashing.service'
import { SignUpDto } from './dto/sign-up.dto/sign-up.dto'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { SignInDto } from './dto/sign-in.dto/sign-in.dto'

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
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

    return true
  }
}
