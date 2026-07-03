import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
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
import { EnrollBiometricDto } from './dto/enroll-biometric.dto';
import { ManualOverrideBiometricDto } from './dto/manual-override-biometric.dto';
import { VerifyBiometricDto } from './dto/verify-biometric.dto';
import { RoleEnum } from '../roles/roles.enum';

// ─── Response types ────────────────────────────────────────────────────────────

export interface BiometricStatusResponse {
  isEnrolled: boolean;
  consentGiven: boolean;
  enrolledAt: Date | null;
}

export interface VerifyStudentResult {
  id: string;
  firstName: string;
  lastName: string;
  classSection: string;
}

export interface VerifyResult {
  result: 'match' | 'no_match' | 'blacklisted';
  confidence: number;
  guardianId: string;
  students: VerifyStudentResult[];
}

export interface OverrideResult {
  result: 'match';
  verificationMethod: 'manual_override';
  guardianId: string;
  secondaryIdNumber: string;
  students: VerifyStudentResult[];
}

// ──────────────────────────────────────────────────────────────────────────────

@Injectable()
export class BiometricService {
  constructor(
    @InjectRepository(ConsentRecordEntity)
    private readonly consentRepo: Repository<ConsentRecordEntity>,

    @InjectRepository(BiometricVaultEntity)
    private readonly vaultRepo: Repository<BiometricVaultEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    @InjectRepository(BiometricReleaseLogEntity)
    private readonly releaseLogRepo: Repository<BiometricReleaseLogEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly sgRepo: Repository<StudentGuardianEntity>,

    @InjectRepository(TimetableEntryEntity)
    private readonly timetableEntryRepo: Repository<TimetableEntryEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly cryptoService: BiometricCryptoService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly staffService: StaffService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Enrollment flow ───────────────────────────────────────────────────────

  async recordConsent(
    guardianId: string,
    consentedById: string,
  ): Promise<ConsentRecordEntity> {
    const guardian = await this.guardianRepo.findOne({ where: { id: guardianId } });
    if (!guardian) {
      throw new NotFoundException(`Guardian ${guardianId} not found.`);
    }

    const existing = await this.findActiveConsent(guardianId);
    if (existing) {
      throw new ConflictException(
        `Guardian ${guardianId} already has an active consent record. Revoke it before recording a new one.`,
      );
    }

    const consent = this.consentRepo.create({
      guardianId,
      consentedById,
      consentedAt: new Date(),
      revokedAt: null,
      revokedById: null,
    });
    const saved = await this.consentRepo.save(consent);

    await this.auditService.log({
      actorId: consentedById,
      action: 'record_consent',
      targetType: 'biometric_consent',
      targetId: saved.id,
    });

    void this.notificationService
      .createForStaff(
        consentedById,
        'Biometric Consent Recorded',
        `Biometric consent recorded for guardian ${guardian.firstName} ${guardian.lastName}.`,
        'biometric',
      )
      .catch(() => undefined);

    return saved;
  }

  async enroll(
    guardianId: string,
    dto: EnrollBiometricDto,
    actorStaffId: string,
  ): Promise<BiometricStatusResponse> {
    const guardian = await this.guardianRepo.findOne({ where: { id: guardianId } });
    if (!guardian) {
      throw new NotFoundException(`Guardian ${guardianId} not found.`);
    }

    const consent = await this.findActiveConsent(guardianId);
    if (!consent) {
      throw new UnprocessableEntityException(
        `Cannot enroll guardian ${guardianId}: no active consent record exists. Record consent first.`,
      );
    }

    const { ciphertext, iv, authTag } = this.cryptoService.encrypt(dto.template);
    const enrolledAt = new Date();

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(BiometricVaultEntity, { guardianId });
      const vault = manager.create(BiometricVaultEntity, {
        guardianId,
        templateType: dto.templateType,
        ciphertext,
        iv,
        authTag,
        enrolledAt,
      });
      await manager.save(BiometricVaultEntity, vault);
      await manager.update(GuardianEntity, { id: guardianId }, { biometricEnrolled: true });
    });

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'enroll',
      targetType: 'biometric_vault',
      targetId: guardianId,
    });

    return { isEnrolled: true, consentGiven: true, enrolledAt };
  }

  async revokeConsent(guardianId: string, revokedById: string): Promise<void> {
    const consent = await this.findActiveConsent(guardianId);
    if (!consent) {
      throw new NotFoundException(
        `No active consent record found for guardian ${guardianId}.`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        ConsentRecordEntity,
        { id: consent.id },
        { revokedAt: new Date(), revokedById },
      );
      await manager.delete(BiometricVaultEntity, { guardianId });
      await manager.update(GuardianEntity, { id: guardianId }, { biometricEnrolled: false });
    });

    await this.auditService.log({
      actorId: revokedById,
      action: 'revoke_consent',
      targetType: 'biometric_consent',
      targetId: consent.id,
    });
  }

  async getStatus(guardianId: string): Promise<BiometricStatusResponse> {
    const guardian = await this.guardianRepo.findOne({ where: { id: guardianId } });
    if (!guardian) {
      throw new NotFoundException(`Guardian ${guardianId} not found.`);
    }

    const consent = await this.findActiveConsent(guardianId);
    const vault = await this.vaultRepo.findOne({
      where: { guardianId },
      select: ['enrolledAt'],
    });

    return {
      isEnrolled: guardian.biometricEnrolled,
      consentGiven: consent !== null,
      enrolledAt: vault?.enrolledAt ?? null,
    };
  }

  // ── Gate verification flow ─────────────────────────────────────────────────

  async verify(guardianId: string, dto: VerifyBiometricDto): Promise<VerifyResult> {
    const verifiedAt = new Date();
    const currentYear = verifiedAt.getFullYear().toString();
    const currentDay = verifiedAt.getDay(); // 0=Sun..6=Sat; timetable uses 1=Mon..6=Sat

    // 1. Load guardian
    const guardian = await this.guardianRepo.findOne({ where: { id: guardianId } });
    if (!guardian) {
      throw new NotFoundException(`Guardian ${guardianId} not found.`);
    }

    // 2. Blacklist check — immediate rejection without template comparison
    if (guardian.isBlacklisted) {
      const alertsNotified = await this.alertSecurityStaff(
        guardianId,
        'BLACKLISTED guardian attempted entry',
      );
      await this.releaseLogRepo.save(
        this.releaseLogRepo.create({
          guardianId,
          studentIds: '[]',
          result: 'blacklisted',
          confidence: 0,
          templateType: dto.templateType,
          verificationMethod: 'biometric',
          teachersNotified: 0,
          alertsNotified,
          verifiedAt,
        }),
      );
      return { result: 'blacklisted', confidence: 0, guardianId, students: [] };
    }

    // 3. Load vault — must have enrolled biometric
    const vault = await this.vaultRepo.findOne({ where: { guardianId } });
    if (!vault) {
      throw new NotFoundException(
        `No biometric data enrolled for guardian ${guardianId}. Enroll first.`,
      );
    }

    // 4. Decrypt stored template + compare against live scan
    const storedTemplate = this.cryptoService.decrypt(vault.ciphertext, vault.iv, vault.authTag);
    const threshold = parseFloat(process.env['BIOMETRIC_MATCH_THRESHOLD'] ?? '80');
    const confidence = this.cryptoService.compare(dto.scanTemplate, storedTemplate, guardianId);
    const isMatch = confidence >= threshold;

    if (isMatch) {
      // 5. Find students linked to this guardian
      const studentGuardians = await this.sgRepo.find({
        where: { guardianId },
        relations: ['student', 'student.classSection'],
      });
      const students = studentGuardians
        .map((sg) => sg.student)
        .filter((s): s is NonNullable<typeof s> => s != null);

      // 6. Notify teachers for each student's class section (fire-and-forget)
      let teachersNotified = 0;
      const notifiedTeacherIds = new Set<string>();
      for (const student of students) {
        const entries = await this.timetableEntryRepo.find({
          where: {
            classSectionId: student.classSectionId,
            academicYear: currentYear,
            day: currentDay,
          },
          relations: ['teacher'],
        });
        for (const entry of entries) {
          if (entry.teacher && !notifiedTeacherIds.has(entry.teacher.id)) {
            notifiedTeacherIds.add(entry.teacher.id);
            void this.notificationService
              .createForStaff(
                entry.teacher.id,
                'Student Release — Guardian Verified',
                `Please send ${student.firstName} ${student.lastName} to the gate. ` +
                  `Guardian ${guardian.firstName} ${guardian.lastName} has been biometrically verified (${confidence.toFixed(1)}% confidence).`,
                'student_release',
              )
              .catch(() => undefined);
            teachersNotified++;
          }
        }
      }

      // 7. Notify guardian of confirmed release (FR-GS-10, fire-and-forget)
      void this.notificationService
        .createForGuardian(
          guardianId,
          'Student Release Confirmed',
          `Your identity has been verified. A teacher has been notified to send your child(ren) to the gate.`,
          'release_confirmation',
        )
        .catch(() => undefined);

      // 8. Log release event
      const studentIds = JSON.stringify(students.map((s) => s.id));
      await this.releaseLogRepo.save(
        this.releaseLogRepo.create({
          guardianId,
          studentIds,
          result: 'match',
          confidence,
          templateType: dto.templateType,
          verificationMethod: 'biometric',
          teachersNotified,
          alertsNotified: 0,
          verifiedAt,
        }),
      );

      return {
        result: 'match',
        confidence,
        guardianId,
        students: students.map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          classSection: s.classSection?.name ?? '',
        })),
      };
    }

    // 9. No-match — alert security/admin
    const alertsNotified = await this.alertSecurityStaff(guardianId, 'NO_MATCH');
    await this.releaseLogRepo.save(
      this.releaseLogRepo.create({
        guardianId,
        studentIds: '[]',
        result: 'no_match',
        confidence,
        templateType: dto.templateType,
        verificationMethod: 'biometric',
        teachersNotified: 0,
        alertsNotified,
        verifiedAt,
      }),
    );

    return { result: 'no_match', confidence, guardianId, students: [] };
  }

  // ── Manual override flow (FR-GS-11) ───────────────────────────────────────

  async manualOverride(
    guardianId: string,
    dto: ManualOverrideBiometricDto,
    actorStaffId: string,
  ): Promise<OverrideResult> {
    const overriddenAt = new Date();
    const currentYear = overriddenAt.getFullYear().toString();
    const currentDay = overriddenAt.getDay();

    const guardian = await this.guardianRepo.findOne({ where: { id: guardianId } });
    if (!guardian) {
      throw new NotFoundException(`Guardian ${guardianId} not found.`);
    }

    if (guardian.isBlacklisted) {
      throw new ForbiddenException(
        `Manual override is not permitted for blacklisted guardian ${guardianId}.`,
      );
    }

    const studentGuardians = await this.sgRepo.find({
      where: { guardianId },
      relations: ['student', 'student.classSection'],
    });
    const students = studentGuardians
      .map((sg) => sg.student)
      .filter((s): s is NonNullable<typeof s> => s != null);

    let teachersNotified = 0;
    const notifiedTeacherIds = new Set<string>();
    for (const student of students) {
      const entries = await this.timetableEntryRepo.find({
        where: {
          classSectionId: student.classSectionId,
          academicYear: currentYear,
          day: currentDay,
        },
        relations: ['teacher'],
      });
      for (const entry of entries) {
        if (entry.teacher && !notifiedTeacherIds.has(entry.teacher.id)) {
          notifiedTeacherIds.add(entry.teacher.id);
          void this.notificationService
            .createForStaff(
              entry.teacher.id,
              'Student Release — Manual Override',
              `Please send ${student.firstName} ${student.lastName} to the gate. ` +
                `Guardian ${guardian.firstName} ${guardian.lastName} was manually verified by security staff ` +
                `(secondary ID: ${dto.secondaryIdNumber}).`,
              'student_release',
            )
            .catch(() => undefined);
          teachersNotified++;
        }
      }
    }

    void this.notificationService
      .createForGuardian(
        guardianId,
        'Student Release Confirmed',
        `Your identity has been manually verified by security staff. ` +
          `A teacher has been notified to send your child(ren) to the gate.`,
        'release_confirmation',
      )
      .catch(() => undefined);

    const studentIds = JSON.stringify(students.map((s) => s.id));
    const saved = await this.releaseLogRepo.save(
      this.releaseLogRepo.create({
        guardianId,
        studentIds,
        result: 'match',
        confidence: 0,
        templateType: 'manual',
        verificationMethod: 'manual_override',
        teachersNotified,
        alertsNotified: 0,
        verifiedAt: overriddenAt,
      }),
    );

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'manual_override',
      targetType: 'biometric_release_log',
      targetId: saved.id,
      reason: dto.reason,
    });

    return {
      result: 'match',
      verificationMethod: 'manual_override',
      guardianId,
      secondaryIdNumber: dto.secondaryIdNumber,
      students: students.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        classSection: s.classSection?.name ?? '',
      })),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async alertSecurityStaff(guardianId: string, reason: string): Promise<number> {
    const alertRoleIds = [RoleEnum.security_officer, RoleEnum.admin, RoleEnum.principal];
    const alertUsers = await this.userRepo.find({
      where: alertRoleIds.map((id) => ({ role: { id } })),
      relations: ['role'],
    });

    let count = 0;
    for (const user of alertUsers) {
      if (!user.email) continue;
      const staff = await this.staffService.findByEmail(user.email);
      if (!staff) continue;
      void this.notificationService
        .createForStaff(
          staff.id,
          '⚠️ Biometric Verification FAILED',
          `${reason}: Guardian (ID: ${guardianId}) failed biometric verification at the gate. Immediate manual check required.`,
          'security_alert',
        )
        .catch(() => undefined);
      count++;
    }
    return count;
  }

  private async findActiveConsent(guardianId: string): Promise<ConsentRecordEntity | null> {
    return this.consentRepo.findOne({
      where: { guardianId, revokedAt: IsNull() },
    });
  }
}
