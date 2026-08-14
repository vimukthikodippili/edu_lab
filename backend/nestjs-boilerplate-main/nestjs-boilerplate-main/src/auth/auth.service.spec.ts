import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRepository } from '../users/infrastructure/persistence/user.repository';
import { SessionService } from '../session/session.service';
import { MailService } from '../mail/mail.service';
import { AuthProvidersEnum } from './auth-providers.enum';
import { User } from '../users/domain/user';

jest.mock('bcryptjs');

const USER_ID = 1;

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    email: 'user@sims.edu.lk',
    password: 'hashed-password',
    provider: AuthProvidersEnum.email,
    socialId: null,
    firstName: 'Test',
    lastName: 'User',
    role: { id: 1, name: 'Admin' } as User['role'],
    status: { id: 1, name: 'Active' } as User['status'],
    failedLoginAttempts: 0,
    lockedUntil: null,
    passwordResetHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as unknown as Date,
    ...overrides,
  } as User;
}

const AUTH_CONFIG: Record<string, unknown> = {
  'auth.secret': 'secret',
  'auth.expires': '15m',
  'auth.refreshSecret': 'refresh-secret',
  'auth.refreshExpires': '3650d',
  'auth.forgotSecret': 'forgot-secret',
  'auth.forgotExpires': '30m',
  'auth.maxLoginAttempts': 5,
  'auth.lockoutDurationMinutes': 15,
};

describe('AuthService — login lockout & password reset (QA follow-up)', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; findById: jest.Mock; update: jest.Mock };
  let userRepository: { update: jest.Mock };
  let sessionService: { create: jest.Mock; deleteByUserId: jest.Mock };
  let mailService: { forgotPassword: jest.Mock };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      update: jest.fn((id, data) => Promise.resolve({ ...data, id })),
    };
    userRepository = { update: jest.fn().mockResolvedValue(undefined) };
    sessionService = {
      create: jest.fn().mockResolvedValue({ id: 'session-1' }),
      deleteByUserId: jest.fn().mockResolvedValue(undefined),
    };
    mailService = { forgotPassword: jest.fn().mockResolvedValue(undefined) };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: UsersService, useValue: usersService },
        { provide: UserRepository, useValue: userRepository },
        { provide: SessionService, useValue: sessionService },
        { provide: MailService, useValue: mailService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => AUTH_CONFIG[key] },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('validateLogin — lockout (AI-prompt-requested)', () => {
    it('locks the account once failed attempts reach the configured max', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      usersService.findByEmail.mockResolvedValue(buildUser({ failedLoginAttempts: 4 }));

      await expect(
        service.validateLogin({ email: 'user@sims.edu.lk', password: 'wrong' }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(userRepository.update).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ failedLoginAttempts: 5, lockedUntil: expect.any(Date) }),
      );
    });

    it('does not lock before the max is reached, and keeps lockedUntil null', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      usersService.findByEmail.mockResolvedValue(buildUser({ failedLoginAttempts: 1 }));

      await expect(
        service.validateLogin({ email: 'user@sims.edu.lk', password: 'wrong' }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(userRepository.update).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ failedLoginAttempts: 2, lockedUntil: null }),
      );
    });

    it('rejects a login attempt while locked, without ever checking the password', async () => {
      usersService.findByEmail.mockResolvedValue(
        buildUser({ lockedUntil: new Date(Date.now() + 5 * 60000) }),
      );

      await expect(
        service.validateLogin({ email: 'user@sims.edu.lk', password: 'whatever' }),
      ).rejects.toThrow(ForbiddenException);

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('allows login again once the lockout window has passed', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      usersService.findByEmail.mockResolvedValue(
        buildUser({ lockedUntil: new Date(Date.now() - 60000) }),
      );

      const result = await service.validateLogin({
        email: 'user@sims.edu.lk',
        password: 'correct',
      });

      expect(result.token).toBe('signed-token');
    });

    it('resets the failed-attempt counter on a successful login', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      usersService.findByEmail.mockResolvedValue(buildUser({ failedLoginAttempts: 3 }));

      await service.validateLogin({ email: 'user@sims.edu.lk', password: 'correct' });

      expect(userRepository.update).toHaveBeenCalledWith(USER_ID, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    });
  });

  describe('forgotPassword — persists the outstanding reset hash', () => {
    it('stores the signed hash on the user record', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());

      await service.forgotPassword('user@sims.edu.lk');

      expect(userRepository.update).toHaveBeenCalledWith(USER_ID, {
        passwordResetHash: 'signed-token',
      });
      expect(mailService.forgotPassword).toHaveBeenCalled();
    });
  });

  describe('resetPassword — single-use + auto-login (AI-prompt-requested)', () => {
    it('resets the password and returns a usable login response for a fresh, matching hash', async () => {
      jwtService.verifyAsync.mockResolvedValue({ forgotUserId: USER_ID });
      usersService.findById.mockResolvedValue(
        buildUser({ passwordResetHash: 'the-live-hash' }),
      );

      const result = await service.resetPassword('the-live-hash', 'NewPass123!');

      expect(result.token).toBe('signed-token');
      expect(result.user).toBeDefined();
      expect(sessionService.create).toHaveBeenCalled();
      expect(sessionService.deleteByUserId).toHaveBeenCalledWith({ userId: USER_ID });
      expect(userRepository.update).toHaveBeenCalledWith(USER_ID, {
        passwordResetHash: null,
      });
    });

    it('rejects a replay of an already-consumed hash', async () => {
      jwtService.verifyAsync.mockResolvedValue({ forgotUserId: USER_ID });
      usersService.findById.mockResolvedValue(buildUser({ passwordResetHash: null }));

      await expect(
        service.resetPassword('an-old-consumed-hash', 'NewPass123!'),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(sessionService.create).not.toHaveBeenCalled();
    });

    it('rejects a hash superseded by a newer forgot-password request', async () => {
      jwtService.verifyAsync.mockResolvedValue({ forgotUserId: USER_ID });
      usersService.findById.mockResolvedValue(
        buildUser({ passwordResetHash: 'a-much-newer-hash' }),
      );

      await expect(
        service.resetPassword('an-old-superseded-hash', 'NewPass123!'),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
