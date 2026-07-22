import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { LabEntity } from '../labs/entities/lab.entity';
import { LabBookingEntity } from '../labs/entities/lab-booking.entity';
import { EquipmentEntity } from '../equipment/entities/equipment.entity';
import { EquipmentDamageReportEntity } from '../session-equipment/entities/equipment-damage-report.entity';
import { ExperimentLogEntity } from '../experiment-log/entities/experiment-log.entity';
import { LabReportAssignmentEntity } from '../lab-reports/entities/lab-report-assignment.entity';
import { LabReportSubmissionEntity } from '../lab-reports/entities/lab-report-submission.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { LabOverviewFilterDto } from './dto/lab-overview-filter.dto';
import {
  EquipmentHealthItemRef,
  EquipmentHealthSummary,
  ExperimentCoverageRow,
  LabOverviewDashboard,
  LabReportPerformanceRow,
  LabUtilisationRow,
  LowStockItemRef,
  RecentDamageReportRow,
} from './lab-overview.types';

const DEFAULT_WORKING_DAYS_PER_WEEK = 5;
const DEFAULT_PERIODS_PER_DAY = 8;
const CAPPED_LIST_SIZE = 20;

@Injectable()
export class LabOverviewService {
  constructor(
    @InjectRepository(LabEntity)
    private readonly labRepo: Repository<LabEntity>,

    @InjectRepository(LabBookingEntity)
    private readonly bookingRepo: Repository<LabBookingEntity>,

    @InjectRepository(EquipmentEntity)
    private readonly equipmentRepo: Repository<EquipmentEntity>,

    @InjectRepository(EquipmentDamageReportEntity)
    private readonly damageReportRepo: Repository<EquipmentDamageReportEntity>,

    @InjectRepository(ExperimentLogEntity)
    private readonly experimentLogRepo: Repository<ExperimentLogEntity>,

    @InjectRepository(LabReportAssignmentEntity)
    private readonly assignmentRepo: Repository<LabReportAssignmentEntity>,

    @InjectRepository(LabReportSubmissionEntity)
    private readonly submissionRepo: Repository<LabReportSubmissionEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
  ) {}

  async getDashboard(filter: LabOverviewFilterDto): Promise<LabOverviewDashboard> {
    const [labUtilisation, equipmentHealth, experimentCoverage, labReportPerformance] = await Promise.all([
      this.getLabUtilisation(filter),
      this.getEquipmentHealth(filter),
      this.getExperimentCoverage(filter),
      this.getLabReportPerformance(filter),
    ]);
    return { labUtilisation, equipmentHealth, experimentCoverage, labReportPerformance };
  }

  async getLabUtilisation(filter: LabOverviewFilterDto): Promise<LabUtilisationRow[]> {
    const labs = await this.labRepo.find({ where: filter.labId ? { id: filter.labId } : {} });

    const bookingWhere: FindOptionsWhere<LabBookingEntity> = { status: 'confirmed' };
    if (filter.subjectId) bookingWhere.subjectId = filter.subjectId;
    if (filter.classSectionId != null) bookingWhere.classSectionId = filter.classSectionId;
    const dateRange = this.buildStringDateRangeWhere(filter.dateFrom, filter.dateTo);
    if (dateRange) bookingWhere.date = dateRange;

    const bookings = await this.bookingRepo.find({ where: bookingWhere });
    const bookingCountByLabId = new Map<string, number>();
    for (const b of bookings) {
      bookingCountByLabId.set(b.labId, (bookingCountByLabId.get(b.labId) ?? 0) + 1);
    }

    const totalAvailableSlots = this.computeTotalAvailableSlots(filter);

    return labs.map((lab) => {
      const confirmedBookings = bookingCountByLabId.get(lab.id) ?? 0;
      return {
        labId: lab.id,
        labName: lab.name,
        confirmedBookings,
        totalAvailableSlots,
        utilisationRate:
          totalAvailableSlots != null && totalAvailableSlots > 0
            ? confirmedBookings / totalAvailableSlots
            : null,
      };
    });
  }

