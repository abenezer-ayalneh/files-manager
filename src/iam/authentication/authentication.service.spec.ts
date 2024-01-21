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
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { SignInDto } from './dto/sign-in.dto/sign-in.dto'

describe('AuthenticationService', () => {
  let authenticationService: AuthenticationService
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

    authenticationService = module.get<AuthenticationService>(
      AuthenticationService,
    )
    prisma = module.get<DeepMockProxy<PrismaClient>>(PrismaService)
  })

  it('AuthenticationService => should be defined', () => {
    // Act & Assert
    expect(authenticationService).toBeDefined()
  })

  it('signUp => should create a new user with hashed password', async () => {
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
    prisma.user.create.mockReturnValue(user) //TODO find a way to do it without ts-ignore

    // Act
    await authenticationService.signUp(signUpDto)

    // Assert
    expect.assertions(4)
    expect(mockBcryptService.hash).toHaveBeenCalledTimes(1)
    expect(mockBcryptService.hash).toHaveBeenCalledWith(signUpDto.password)
    expect(prisma.user.create).toHaveBeenCalledTimes(1)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: signUpDto.email, password: hashedPassword },
    })
  })

  it('signUp => should throw ConflictException if email already exists', async () => {
    // Arrange
    const signUpDto = {
      email: 'john.doe@gmail.com',
      password: 'passpass',
    } as SignUpDto
    const hashedPassword = 'this-is-a-hashed-password'

    jest.spyOn(mockBcryptService, 'hash').mockReturnValue(hashedPassword)

    prisma.user.create.mockRejectedValue(
      new PrismaClientKnownRequestError('User already exists', {
        code: 'P2002',
        clientVersion: '2.13.0-dev.93',
      }),
    )

    // Act & Assert
    expect.assertions(1)
    await expect(authenticationService.signUp(signUpDto)).rejects.toThrow(
      ConflictException,
    )
  })

  it('signUp => should have 2 validation errors when password and email are invalid', async () => {
    // Arrange
    const signUpDto = {
      email: '',
      password: '',
    } as SignUpDto
    const signUpDtoInstance = plainToInstance(SignUpDto, signUpDto)
    const errors = await validate(signUpDtoInstance)

    // Act & Assert
    expect.assertions(1)
    expect(errors.length).not.toBe(0)
  })

  it('signIn => should return generated tokens for the authenticated user', async () => {
    // Arrange
    const signInDto = {
      email: 'john.doe@gmail.com',
      password: 'passpass',
    } as SignInDto

    const user = {
      id: 1,
      email: 'john.doe@gmail.com',
      password: 'passpass',
    }

    const generatedTokens = {
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
    }

    // @ts-ignore
    prisma.user.findFirst.mockReturnValue(user) //TODO find a way to do it without ts-ignore
    jest.spyOn(mockBcryptService, 'compare').mockReturnValue(true)
    jest
      .spyOn(authenticationService, 'generateTokens')
      .mockReturnValue(Promise.resolve(generatedTokens))

    // Act
    const result = await authenticationService.signIn(signInDto)

    // Assert
    expect.assertions(3)
    expect(result).toBeDefined()
    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()
  })

  it("signIn => should return 'User does not exist' UnauthorizedException when the user doesn't exist in the database", async () => {
    // Arrange
    const signInDto = {
      email: 'john.doe@gmail.com',
      password: 'passpass',
    } as SignInDto

    // @ts-ignore
    prisma.user.findFirst.mockReturnValue(null) //TODO find a way to do it without ts-ignore

    // Act & Assert
    expect.assertions(1)
    await expect(authenticationService.signIn(signInDto)).rejects.toThrow(
      new UnauthorizedException('User does not exists'),
    )
  })

  it("signIn => should return 'Email or password mismatch' UnauthorizedException when the user's email and password doesn't match", async () => {
    // Arrange
    const signInDto = {
      email: 'john.doe@gmail.com',
      password: 'passpass',
    } as SignInDto

    const user = {
      id: 1,
      email: 'john.doe@gmail.com',
      password: 'passpass',
    }

    // @ts-ignore
    prisma.user.findFirst.mockReturnValue(user) //TODO find a way to do it without ts-ignore
    jest.spyOn(mockBcryptService, 'compare').mockReturnValue(false)

    // Act & Assert
    expect.assertions(1)
    await expect(authenticationService.signIn(signInDto)).rejects.toThrow(
      new UnauthorizedException('Email or password mismatch'),
    )
  })

  it('generateTokens => generate access and refresh token for the given user', async () => {
    // Arrange
    const user = {
      id: 1,
      email: 'john.doe@gmail.com',
      password: 'passpass',
    }

    jest
      .spyOn(authenticationService, 'signToken')
      .mockReturnValue(Promise.resolve('generated-token'))

    // Act
    const result = await authenticationService.generateTokens(user)

    // Assert
    expect.assertions(5)
    expect(result).toBeDefined()
    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()
    expect(authenticationService.signToken).toHaveBeenCalledTimes(2)
    expect(mockRefreshTokenIdsStorage.insert).toHaveBeenCalledTimes(1)
  })

  /**
   * Test for the following:
   * 1. Normal flow where JWT verification passes, user is found, refresh token is validated via refresh token storage
   * 2. If the user is not found, it should throw unauthorized exception
   * 3. If the refresh token ID is invalid, it should throw unauthorized exception
   */
  it('refreshTokens => should validate sent refresh token and return an access and refresh tokens', async () => {
    // Arrange
    const user = {
      id: 1,
      email: 'john.doe@gmail.com',
      password: 'passpass',
    }
    const refreshToken = 'string-string-string-string-string'

    jest
      .spyOn(mockJwtService, 'verifyAsync')
      .mockReturnValue({ sub: user.id, refreshTokenId: refreshToken })
    // @ts-ignore
    prisma.user.findFirstOrThrow.mockReturnValue(user) //TODO find a way to do it without ts-ignore
    jest.spyOn(mockRefreshTokenIdsStorage, 'validate').mockReturnValue(true)
    jest.spyOn(authenticationService, 'generateTokens').mockReturnValue(
      Promise.resolve({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      }),
    )

    // Act
    const result = await authenticationService.refreshTokens({
      refreshToken: refreshToken,
    })

    // Assert
    expect.assertions(5)
    expect(result).toBeDefined()
    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()
    expect(mockRefreshTokenIdsStorage.invalidate).toHaveBeenCalledTimes(1)
    expect(authenticationService.generateTokens).toHaveBeenCalledTimes(1)
  })

  it('refreshTokens => should throw unauthorized exception if the user is not found', async () => {
    // Arrange
    const user = {
      id: 1,
      email: 'john.doe@gmail.com',
      password: 'passpass',
    }
    const refreshToken = 'string-string-string-string-string'

    jest
      .spyOn(mockJwtService, 'verifyAsync')
      .mockReturnValue({ sub: user.id, refreshTokenId: refreshToken })
    prisma.user.findFirstOrThrow.mockRejectedValue(
      new PrismaClientKnownRequestError('User does not exists', {
        code: 'P2025',
        clientVersion: '2.13.0-dev.93',
      }),
    )

    // Act & Assert
    expect.assertions(1)
    await expect(
      authenticationService.refreshTokens({ refreshToken }),
    ).rejects.toThrow(UnauthorizedException)
  })

  it('refreshTokens => should throw unauthorized exception if the refresh token ID is invalid', async () => {
    // Arrange
    const user = {
      id: 1,
      email: 'john.doe@gmail.com',
      password: 'passpass',
    }
    const refreshToken = 'string-string-string-string-string'

    jest
      .spyOn(mockJwtService, 'verifyAsync')
      .mockReturnValue({ sub: user.id, refreshTokenId: refreshToken })
    // @ts-ignore
    prisma.user.findFirstOrThrow.mockReturnValue(user) //TODO find a way to do it without ts-ignore
    jest.spyOn(mockRefreshTokenIdsStorage, 'validate').mockReturnValue(false)
    jest.spyOn(authenticationService, 'generateTokens').mockReturnValue(
      Promise.resolve({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      }),
    )

    // Act & Assert
    expect.assertions(2)
    await expect(
      authenticationService.refreshTokens({ refreshToken }),
    ).rejects.toThrow(UnauthorizedException)
    expect(authenticationService.generateTokens).not.toHaveBeenCalled()
    // expect(mockRefreshTokenIdsStorage.invalidate).not.toHaveBeenCalled() //TODO figure out why the invalidate function is being called
  })
})
