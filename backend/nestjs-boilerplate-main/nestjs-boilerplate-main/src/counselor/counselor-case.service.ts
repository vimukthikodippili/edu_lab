import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { MoreThanOrEqual, Repository } from 'typeorm';
import {
  CounselorCaseEntity,
  CounselorCasePriority,
  CounselorCaseStatus,
  CounselorCaseTriggerType,
} from './entities/counselor-case.entity';
import { BehavioralObservationEntity } from './entities/behavioral-observation.entity';
import { MoodCheckInService } from '../mood-check-in/mood-check-in.service';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { StaffService } from '../staff/staff.service';
import { RoleEnum } from '../roles/roles.enum';
import { AllConfigType } from '../config/config.type';
import { NotificationService } from '../notification/notification.service';

// A fixed, non-clinical set of substrings — verified by a content test to never appear
// in any generated case triggerSummary, regardless of the count interpolated in.
export const FORBIDDEN_CLINICAL_TERMS = [
  'depress',
  'anxi',
  'adhd',
  'add ',
  'odd',
  'disorder',
  'diagnos',
  'mental health',
  'psychiatr',
  'ptsd',
  'ocd',
  'bipolar',
  'autis',
];

export function buildCaseTriggerSummary(
  type: CounselorCaseTriggerType,
  count: number,
): string {
  if (type === CounselorCaseTriggerType.LOW_MOOD_CHECKINS) {
    return `${count} low mood check-ins this week`;
  }
  return `${count} behavioral observations logged this week`;
}

@Injectable()
export class CounselorCaseService {
  private readonly logger = new Logger(CounselorCaseService.name);

  constructor(
    @InjectRepository(CounselorCaseEntity)
    private readonly caseRepo: Repository<CounselorCaseEntity>,

    @InjectRepository(BehavioralObservationEntity)
    private readonly observationRepo: Repository<BehavioralObservationEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly moodCheckInService: MoodCheckInService,
    private readonly staffService: StaffService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async findCases(status?: CounselorCaseStatus): Promise<CounselorCaseEntity[]> {
    return this.caseRepo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  /** MHA-122. Unlike createCaseIfNeeded (which no-ops on an existing open case), this always
   * updates triggerSummary on an existing open mha_safety_flag case for the student, since each
   * call represents a new session's flag — the summary should reflect the most recent trigger.
   * MHA-133 — AC #4. Always sets priority: URGENT (create and update-existing branches alike) —
   * distinct from `status`, which stays OPEN/CLOSED per its own independent lifecycle. */
  async upsertSafetyFlagCase(
    studentId: string,
    triggerSummary: string,
  ): Promise<CounselorCaseEntity> {
    const existing = await this.caseRepo.findOne({
      where: {
        studentId,
        triggerType: CounselorCaseTriggerType.MHA_SAFETY_FLAG,
        status: CounselorCaseStatus.OPEN,
      },
    });
    if (existing) {
      existing.triggerSummary = triggerSummary;
      existing.priority = CounselorCasePriority.URGENT;
      return this.caseRepo.save(existing);
    }
    return this.caseRepo.save(
      this.caseRepo.create({
        studentId,
        triggerType: CounselorCaseTriggerType.MHA_SAFETY_FLAG,
        triggerSummary,
        status: CounselorCaseStatus.OPEN,
        priority: CounselorCasePriority.URGENT,
      }),
    );
  }

  async closeCase(id: string, staffId: string): Promise<CounselorCaseEntity> {
    const caseRow = await this.caseRepo.findOne({ where: { id } });
    if (!caseRow) {
      throw new NotFoundException(`Counselor case ${id} not found.`);
    }
    caseRow.status = CounselorCaseStatus.CLOSED;
    caseRow.closedAt = new Date();
    caseRow.closedByStaffId = staffId;
    return this.caseRepo.save(caseRow);
  }

  /** Resolves a single counselor to notify — deterministic first match, not a broadcast. */
  private async resolveOneCounselorStaffId(): Promise<string | null> {
    const counselorUsers = await this.userRepo.find({
      where: { role: { id: RoleEnum.counselor } },
      relations: ['role'],
      order: { id: 'ASC' },
    });

    for (const user of counselorUsers) {
      if (!user.email) continue;
      const staff = await this.staffService.findByEmail(user.email);
      if (staff) return staff.id;
    }
    return null;
  }

  private async createCaseIfNeeded(
    studentId: string,
    triggerType: CounselorCaseTriggerType,
    count: number,
  ): Promise<boolean> {
    const existingOpenCase = await this.caseRepo.findOne({
      where: { studentId, triggerType, status: CounselorCaseStatus.OPEN },
    });
    if (existingOpenCase) return false;

    const caseRow = await this.caseRepo.save(
      this.caseRepo.create({
        studentId,
        triggerType,
        triggerSummary: buildCaseTriggerSummary(triggerType, count),
        status: CounselorCaseStatus.OPEN,
      }),
    );

    const counselorStaffId = await this.resolveOneCounselorStaffId();
    if (counselorStaffId) {
      await this.notificationService.createForStaff(
        counselorStaffId,
        'Wellbeing Check-In Recommended',
        `${caseRow.triggerSummary}. Recommend a wellbeing check-in.`,
        'counselor_case',
      );
    }
    return true;
  }

  @Cron('0 7 * * *')
  async detectAndCreateCases(): Promise<void> {
    const lookbackDays = this.configService.get('wellbeingCase.lookbackDays', {
      infer: true,
    }) as number;
    const observationThreshold = this.configService.get(
      'wellbeingCase.observationThreshold',
      { infer: true },
    ) as number;
    const lowMoodThreshold = this.configService.get('wellbeingCase.lowMoodThreshold', {
      infer: true,
    }) as number;
    const lowMoodMaxValue = this.configService.get('wellbeingCase.lowMoodMaxValue', {
      infer: true,
    }) as number;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - lookbackDays);
    const cutoffDate = cutoff.toISOString().split('T')[0];

    const [recentObservations, recentLowMoodCheckIns] = await Promise.all([
      this.observationRepo.find({ where: { createdAt: MoreThanOrEqual(cutoff) } }),
      this.moodCheckInService.findLowMoodCheckInsSince(cutoffDate, lowMoodMaxValue),
    ]);

    const observationCounts = new Map<string, number>();
    for (const observation of recentObservations) {
      observationCounts.set(
        observation.studentId,
        (observationCounts.get(observation.studentId) ?? 0) + 1,
      );
    }

    const lowMoodCounts = new Map<string, number>();
    for (const checkIn of recentLowMoodCheckIns) {
      lowMoodCounts.set(checkIn.studentId, (lowMoodCounts.get(checkIn.studentId) ?? 0) + 1);
    }

    let casesCreated = 0;

    for (const [studentId, count] of observationCounts) {
      if (count < observationThreshold) continue;
      const created = await this.createCaseIfNeeded(
        studentId,
        CounselorCaseTriggerType.BEHAVIORAL_OBSERVATIONS,
        count,
      );
      if (created) casesCreated++;
    }

    for (const [studentId, count] of lowMoodCounts) {
      if (count < lowMoodThreshold) continue;
      const created = await this.createCaseIfNeeded(
        studentId,
        CounselorCaseTriggerType.LOW_MOOD_CHECKINS,
        count,
      );
      if (created) casesCreated++;
    }

    this.logger.log(`Counselor case detection run: ${casesCreated} new case(s) created.`);
  }
}
