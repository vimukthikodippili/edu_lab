import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  LeaveRequestEntity,
  LeaveStatus,
} from './entities/leave-request.entity';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { LeaveApprovedEvent } from './events/leave-approved.event';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveRequestEntity)
    private readonly leaveRepo: Repository<LeaveRequestEntity>,

    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(staffId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequestEntity> {
    const request = this.leaveRepo.create({
      staffId,
      leaveType: dto.leaveType,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      reason: dto.reason,
      status: LeaveStatus.PENDING,
    });
    return this.leaveRepo.save(request);
  }

  async findAll(staffId?: string): Promise<LeaveRequestEntity[]> {
    return this.leaveRepo.find({
      where: staffId ? { staffId } : {},
      relations: ['staff', 'decidedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async decide(
    id: string,
    decision: LeaveStatus.APPROVED | LeaveStatus.REJECTED,
    decidedByStaffId: string,
    decisionNote?: string,
  ): Promise<LeaveRequestEntity> {
    const request = await this.leaveRepo.findOne({
      where: { id },
      relations: ['staff'],
    });
    if (!request) {
      throw new NotFoundException(`Leave request ${id} not found.`);
    }
    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Leave request has already been ${request.status}.`,
      );
    }

    request.status = decision;
    request.decidedById = decidedByStaffId;
    request.decidedAt = new Date();
    request.decisionNote = decisionNote ?? null;
    await this.leaveRepo.save(request);

    await this.auditService.log({
      actorId: decidedByStaffId,
      action: decision === LeaveStatus.APPROVED ? 'approve' : 'reject',
      targetType: 'leave',
      targetId: id,
      reason: decisionNote,
    });

    const verb = decision === LeaveStatus.APPROVED ? 'approved' : 'rejected';
    await this.notificationService.createForStaff(
      request.staffId,
      `Leave Request ${decision === LeaveStatus.APPROVED ? 'Approved' : 'Rejected'}`,
      `Your ${request.leaveType} leave request has been ${verb}.${decisionNote ? ' Note: ' + decisionNote : ''}`,
      'leave_decision',
    );

    if (decision === LeaveStatus.APPROVED) {
      this.eventEmitter.emit(
        'leave.approved',
        new LeaveApprovedEvent(
          id,
          request.staffId,
          request.leaveType,
          request.startDate,
          request.endDate,
        ),
      );
    }

    return request;
  }
}
