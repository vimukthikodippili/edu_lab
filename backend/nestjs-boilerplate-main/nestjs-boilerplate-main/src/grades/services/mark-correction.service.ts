import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MarkCorrectionRequestEntity,
  MarkCorrectionStatus,
} from '../entities/mark-correction-request.entity';
import { MarkEntity } from '../entities/mark.entity';
import { CreateMarkCorrectionRequestDto } from '../dto/create-mark-correction-request.dto';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notification/notification.service';

@Injectable()
export class MarkCorrectionService {
  constructor(
    @InjectRepository(MarkCorrectionRequestEntity)
    private readonly correctionRepo: Repository<MarkCorrectionRequestEntity>,
    @InjectRepository(MarkEntity)
    private readonly markRepo: Repository<MarkEntity>,

    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(
    markId: string,
    teacherId: string,
    dto: CreateMarkCorrectionRequestDto,
  ): Promise<MarkCorrectionRequestEntity> {
    const mark = await this.markRepo.findOne({ where: { id: markId } });
    if (!mark) {
      throw new NotFoundException(`Mark ${markId} not found.`);
    }
    if (dto.correctedScore > mark.maxScore) {
      throw new UnprocessableEntityException(
        `Corrected score cannot exceed the maximum of ${mark.maxScore}.`,
      );
    }

    const existingPending = await this.correctionRepo.findOne({
      where: { markId, status: MarkCorrectionStatus.PENDING },
    });
    if (existingPending) {
      throw new ConflictException(
        'A correction request is already pending for this mark.',
      );
    }

    const request = this.correctionRepo.create({
      markId,
      requestedByTeacherId: teacherId,
      originalScore: mark.score ?? '0',
      correctedScore: String(dto.correctedScore),
      reason: dto.reason,
      status: MarkCorrectionStatus.PENDING,
    });
    return this.correctionRepo.save(request);
  }

  async findMine(teacherId: string): Promise<MarkCorrectionRequestEntity[]> {
    return this.correctionRepo.find({
      where: { requestedByTeacherId: teacherId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPending(): Promise<MarkCorrectionRequestEntity[]> {
    return this.correctionRepo.find({
      where: { status: MarkCorrectionStatus.PENDING },
      relations: ['requestedByTeacher'],
      order: { createdAt: 'DESC' },
    });
  }

  async decide(
    id: string,
    decision: MarkCorrectionStatus.APPROVED | MarkCorrectionStatus.REJECTED,
    decidedByStaffId: string,
    decisionNote?: string,
  ): Promise<MarkCorrectionRequestEntity> {
    const request = await this.correctionRepo.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Mark correction request ${id} not found.`);
    }
    if (request.status !== MarkCorrectionStatus.PENDING) {
      throw new BadRequestException(
        `Mark correction request has already been ${request.status}.`,
      );
    }

    request.status = decision;
    request.decidedById = decidedByStaffId;
    request.decidedAt = new Date();
    request.decisionNote = decisionNote ?? null;
    await this.correctionRepo.save(request);

    const mark = await this.markRepo.findOne({ where: { id: request.markId } });
    if (!mark) {
      throw new NotFoundException(`Mark ${request.markId} not found.`);
    }
    if (decision === MarkCorrectionStatus.APPROVED) {
      mark.score = request.correctedScore;
      await this.markRepo.save(mark);
    }

    await this.auditService.log({
      actorId: decidedByStaffId,
      action: decision === MarkCorrectionStatus.APPROVED ? 'approve' : 'reject',
      targetType: 'mark_correction',
      targetId: id,
      reason:
        `Mark corrected from ${request.originalScore} to ${request.correctedScore} ` +
        `(student ${mark.studentId}, assessment ${mark.assessmentId}).${decisionNote ? ' ' + decisionNote : ''}`,
    });

    const verb = decision === MarkCorrectionStatus.APPROVED ? 'approved' : 'rejected';
    await this.notificationService.createForStaff(
      request.requestedByTeacherId,
      `Mark Correction Request ${decision === MarkCorrectionStatus.APPROVED ? 'Approved' : 'Rejected'}`,
      `Your mark correction request has been ${verb}.${decisionNote ? ' Note: ' + decisionNote : ''}`,
      'mark_correction_decision',
    );

    return request;
  }
}