  async getEquipmentHealth(filter: LabOverviewFilterDto): Promise<EquipmentHealthSummary> {
    const equipmentWhere: FindOptionsWhere<EquipmentEntity> = {};
    if (filter.labId) equipmentWhere.labId = filter.labId;
    const items = await this.equipmentRepo.find({ where: equipmentWhere });

    const labNames = await this.labNameMap([...new Set(items.map((i) => i.labId))]);

    const conditionCounts = { good: 0, fair: 0, poor: 0 };
    const poorConditionItems: EquipmentHealthItemRef[] = [];
    const lowStockItems: LowStockItemRef[] = [];
    let lowStockCount = 0;

    for (const item of items) {
      conditionCounts[item.condition] += 1;
      if (item.condition === 'poor' && poorConditionItems.length < CAPPED_LIST_SIZE) {
        poorConditionItems.push({
          id: item.id,
          name: item.name,
          labId: item.labId,
          labName: labNames.get(item.labId) ?? '—',
        });
      }
      if (item.minStockLevel != null && item.quantity <= item.minStockLevel) {
        lowStockCount += 1;
        if (lowStockItems.length < CAPPED_LIST_SIZE) {
          lowStockItems.push({
            id: item.id,
            name: item.name,
            labId: item.labId,
            labName: labNames.get(item.labId) ?? '—',
            quantity: item.quantity,
            minStockLevel: item.minStockLevel,
          });
        }
      }
    }

    const damageWhere: FindOptionsWhere<EquipmentDamageReportEntity> = {};
    const reportedAtRange = this.buildTimestampRangeWhere(filter.dateFrom, filter.dateTo);
    if (reportedAtRange) damageWhere.reportedAt = reportedAtRange;

    const damageReports = await this.damageReportRepo.find({
      where: damageWhere,
      relations: ['labBooking'],
      order: { reportedAt: 'DESC' },
    });
    const filteredDamageReports = damageReports.filter(
      (r) =>
        (!filter.labId || r.labBooking.labId === filter.labId) &&
        (!filter.subjectId || r.labBooking.subjectId === filter.subjectId) &&
        (filter.classSectionId == null || r.labBooking.classSectionId === filter.classSectionId),
    );

    const damageLabNames = await this.labNameMap([
      ...new Set(filteredDamageReports.map((r) => r.labBooking.labId)),
    ]);

    const damageReportsByType = { damaged: 0, missing: 0 };
    const recentDamageReports: RecentDamageReportRow[] = [];
    for (const r of filteredDamageReports) {
      damageReportsByType[r.reportType] += 1;
      if (recentDamageReports.length < CAPPED_LIST_SIZE) {
        recentDamageReports.push({
          id: r.id,
          equipmentName: r.equipment.name,
          labId: r.labBooking.labId,
          labName: damageLabNames.get(r.labBooking.labId) ?? '—',
          reportType: r.reportType,
          quantity: r.quantity,
          reportedAt: r.reportedAt.toISOString(),
        });
      }
    }

    return {
      conditionCounts,
      poorConditionItems,
      lowStockCount,
      lowStockItems,
      damageReportsByType,
      recentDamageReports,
    };
  }

