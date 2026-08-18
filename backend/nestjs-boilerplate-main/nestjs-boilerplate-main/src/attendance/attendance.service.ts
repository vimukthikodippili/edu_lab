import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttendanceRecordEntity, AttendanceStatus } from './entities/attendance-record.entity';
import { SchoolHolidayEntity } from './entities/school-holiday.entity';
import { StaffAttendanceEntity, StaffAttendanceStatus } from './entities/staff-attendance.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { LeaveRequestEntity, LeaveStatus } from '../leave/entities/leave-request.entity';
import { StaffEntity, StaffStatus } from '../staff/entities/staff.entity';
import { SchoolCalendarConfigService } from '../school-calendar-config/school-calendar-config.service';
import { BulkMarkAttendanceDto } from './dto/bulk-mark-attendance.dto';
import { AttendanceTrendGranularity } from './dto/get-staff-attendance-trend.dto';
import { AbsenceMarkedEvent } from './events/absence-marked.event';

const PRESENT_LIKE_STATUSES = [
  StaffAttendanceStatus.PRESENT,
  StaffAttendanceStatus.LATE,
  StaffAttendanceStatus.HALF_DAY,
];

export interface DayAttendanceRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  attendanceId: string | null;
  status: string | null;
  note: string | null;
}

export interface StaffDayAttendanceRow {
  staffId: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  designation: string;
  department: string;
  status: StaffAttendanceStatus | null;
  markedAt: string | null;
}

