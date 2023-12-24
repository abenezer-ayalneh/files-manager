import { Test, TestingModule } from '@nestjs/testing'
import { AuthenticationService } from './authentication.service'
import { PrismaService } from '../../prisma/prisma.service'
import { JwtService } from '@nestjs/jwt'
import jwtConfig from '../config/jwt.config'
import { RefreshTokenIdsStorage } from './refresh-token-ids.storage/refresh-token-ids.storage'
import { SignUpDto } from './dto/sign-up.dto/sign-up.dto'
import { DeepMockProxy, mockDeep } from 'jest-mock-extended'
import { PrismaClient, User } from '@prisma/client'
import { HashingService } from '../hashing/hashing.service'
import { AuthenticationController } from "./authentication.controller";

describe('AuthenticationService', () => {
  let service: AuthenticationService
  let prisma: DeepMockProxy<PrismaClient>
  const mockBcryptService = {
    hash: jest.fn(),
    compare: jest.fn(),
  }
  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  }
  const mockJwtConfiguration = {
    secret: '33MDF2rsjXjnuguK4wiv7TORMJimHLdgiOBupn0r5IfhVQ6K',
    audience: 'http://localhost:3000',
    issuer: 'http://localhost:3000',
    accessTokenTtl: parseInt('3600', 10),
    refreshTokenTtl: parseInt('86400', 10),
  }
  const mockRefreshTokenIdsStorage = {
    insert: jest.fn(),
    validate: jest.fn(),
    invalidate: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        PrismaService,
        { provide: HashingService, useValue: mockBcryptService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: jwtConfig.KEY, useValue: mockJwtConfiguration },
        {
          provide: RefreshTokenIdsStorage,
          useValue: mockRefreshTokenIdsStorage,
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockDeep<PrismaClient>())
      .compile()

    service = module.get<AuthenticationService>(AuthenticationService)
    prisma = module.get<DeepMockProxy<PrismaClient>>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('signUp => Should create a user', async () => {
    // Arrange
    const signUpDto = {
      email: 'john.doe@gmail.com',
      password: 'passpass',
    } as SignUpDto
    const hashedPassword = 'this-is-a-hashed-password'
    const user = {
      id: 1,
      email: signUpDto.email,
      password: hashedPassword,
    } as User

    jest.spyOn(mockBcryptService, 'hash').mockReturnValue(hashedPassword)
    // @ts-ignore
    prisma.user.create.mockReturnValue(user)

    // Act
    const result = await service.signUp(signUpDto)

    // Assert
    expect.assertions(4)
    expect(mockBcryptService.hash).toHaveBeenCalledTimes(1)
    expect(mockBcryptService.hash).toHaveBeenCalledWith(signUpDto.password)
    expect(prisma.user.create).toHaveBeenCalledTimes(1)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: signUpDto.email, password: hashedPassword },
    })
  })
})
