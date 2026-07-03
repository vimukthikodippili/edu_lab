import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttendanceRecordEntity, AttendanceStatus } from './entities/attendance-record.entity';
import { SchoolHolidayEntity } from './entities/school-holiday.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { SchoolCalendarConfigService } from '../school-calendar-config/school-calendar-config.service';
import { GradeStage } from '../students/entities/grade.entity';
import { BulkMarkAttendanceDto } from './dto/bulk-mark-attendance.dto';
import { AbsenceMarkedEvent } from './events/absence-marked.event';

export interface DayAttendanceRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  attendanceId: string | null;
  status: string | null;
  note: string | null;
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

    private readonly calendarConfigService: SchoolCalendarConfigService,

    private readonly eventEmitter: EventEmitter2,
  ) {}

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
    await this.validateDate(dto.date, dto.classSectionId, dto.overrideReason);

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
  ): Promise<void> {
    const section = await this.classSectionRepo.findOne({
      where: { id: classSectionId },
    });
    if (!section) {
      throw new NotFoundException(`Class section ${classSectionId} not found.`);
    }

    const config = await this.calendarConfigService.findByStage(
      section.grade.stage as GradeStage,
    );

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
  }
}
