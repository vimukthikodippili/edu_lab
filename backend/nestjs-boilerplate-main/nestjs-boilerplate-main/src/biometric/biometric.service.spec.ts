import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { BiometricService } from './biometric.service';
import { ConsentRecordEntity } from './entities/consent-record.entity';
import { BiometricVaultEntity } from './entities/biometric-vault.entity';
import { BiometricReleaseLogEntity } from './entities/biometric-release-log.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { BiometricCryptoService } from './biometric-crypto.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { StaffService } from '../staff/staff.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const GUARDIAN_ID = 'guardian-uuid-001';
const OTHER_GUARDIAN_ID = 'guardian-uuid-002';
const STAFF_ID = 'staff-uuid-001';
const CONSENT_ID = 'consent-uuid-001';
const STUDENT_ID = 'student-uuid-001';
const TEACHER_ID = 'teacher-uuid-001';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const makeGuardian = (overrides: Partial<GuardianEntity> = {}): Partial<GuardianEntity> => ({
  id: GUARDIAN_ID,
  firstName: 'Kumari',
  lastName: 'Silva',
  biometricEnrolled: false,
  isBlacklisted: false,
  email: null,
  ...overrides,
});

const makeConsent = (): Partial<ConsentRecordEntity> => ({
  id: CONSENT_ID,
  guardianId: GUARDIAN_ID,
  consentedById: STAFF_ID,
  consentedAt: new Date(),
  revokedAt: null,
  revokedById: null,
});

const makeVault = (): Partial<BiometricVaultEntity> => ({
  id: 'vault-uuid-001',
  guardianId: GUARDIAN_ID,
  ciphertext: 'CIPHER',
  iv: 'IV',
  authTag: 'TAG',
  templateType: 'fingerprint',
  enrolledAt: new Date(),
});

const makeStudent = () => ({
  id: STUDENT_ID,
  firstName: 'Saman',
  lastName: 'Silva',
  classSectionId: 1,
  classSection: { id: 1, name: '10A' },
});

// ─── Repository mock factory ──────────────────────────────────────────────────

const repoMock = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn().mockImplementation((data: any) => data),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

// ─── DataSource / transaction mock ───────────────────────────────────────────

const makeManager = () => ({
  delete: jest.fn().mockResolvedValue(undefined),
  create: jest.fn().mockImplementation((_entity: any, data: any) => data),
  save: jest.fn().mockImplementation((_entity: any, data: any) => Promise.resolve(data)),
  update: jest.fn().mockResolvedValue(undefined),
});

