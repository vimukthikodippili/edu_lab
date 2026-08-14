import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditAction, AuditLogEntity, AuditTargetType } from './entities/audit-log.entity';
import { StaffEntity } from '../staff/entities/staff.entity';

export interface LogAuditParams {
  actorId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  reason?: string | null;
}

export interface RecentActivityRow {
  id: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  reason: string | null;
  createdAt: Date;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
  ) {}

  async log(params: LogAuditParams): Promise<void> {
    const entry = this.auditRepo.create({
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      reason: params.reason ?? null,
    });
    await this.auditRepo.save(entry);
  }

  // AuditLogEntity.actorId is a bare UUID with no FK/relation — same loose-coupling
  // convention used for mark_correction_request.markId — so actor names are batch-resolved
  // here rather than via a join, mirroring PrincipalService.loadMarkContext().
  async findRecent(limit = 15): Promise<RecentActivityRow[]> {
    const entries = await this.auditRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
    if (entries.length === 0) return [];

    const actorIds = [...new Set(entries.map((e) => e.actorId))];
    const staff = await this.staffRepo.find({ where: { id: In(actorIds) } });
    const staffById = new Map(staff.map((s) => [s.id, s]));

    return entries.map((e) => {
      const actor = staffById.get(e.actorId);
      return {
        id: e.id,
        actorId: e.actorId,
        actorName: actor ? `${actor.firstName} ${actor.lastName}` : 'Unknown',
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        reason: e.reason,
        createdAt: e.createdAt,
      };
    });
  }
}
