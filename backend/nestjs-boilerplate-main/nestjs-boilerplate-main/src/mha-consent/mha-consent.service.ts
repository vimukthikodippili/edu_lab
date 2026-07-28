import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { MhaConsentEntity } from './entities/mha-consent.entity';
import { RecordMhaConsentDto } from './dto/record-mha-consent.dto';
import { StudentEntity } from '../students/entities/student.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';

export interface MhaConsentStatus {
  current: MhaConsentEntity | null;
  history: MhaConsentEntity[];
}

/** FR-MHA-01 — no MHA screening session may be initiated for a student without a recorded
 * guardian consent. `assertConsentExists()` is the reusable gate a future MHA-112 (session
 * intake) story will call first; consent records are append-only (AC #9) — recordConsent()
 * always inserts a new row and, if one was active, marks it superseded in the same transaction
 * rather than editing or deleting it. */
@Injectable()
export class MhaConsentService {
  constructor(
    @InjectRepository(MhaConsentEntity)
    private readonly consentRepo: Repository<MhaConsentEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly studentGuardianRepo: Repository<StudentGuardianEntity>,

    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async recordConsent(
    studentId: string,
    dto: RecordMhaConsentDto,
    recordedByStaffId: string,
  ): Promise<MhaConsentEntity> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found.`);
    }

    if (dto.guardianId) {
      const linked = await this.studentGuardianRepo.findOne({
        where: { studentId, guardianId: dto.guardianId },
      });
      if (!linked) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { guardianId: `Guardian ${dto.guardianId} is not linked to this student.` },
        });
      }
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const previous = await manager.findOne(MhaConsentEntity, {
        where: { studentId, supersededAt: IsNull() },
      });

      // Supersede the previous row BEFORE inserting the new one: both rows would otherwise
      // momentarily have supersededAt IS NULL for the same studentId, violating the partial
      // unique index (UQ_mha_consent_student_active). supersededByConsentId is backfilled after
      // the new row exists, in a second update — the two writes share one `now` for consistency.
      const supersededAt = new Date();
      if (previous) {
        await manager.update(MhaConsentEntity, { id: previous.id }, { supersededAt });
      }

      const created = manager.create(MhaConsentEntity, {
        studentId,
        guardianId: dto.guardianId ?? null,
        guardianName: dto.guardianName,
        guardianContact: dto.guardianContact,
        method: dto.method,
        consentedAt: dto.consentedAt ? new Date(dto.consentedAt) : new Date(),
        recordedByStaffId,
        supersededAt: null,
        supersededByConsentId: null,
      });
      const newConsent = await manager.save(MhaConsentEntity, created);

      if (previous) {
        await manager.update(
          MhaConsentEntity,
          { id: previous.id },
          { supersededByConsentId: newConsent.id },
        );
      }

      return newConsent;
    });

    await this.auditService.log({
      actorId: recordedByStaffId,
      action: 'record_consent',
      targetType: 'mha_consent',
      targetId: saved.id,
    });

    void this.notificationService
      .createForStaff(
        recordedByStaffId,
        'MHA Consent Recorded',
        `Guardian consent for MHA screening recorded for ${student.firstName} ${student.lastName}.`,
        'mha_consent',
      )
      .catch(() => undefined);

    return saved;
  }

  async getConsentStatus(studentId: string): Promise<MhaConsentStatus> {
    const [current, history] = await Promise.all([
      this.consentRepo.findOne({ where: { studentId, supersededAt: IsNull() } }),
      this.consentRepo.find({ where: { studentId }, order: { consentedAt: 'DESC' } }),
    ]);
    return { current: current ?? null, history };
  }

  /** The reusable gate — a future MHA-112 (session intake) story calls this first. */
  async assertConsentExists(studentId: string): Promise<void> {
    const active = await this.consentRepo.findOne({
      where: { studentId, supersededAt: IsNull() },
    });
    if (!active) {
      throw new ConflictException(
        'No guardian consent has been recorded for this student. Record consent before initiating an MHA session.',
      );
    }
  }
}
