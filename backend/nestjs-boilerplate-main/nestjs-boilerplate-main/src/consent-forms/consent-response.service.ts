import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConsentFormEntity } from './entities/consent-form.entity';
import { ConsentResponseEntity } from './entities/consent-response.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { RespondToConsentDto } from './dto/respond-to-consent.dto';
import { ConsentFormService } from './consent-form.service';

export interface PendingConsentRow {
  form: ConsentFormEntity;
  studentId: string;
}

@Injectable()
export class ConsentResponseService {
  constructor(
    @InjectRepository(ConsentFormEntity)
    private readonly formRepo: Repository<ConsentFormEntity>,

    @InjectRepository(ConsentResponseEntity)
    private readonly responseRepo: Repository<ConsentResponseEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly studentGuardianRepo: Repository<StudentGuardianEntity>,

    private readonly consentFormService: ConsentFormService,
  ) {}

  /** Intersects the calling guardian's own children against every form's live-resolved targets —
   * one row per `(form, own child)` pair that has no response yet. */
  async listPendingForGuardian(guardianId: string): Promise<PendingConsentRow[]> {
    const ownLinks = await this.studentGuardianRepo.find({ where: { guardianId } });
    const ownStudentIds = new Set(ownLinks.map((l) => l.studentId));
    if (ownStudentIds.size === 0) return [];

    const forms = await this.formRepo.find();
    const rows: PendingConsentRow[] = [];

    for (const form of forms) {
      const pairs = await this.consentFormService.resolveTargetPairs(form);
      const targetedOwnStudentIds = pairs
        .map((p) => p.student.id)
        .filter((id) => ownStudentIds.has(id));
      if (targetedOwnStudentIds.length === 0) continue;

      const responses = await this.responseRepo.find({
        where: { consentFormId: form.id, studentId: In(targetedOwnStudentIds) },
      });
      const respondedStudentIds = new Set(responses.map((r) => r.studentId));

      for (const studentId of targetedOwnStudentIds) {
        if (!respondedStudentIds.has(studentId)) {
          rows.push({ form, studentId });
        }
      }
    }

    return rows;
  }

  async listMyResponses(guardianId: string): Promise<ConsentResponseEntity[]> {
    return this.responseRepo.find({ where: { guardianId }, order: { respondedAt: 'DESC' } });
  }

  /** FR-P5-PP-20/22/23. Ownership-checked, one-shot per `(form, student)` — a second response for
   * the same child, from any guardian, 409s. This is the permanent legal record itself; no
   * separate audit-log entry (guardian self-service, matches `EventRegistrationService`'s
   * established line). */
  async respond(
    formId: string,
    dto: RespondToConsentDto,
    guardianId: string,
    ipAddress: string | null,
  ): Promise<ConsentResponseEntity> {
    const form = await this.formRepo.findOne({ where: { id: formId } });
    if (!form) throw new NotFoundException(`Consent form ${formId} not found.`);

    const link = await this.studentGuardianRepo.findOne({
      where: { studentId: dto.studentId, guardianId },
    });
    if (!link) {
      throw new ForbiddenException('You are not authorized to respond on behalf of this student.');
    }

    const existing = await this.responseRepo.findOne({
      where: { consentFormId: form.id, studentId: dto.studentId },
    });
    if (existing) {
      throw new ConflictException('A response has already been recorded for this student.');
    }

    try {
      return await this.responseRepo.save(
        this.responseRepo.create({
          consentFormId: form.id,
          guardianId,
          studentId: dto.studentId,
          response: dto.response,
          reason: dto.reason ?? null,
          respondedAt: new Date(),
          ipAddress,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A response has already been recorded for this student.');
      }
      throw error;
    }
  }
}