  async getExperimentCoverage(filter: LabOverviewFilterDto): Promise<ExperimentCoverageRow[]> {
    const logs = await this.experimentLogRepo.find();

    const filtered = logs.filter((log) => {
      const b = log.labBooking;
      if (filter.labId && b.labId !== filter.labId) return false;
      if (filter.subjectId && b.subjectId !== filter.subjectId) return false;
      if (filter.classSectionId != null && b.classSectionId !== filter.classSectionId) return false;
      if (filter.dateFrom && b.date < filter.dateFrom) return false;
      if (filter.dateTo && b.date > filter.dateTo) return false;
      return true;
    });

    const labNames = await this.labNameMap([...new Set(filtered.map((l) => l.labBooking.labId))]);

    const counts = new Map<
      string,
      { classSectionId: number; className: string; labId: string; count: number }
    >();
    for (const log of filtered) {
      const b = log.labBooking;
      if (b.classSectionId == null) continue; // ad-hoc unlinked booking — nothing to attribute to
      const key = `${b.classSectionId}:${b.labId}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          classSectionId: b.classSectionId,
          className: b.classSection?.name ?? '—',
          labId: b.labId,
          count: 1,
        });
      }
    }

    return [...counts.values()].map((c) => ({
      classSectionId: c.classSectionId,
      className: c.className,
      labId: c.labId,
      labName: labNames.get(c.labId) ?? '—',
      experimentCount: c.count,
    }));
  }

  async getLabReportPerformance(filter: LabOverviewFilterDto): Promise<LabReportPerformanceRow[]> {
    const assignments = await this.assignmentRepo.find({
      relations: ['experimentLog', 'experimentLog.labBooking'],
    });

    const filtered = assignments.filter((a) => {
      if (filter.subjectId && a.subjectId !== filter.subjectId) return false;
      if (filter.classSectionId != null && a.classSectionId !== filter.classSectionId) return false;
      if (filter.labId && a.experimentLog?.labBooking?.labId !== filter.labId) return false;
      if (filter.dateFrom && a.dueDate < filter.dateFrom) return false;
      if (filter.dateTo && a.dueDate > filter.dateTo) return false;
      return true;
    });

    if (filtered.length === 0) return [];

    const assignmentIds = filtered.map((a) => a.id);
    const submissions = await this.submissionRepo.find({
      where: { labReportAssignmentId: In(assignmentIds) },
    });
    const submissionsByAssignmentId = new Map<string, LabReportSubmissionEntity[]>();
    for (const s of submissions) {
      const list = submissionsByAssignmentId.get(s.labReportAssignmentId) ?? [];
      list.push(s);
      submissionsByAssignmentId.set(s.labReportAssignmentId, list);
    }

    const groups = new Map<
      string,
      {
        classSectionId: number;
        className: string;
        subjectId: string;
        subjectName: string;
        assignmentIds: string[];
      }
    >();
    for (const a of filtered) {
      const key = `${a.classSectionId}:${a.subjectId}`;
      const g = groups.get(key);
      if (g) {
        g.assignmentIds.push(a.id);
      } else {
        groups.set(key, {
          classSectionId: a.classSectionId,
          className: a.classSection.name,
          subjectId: a.subjectId,
          subjectName: a.subject.name,
          assignmentIds: [a.id],
        });
      }
    }

    const enrolledCountCache = new Map<number, number>();
    const rows: LabReportPerformanceRow[] = [];
    for (const g of groups.values()) {
      let enrolledCount = enrolledCountCache.get(g.classSectionId);
      if (enrolledCount === undefined) {
        enrolledCount = await this.studentRepo.count({
          where: { classSectionId: g.classSectionId, status: StudentStatus.ACTIVE },
        });
        enrolledCountCache.set(g.classSectionId, enrolledCount);
      }

      const groupSubmissions = g.assignmentIds.flatMap(
        (id) => submissionsByAssignmentId.get(id) ?? [],
      );
      const gradedSubmissions = groupSubmissions.filter((s) => s.grade != null);
      const averageGrade = gradedSubmissions.length
        ? gradedSubmissions.reduce((sum, s) => sum + Number(s.grade), 0) / gradedSubmissions.length
        : null;

      const totalPossible = g.assignmentIds.length * enrolledCount;
      const submissionRate = totalPossible > 0 ? groupSubmissions.length / totalPossible : 0;

      rows.push({
        classSectionId: g.classSectionId,
        className: g.className,
        subjectId: g.subjectId,
        subjectName: g.subjectName,
        assignmentCount: g.assignmentIds.length,
        averageGrade,
        submissionRate,
      });
    }

    return rows;
  }

  private computeTotalAvailableSlots(filter: LabOverviewFilterDto): number | null {
    if (!filter.dateFrom || !filter.dateTo) return null;
    const from = new Date(`${filter.dateFrom}T00:00:00.000Z`);
    const to = new Date(`${filter.dateTo}T00:00:00.000Z`);
    const dayCount = Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
    if (dayCount <= 0) return null;
    const weeks = Math.ceil(dayCount / 7);
    const workingDaysPerWeek = filter.workingDaysPerWeek ?? DEFAULT_WORKING_DAYS_PER_WEEK;
    const periodsPerDay = filter.periodsPerDay ?? DEFAULT_PERIODS_PER_DAY;
    return weeks * workingDaysPerWeek * periodsPerDay;
  }

  private buildStringDateRangeWhere(dateFrom?: string, dateTo?: string) {
    if (dateFrom && dateTo) return Between(dateFrom, dateTo);
    if (dateFrom) return MoreThanOrEqual(dateFrom);
    if (dateTo) return LessThanOrEqual(dateTo);
    return undefined;
  }

  private buildTimestampRangeWhere(dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : undefined;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : undefined;
    if (from && to) return Between(from, to);
    if (from) return MoreThanOrEqual(from);
    if (to) return LessThanOrEqual(to);
    return undefined;
  }

  private async labNameMap(labIds: string[]): Promise<Map<string, string>> {
    if (labIds.length === 0) return new Map();
    const labs = await this.labRepo.find({ where: { id: In(labIds) } });
    return new Map(labs.map((l) => [l.id, l.name]));
  }
}