export interface StaffAttendanceTrendBucket {
  bucket: string;
  presentLikeCount: number;
  totalCount: number;
  rate: number;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecordEntity)
    private readonly attendanceRepo: Repository<AttendanceRecordEntity>,

    @InjectRepository(SchoolHolidayEntity)
    private readonly holidayRepo: Repository<SchoolHolidayEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,

    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,

    @InjectRepository(LeaveRequestEntity)
    private readonly leaveRepo: Repository<LeaveRequestEntity>,

    @InjectRepository(StaffAttendanceEntity)
    private readonly staffAttendanceRepo: Repository<StaffAttendanceEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,

    private readonly calendarConfigService: SchoolCalendarConfigService,

    private readonly eventEmitter: EventEmitter2,
  ) {}

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  async getMyAttendanceToday(staffId: string): Promise<StaffAttendanceEntity | null> {
    return this.staffAttendanceRepo.findOne({
      where: { staffId, date: this.today() as unknown as Date },
    });
  }

  async markMyAttendance(staffId: string): Promise<StaffAttendanceEntity> {
    const today = this.today();
    const existing = await this.staffAttendanceRepo.findOne({
      where: { staffId, date: today as unknown as Date },
    });
    if (existing) {
      throw new ConflictException('You have already marked your attendance for today.');
    }
    return this.staffAttendanceRepo.save(
      this.staffAttendanceRepo.create({
        staffId,
        date: today as unknown as Date,
        status: StaffAttendanceStatus.PRESENT,
        markedById: staffId,
      }),
    );
  }

  async getStaffDayAttendance(date: string): Promise<StaffDayAttendanceRow[]> {
    const staff = await this.staffRepo.find({
      where: { status: StaffStatus.ACTIVE },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    const records = await this.staffAttendanceRepo.findBy({
      date: date as unknown as Date,
    });
    const recordMap = new Map(records.map((r) => [r.staffId, r]));

    return staff.map((s) => {
      const record = recordMap.get(s.id);
      return {
        staffId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        employeeNumber: s.employeeNumber,
        designation: s.designation,
        department: s.department,
        status: record?.status ?? null,
        markedAt: record?.updatedAt?.toISOString() ?? null,
      };
    });
  }

  async markStaffAttendance(
    staffId: string,
    date: string,
    status: StaffAttendanceStatus,
    markedById: string | null,
  ): Promise<StaffAttendanceEntity> {
    const staff = await this.staffRepo.findOne({ where: { id: staffId } });
    if (!staff) {
      throw new NotFoundException('Staff member not found.');
    }

    const existing = await this.staffAttendanceRepo.findOne({
      where: { staffId, date: date as unknown as Date },
    });

    if (existing) {
      existing.status = status;
      existing.markedById = markedById;
      return this.staffAttendanceRepo.save(existing);
    }

    return this.staffAttendanceRepo.save(
      this.staffAttendanceRepo.create({
        staffId,
        date: date as unknown as Date,
        status,
        markedById,
      }),
    );
  }

  async getStaffAttendanceTrend(
    granularity: AttendanceTrendGranularity,
    from: string,
    to: string,
  ): Promise<StaffAttendanceTrendBucket[]> {
    const truncUnit = granularity === AttendanceTrendGranularity.DAY ? 'day' : granularity;

    const rows = await this.staffAttendanceRepo
      .createQueryBuilder('sa')
      .select(`date_trunc('${truncUnit}', sa.date)`, 'bucket')
      .addSelect(
        `COUNT(*) FILTER (WHERE sa.status IN (:...presentLike))`,
        'presentLikeCount',
      )
      .addSelect('COUNT(*)', 'totalCount')
      .where('sa.date BETWEEN :from AND :to', { from, to })
      .setParameter('presentLike', PRESENT_LIKE_STATUSES)
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{ bucket: Date; presentLikeCount: string; totalCount: string }>();

    return rows.map((r) => {
      const total = parseInt(r.totalCount, 10);
      const presentLike = parseInt(r.presentLikeCount, 10);
      return {
        bucket: this.formatBucket(r.bucket, granularity),
        presentLikeCount: presentLike,
        totalCount: total,
        rate: total > 0 ? Math.round((presentLike / total) * 1000) / 10 : 0,
      };
    });
  }

  private formatBucket(bucket: Date, granularity: AttendanceTrendGranularity): string {
    const iso = new Date(bucket).toISOString();
    if (granularity === AttendanceTrendGranularity.YEAR) return iso.slice(0, 4);
    if (granularity === AttendanceTrendGranularity.MONTH) return iso.slice(0, 7);
    return iso.slice(0, 10);
  }

  async getMyClassSections(teacherId: string): Promise<ClassSectionEntity[]> {
    const requirements = await this.requirementRepo.find({
      where: { teacherId },
    });

    const sectionIds = [...new Set(requirements.map((r) => r.classSectionId))];
    if (sectionIds.length === 0) return [];

    const sections = await this.classSectionRepo.find({
      where: { id: In(sectionIds) },
    });

    return sections.sort((a, b) => {
      if (a.grade.level !== b.grade.level) return a.grade.level - b.grade.level;
      return a.name.localeCompare(b.name);
    });
  }

  async getDayAttendance(classSectionId: number, date: string): Promise<DayAttendanceRow[]> {
    const students = await this.studentRepo.find({
      where: { classSectionId, status: StudentStatus.ACTIVE },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    const dateObj = new Date(date + 'T00:00:00Z');
    const records = await this.attendanceRepo.findBy({
      classSectionId,
      date: dateObj as unknown as Date,
    });
    const recordMap = new Map(records.map((r) => [r.studentId, r]));

    return students.map((s) => {
      const record = recordMap.get(s.id);
      return {
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        admissionNumber: s.admissionNumber,
        attendanceId: record?.id ?? null,
        status: record?.status ?? null,
        note: record?.note ?? null,
      };
    });
  }

  async bulkMark(
    dto: BulkMarkAttendanceDto,
    teacherId: string,
  ): Promise<AttendanceRecordEntity[]> {
    const section = await this.validateDate(dto.date, dto.classSectionId, dto.overrideReason);
    await this.assertCanMarkAttendance(section, teacherId, dto.date);

    const dateObj = new Date(dto.date + 'T00:00:00Z');

    const existing = await this.attendanceRepo.findBy({
      classSectionId: dto.classSectionId,
      date: dateObj as unknown as Date,
    });
    const existingMap = new Map(existing.map((r) => [r.studentId, r]));

    const toSave = dto.entries.map((entry) => {
      const record =
        existingMap.get(entry.studentId) ??
        this.attendanceRepo.create({
          studentId: entry.studentId,
          classSectionId: dto.classSectionId,
          date: dateObj as unknown as Date,
          markedById: teacherId,
        });

      record.status = entry.status;
      record.note = entry.note ?? null;
      record.overrideReason = dto.overrideReason ?? null;
      record.markedById = teacherId;
      return record;
    });

    const saved = await this.attendanceRepo.save(toSave);

    // Fire-and-forget absence notifications — errors are handled inside the listener
    for (const record of saved) {
      if (record.status === AttendanceStatus.ABSENT) {
        this.eventEmitter.emit(
          'attendance.absent_marked',
          new AbsenceMarkedEvent(record.id, record.studentId, dto.classSectionId, dto.date),
        );
      }
    }

    return saved;
  }

  private async validateDate(
    date: string,
    classSectionId: number,
    overrideReason?: string,
  ): Promise<ClassSectionEntity> {
    const section = await this.classSectionRepo.findOne({
      where: { id: classSectionId },
    });
    if (!section) {
      throw new NotFoundException(`Class section ${classSectionId} not found.`);
    }

    const config = await this.calendarConfigService.findByGradeLevel(section.grade.level);

    const dateObj = new Date(date + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay(); // 0=Sun, 6=Sat

    const isWeekend =
      config.workingDaysPerWeek === 6
        ? dayOfWeek === 0 // only Sunday blocked for 6-day week
        : dayOfWeek === 0 || dayOfWeek === 6; // Sat+Sun blocked for 5-day week

    const holiday = await this.holidayRepo.findOne({
      where: { date: dateObj as unknown as Date },
    });

    const blockReason = isWeekend
      ? 'non-working day'
      : holiday
        ? `school holiday: ${holiday.description}`
        : null;

    if (blockReason && !overrideReason?.trim()) {
      throw new UnprocessableEntityException(
        `${date} is a ${blockReason}. Provide an overrideReason to proceed.`,
      );
    }

    return section;
  }

  /**
   * Once a class section has an assigned class teacher, only that teacher may mark
   * daily attendance for it — unless the class teacher is on approved leave that day,
   * in which case any other teacher already assigned to the section may mark it.
   * Sections with no class teacher assigned keep the original open behavior.
   */
  private async assertCanMarkAttendance(
    section: ClassSectionEntity,
    teacherId: string,
    date: string,
  ): Promise<void> {
    if (!section.classTeacherStaffId) return;
    if (section.classTeacherStaffId === teacherId) return;

    const teachesSection = await this.requirementRepo.findOne({
      where: { teacherId, classSectionId: section.id },
    });
    if (!teachesSection) {
      throw new ForbiddenException(
        'Only the class teacher may mark attendance for this section.',
      );
    }

    const classTeacherAbsent = await this.isStaffOnApprovedLeave(
      section.classTeacherStaffId,
      date,
    );
    if (!classTeacherAbsent) {
      throw new ForbiddenException(
        'Only the class teacher may mark attendance for this section today.',
      );
    }
  }

  private async isStaffOnApprovedLeave(staffId: string, date: string): Promise<boolean> {
    const dateObj = new Date(date + 'T00:00:00Z');
    const leave = await this.leaveRepo.findOne({
      where: {
        staffId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(dateObj as unknown as Date),
        endDate: MoreThanOrEqual(dateObj as unknown as Date),
      },
    });
    return !!leave;
  }
}