const makeDataSource = (manager: ReturnType<typeof makeManager>) => ({
  transaction: jest.fn().mockImplementation((cb: (mgr: any) => Promise<any>) => cb(manager)),
});

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('BiometricService', () => {
  let service: BiometricService;
  let consentRepo: ReturnType<typeof repoMock>;
  let vaultRepo: ReturnType<typeof repoMock>;
  let guardianRepo: ReturnType<typeof repoMock>;
  let releaseLogRepo: ReturnType<typeof repoMock>;
  let sgRepo: ReturnType<typeof repoMock>;
  let timetableEntryRepo: ReturnType<typeof repoMock>;
  let userRepo: ReturnType<typeof repoMock>;
  let cryptoService: { encrypt: jest.Mock; decrypt: jest.Mock; compare: jest.Mock };
  let auditService: { log: jest.Mock };
  let notificationService: { createForStaff: jest.Mock; createForGuardian: jest.Mock };
  let staffService: { findByEmail: jest.Mock };
  let manager: ReturnType<typeof makeManager>;
  let dataSource: ReturnType<typeof makeDataSource>;

  beforeEach(async () => {
    consentRepo = repoMock<ConsentRecordEntity>();
    vaultRepo = repoMock<BiometricVaultEntity>();
    guardianRepo = repoMock<GuardianEntity>();
    releaseLogRepo = repoMock<BiometricReleaseLogEntity>();
    sgRepo = repoMock<StudentGuardianEntity>();
    timetableEntryRepo = repoMock<TimetableEntryEntity>();
    userRepo = repoMock<UserEntity>();
    cryptoService = { encrypt: jest.fn(), decrypt: jest.fn(), compare: jest.fn() };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    notificationService = {
      createForStaff: jest.fn().mockResolvedValue({}),
      createForGuardian: jest.fn().mockResolvedValue({}),
    };
    staffService = { findByEmail: jest.fn() };
    manager = makeManager();
    dataSource = makeDataSource(manager);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiometricService,
        { provide: getRepositoryToken(ConsentRecordEntity), useValue: consentRepo },
        { provide: getRepositoryToken(BiometricVaultEntity), useValue: vaultRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(BiometricReleaseLogEntity), useValue: releaseLogRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: sgRepo },
        { provide: getRepositoryToken(TimetableEntryEntity), useValue: timetableEntryRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: BiometricCryptoService, useValue: cryptoService },
        { provide: AuditService, useValue: auditService },
        { provide: NotificationService, useValue: notificationService },
        { provide: StaffService, useValue: staffService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<BiometricService>(BiometricService);
  });

  // ── Test 1: recordConsent happy path ────────────────────────────────────────

  it('should record consent when no active consent exists', async () => {
    guardianRepo.findOne.mockResolvedValue(makeGuardian());
    consentRepo.findOne.mockResolvedValue(null);
    consentRepo.save.mockImplementation((data: any) =>
      Promise.resolve({ ...data, id: CONSENT_ID }),
    );

    const result = await service.recordConsent(GUARDIAN_ID, STAFF_ID);

    expect(result.id).toBe(CONSENT_ID);
    expect(result.guardianId).toBe(GUARDIAN_ID);
    expect(consentRepo.save).toHaveBeenCalledTimes(1);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'record_consent', targetType: 'biometric_consent' }),
    );
  });

  // ── Test 2: recordConsent duplicate active consent ───────────────────────────

  it('should throw ConflictException when active consent already exists', async () => {
    guardianRepo.findOne.mockResolvedValue(makeGuardian());
    consentRepo.findOne.mockResolvedValue(makeConsent());

    await expect(service.recordConsent(GUARDIAN_ID, STAFF_ID)).rejects.toThrow(ConflictException);
    expect(consentRepo.save).not.toHaveBeenCalled();
  });

  // ── Test 3: enroll BLOCKED — no ConsentRecord (acceptance criteria) ──────────

  it('should throw UnprocessableEntityException when enrolling without active consent', async () => {
    guardianRepo.findOne.mockResolvedValue(makeGuardian());
    consentRepo.findOne.mockResolvedValue(null);

    await expect(
      service.enroll(GUARDIAN_ID, { templateType: 'fingerprint', template: 'RAW_TEMPLATE' }, STAFF_ID),
    ).rejects.toThrow(UnprocessableEntityException);

    expect(cryptoService.encrypt).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  // ── Test 4: enroll success with active consent ───────────────────────────────

  it('should encrypt template and persist vault when active consent exists', async () => {
    guardianRepo.findOne.mockResolvedValue(makeGuardian());
    consentRepo.findOne.mockResolvedValue(makeConsent());
    cryptoService.encrypt.mockReturnValue({ ciphertext: 'CIPHER', iv: 'IV_HEX', authTag: 'TAG_HEX' });

    const result = await service.enroll(
      GUARDIAN_ID,
      { templateType: 'fingerprint', template: 'RAW_TEMPLATE' },
      STAFF_ID,
    );

    expect(cryptoService.encrypt).toHaveBeenCalledWith('RAW_TEMPLATE');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.delete).toHaveBeenCalledWith(BiometricVaultEntity, { guardianId: GUARDIAN_ID });
    expect(manager.update).toHaveBeenCalledWith(GuardianEntity, { id: GUARDIAN_ID }, { biometricEnrolled: true });
    expect(result.isEnrolled).toBe(true);
    expect(result.consentGiven).toBe(true);
    expect(result).not.toHaveProperty('ciphertext');
    expect(result).not.toHaveProperty('iv');
    expect(result).not.toHaveProperty('authTag');
  });

  // ── Test 5: revokeConsent clears vault and flag ──────────────────────────────

  it('should revoke consent, delete vault entry, and clear biometricEnrolled flag', async () => {
    guardianRepo.findOne.mockResolvedValue(makeGuardian());
    consentRepo.findOne.mockResolvedValue(makeConsent());

    await service.revokeConsent(GUARDIAN_ID, STAFF_ID);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.update).toHaveBeenCalledWith(
      ConsentRecordEntity,
      { id: CONSENT_ID },
      expect.objectContaining({ revokedAt: expect.any(Date), revokedById: STAFF_ID }),
    );
    expect(manager.delete).toHaveBeenCalledWith(BiometricVaultEntity, { guardianId: GUARDIAN_ID });
    expect(manager.update).toHaveBeenCalledWith(GuardianEntity, { id: GUARDIAN_ID }, { biometricEnrolled: false });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'revoke_consent', targetType: 'biometric_consent' }),
    );
  });

  // ── Test 6: getStatus returns correct shape for enrolled guardian ─────────────

  it('should return enrolled status with enrolledAt date', async () => {
    const enrolledAt = new Date('2026-07-01T10:00:00Z');
    guardianRepo.findOne.mockResolvedValue({ ...makeGuardian(), biometricEnrolled: true });
    consentRepo.findOne.mockResolvedValue(makeConsent());
    vaultRepo.findOne.mockResolvedValue({ enrolledAt });

    const result = await service.getStatus(GUARDIAN_ID);

    expect(result.isEnrolled).toBe(true);
    expect(result.consentGiven).toBe(true);
    expect(result.enrolledAt).toEqual(enrolledAt);
  });

  // ── Test 7: verify — match (confidence ≥ threshold) ──────────────────────────

  it('should return match result and notify teacher when confidence meets threshold', async () => {
    guardianRepo.findOne.mockResolvedValue(makeGuardian());
    vaultRepo.findOne.mockResolvedValue(makeVault());
    cryptoService.decrypt.mockReturnValue('STORED_TEMPLATE');
    cryptoService.compare.mockReturnValue(95.0); // above default threshold 80
    sgRepo.find.mockResolvedValue([{ student: makeStudent() }]);
    timetableEntryRepo.find.mockResolvedValue([{ teacher: { id: TEACHER_ID } }]);
    releaseLogRepo.save.mockResolvedValue({});

    const result = await service.verify(GUARDIAN_ID, {
      scanTemplate: 'LIVE_TEMPLATE',
      templateType: 'fingerprint',
    });

    expect(result.result).toBe('match');
    expect(result.confidence).toBe(95.0);
    expect(result.students).toHaveLength(1);
    expect(notificationService.createForStaff).toHaveBeenCalledWith(
      TEACHER_ID,
      expect.stringContaining('Student Release'),
      expect.any(String),
      'student_release',
    );
    expect(releaseLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'match', confidence: 95.0 }),
    );
  });

  // ── Test 8: verify — no-match (confidence < threshold) ───────────────────────

  it('should return no_match result and alert security staff when confidence below threshold', async () => {
    guardianRepo.findOne.mockResolvedValue(makeGuardian());
    vaultRepo.findOne.mockResolvedValue(makeVault());
    cryptoService.decrypt.mockReturnValue('STORED_TEMPLATE');
    cryptoService.compare.mockReturnValue(5.0); // below default threshold 80
    userRepo.find.mockResolvedValue([{ email: 'admin@school.lk', role: { id: 1 } }]);
    staffService.findByEmail.mockResolvedValue({ id: STAFF_ID });
    releaseLogRepo.save.mockResolvedValue({});

    const result = await service.verify(GUARDIAN_ID, {
      scanTemplate: 'WRONG_TEMPLATE',
      templateType: 'fingerprint',
    });

    expect(result.result).toBe('no_match');
    expect(result.confidence).toBe(5.0);
    expect(result.students).toHaveLength(0);
    // Security alert notification fired
    expect(notificationService.createForStaff).toHaveBeenCalledWith(
      STAFF_ID,
      expect.stringContaining('FAILED'),
      expect.any(String),
      'security_alert',
    );
    // Teacher notification must NOT have been called
    expect(notificationService.createForStaff).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('Student Release'),
      expect.anything(),
      expect.anything(),
    );
    expect(releaseLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'no_match' }),
    );
  });

  // ── Test 9: verify — threshold boundary (80.0 = match, 79.9 = no-match) ──────

  it('should match at exactly threshold 80.0 and not match at 79.9', async () => {
    // MATCH at exactly 80.0
    guardianRepo.findOne.mockResolvedValue(makeGuardian());
    vaultRepo.findOne.mockResolvedValue(makeVault());
    cryptoService.decrypt.mockReturnValue('STORED');
    cryptoService.compare.mockReturnValue(80.0);
    sgRepo.find.mockResolvedValue([]);
    releaseLogRepo.save.mockResolvedValue({});

    const matchResult = await service.verify(GUARDIAN_ID, {
      scanTemplate: 'T',
      templateType: 'fingerprint',
    });
    expect(matchResult.result).toBe('match');

    // Reset mocks for NO-MATCH at 79.9
    jest.clearAllMocks();
    guardianRepo.findOne.mockResolvedValue(makeGuardian());
    vaultRepo.findOne.mockResolvedValue(makeVault());
    cryptoService.decrypt.mockReturnValue('STORED');
    cryptoService.compare.mockReturnValue(79.9);
    userRepo.find.mockResolvedValue([]);
    releaseLogRepo.save.mockResolvedValue({});

    const noMatchResult = await service.verify(GUARDIAN_ID, {
      scanTemplate: 'T',
      templateType: 'fingerprint',
    });
    expect(noMatchResult.result).toBe('no_match');
  });

  // ── Test 10: verify — blacklisted guardian ────────────────────────────────────

  it('should return blacklisted result and alert security without comparing templates', async () => {
    guardianRepo.findOne.mockResolvedValue(makeGuardian({ isBlacklisted: true }));
    userRepo.find.mockResolvedValue([{ email: 'sec@school.lk', role: { id: 9 } }]);
    staffService.findByEmail.mockResolvedValue({ id: STAFF_ID });
    releaseLogRepo.save.mockResolvedValue({});

    const result = await service.verify(GUARDIAN_ID, {
      scanTemplate: 'ANY',
      templateType: 'fingerprint',
    });

    expect(result.result).toBe('blacklisted');
    expect(result.confidence).toBe(0);
    // Template comparison must NOT have been called
    expect(cryptoService.decrypt).not.toHaveBeenCalled();
    expect(cryptoService.compare).not.toHaveBeenCalled();
    // Security alerted
    expect(notificationService.createForStaff).toHaveBeenCalledWith(
      STAFF_ID,
      expect.stringContaining('FAILED'),
      expect.any(String),
      'security_alert',
    );
    expect(releaseLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'blacklisted' }),
    );
  });

  // ── Test 11: verify — no vault entry → NotFoundException ─────────────────────

  it('should throw NotFoundException when guardian has no biometric data enrolled', async () => {
    guardianRepo.findOne.mockResolvedValue(makeGuardian());
    vaultRepo.findOne.mockResolvedValue(null); // no vault

    await expect(
      service.verify(GUARDIAN_ID, { scanTemplate: 'ANY', templateType: 'fingerprint' }),
    ).rejects.toThrow(NotFoundException);

    expect(cryptoService.compare).not.toHaveBeenCalled();
  });

  // ── Test 12: manualOverride — happy path (verificationMethod='manual_override') ─

  it('should persist manual_override release log and write audit entry with reason', async () => {
    const LOG_ID = 'log-uuid-override';
    guardianRepo.findOne.mockResolvedValue(makeGuardian()); // not blacklisted
    sgRepo.find.mockResolvedValue([{ student: makeStudent() }]);
    timetableEntryRepo.find.mockResolvedValue([{ teacher: { id: TEACHER_ID } }]);
    releaseLogRepo.save.mockResolvedValue({ id: LOG_ID, verificationMethod: 'manual_override', result: 'match', confidence: 0 });

    const result = await service.manualOverride(
      GUARDIAN_ID,
      { reason: 'hardware failure at scanner', secondaryIdNumber: 'NIC-12345' },
      STAFF_ID,
    );

    expect(result.result).toBe('match');
    expect(result.verificationMethod).toBe('manual_override');
    expect(result.secondaryIdNumber).toBe('NIC-12345');
    expect(result.students).toHaveLength(1);

    // Release log must be tagged as manual_override, not biometric
    expect(releaseLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        verificationMethod: 'manual_override',
        result: 'match',
        confidence: 0,
        templateType: 'manual',
      }),
    );

    // Audit log must record the override with reason (distinct from automatic verifications)
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'manual_override',
        targetType: 'biometric_release_log',
        targetId: LOG_ID,
        reason: expect.stringContaining('hardware'),
      }),
    );

    // Teacher notified with 'Manual Override' in title
    expect(notificationService.createForStaff).toHaveBeenCalledWith(
      TEACHER_ID,
      expect.stringContaining('Manual Override'),
      expect.any(String),
      'student_release',
    );
  });

  // ── Test 13: manualOverride — blacklisted guardian → ForbiddenException ───────

  it('should throw ForbiddenException when attempting manual override for blacklisted guardian', async () => {
    guardianRepo.findOne.mockResolvedValue(makeGuardian({ isBlacklisted: true }));

    await expect(
      service.manualOverride(
        GUARDIAN_ID,
        { reason: 'testing blacklist block', secondaryIdNumber: 'NIC-99999' },
        STAFF_ID,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(releaseLogRepo.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  // ── Test 14: verify — biometric match dispatches parent notifications ──────────

  it('should notify linked parent guardians (excluding releasing guardian) on biometric match', async () => {
    guardianRepo.findOne.mockResolvedValue(makeGuardian());
    vaultRepo.findOne.mockResolvedValue(makeVault());
    cryptoService.decrypt.mockReturnValue('STORED_TEMPLATE');
    cryptoService.compare.mockReturnValue(95.0);

    // First sgRepo.find: students for the releasing guardian
    // Second sgRepo.find: all guardian links for that student
    sgRepo.find
      .mockResolvedValueOnce([{ guardianId: GUARDIAN_ID, student: makeStudent() }])
      .mockResolvedValueOnce([
        { guardianId: GUARDIAN_ID },         // releasing guardian — must be skipped
        { guardianId: OTHER_GUARDIAN_ID },   // other guardian — must receive notification
      ]);

    timetableEntryRepo.find.mockResolvedValue([]);
    releaseLogRepo.save.mockResolvedValue({});

    await service.verify(GUARDIAN_ID, { scanTemplate: 'LIVE', templateType: 'fingerprint' });

    // Must NOT dispatch release_notification to the releasing guardian
    expect(notificationService.createForGuardian).not.toHaveBeenCalledWith(
      GUARDIAN_ID,
      'Child Release Notification',
      expect.any(String),
      'release_notification',
      expect.any(Object),
    );

    // MUST notify the other guardian with student name + releasing guardian name
    expect(notificationService.createForGuardian).toHaveBeenCalledWith(
      OTHER_GUARDIAN_ID,
      'Child Release Notification',
      expect.stringContaining('Saman Silva'),
      'release_notification',
      expect.objectContaining({ verificationMethod: 'biometric' }),
    );
    expect(notificationService.createForGuardian).toHaveBeenCalledWith(
      OTHER_GUARDIAN_ID,
      'Child Release Notification',
      expect.stringContaining('Kumari Silva'),
      'release_notification',
      expect.any(Object),
    );
  });

  // ── Test 15: manualOverride — dispatches parent notifications ─────────────────

  it('should notify linked parent guardians on manual override release', async () => {
    guardianRepo.findOne.mockResolvedValue(makeGuardian());

    sgRepo.find
      .mockResolvedValueOnce([{ guardianId: GUARDIAN_ID, student: makeStudent() }])
      .mockResolvedValueOnce([
        { guardianId: GUARDIAN_ID },
        { guardianId: OTHER_GUARDIAN_ID },
      ]);

    timetableEntryRepo.find.mockResolvedValue([]);
    releaseLogRepo.save.mockResolvedValue({ id: 'log-override-uuid', verificationMethod: 'manual_override', result: 'match', confidence: 0 });

    await service.manualOverride(
      GUARDIAN_ID,
      { reason: 'hardware failure', secondaryIdNumber: 'NIC-99999' },
      STAFF_ID,
    );

    expect(notificationService.createForGuardian).toHaveBeenCalledWith(
      OTHER_GUARDIAN_ID,
      'Child Release Notification',
      expect.stringContaining('Saman Silva'),
      'release_notification',
      expect.objectContaining({ verificationMethod: 'manual_override' }),
    );
  });
});
