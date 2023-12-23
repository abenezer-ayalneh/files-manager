import { Test, TestingModule } from '@nestjs/testing'
import { AuthenticationService } from './authentication.service'
import { PrismaService } from '../../prisma/prisma.service'
import { HashingService } from '../hashing/hashing.service'
import { JwtService } from '@nestjs/jwt'
import process from 'process'
import jwtConfig from "../config/jwt.config";
import { RefreshTokenIdsStorage } from "./refresh-token-ids.storage/refresh-token-ids.storage";

describe('AuthenticationService', () => {
  let service: AuthenticationService
  let prisma: PrismaService
  const mockHashingService = {
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
        { provide: HashingService, useValue: mockHashingService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: jwtConfig.KEY, useValue: mockJwtConfiguration },
        { provide: RefreshTokenIdsStorage, useValue: mockRefreshTokenIdsStorage },
      ],
    }).compile()

    service = module.get<AuthenticationService>(AuthenticationService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
