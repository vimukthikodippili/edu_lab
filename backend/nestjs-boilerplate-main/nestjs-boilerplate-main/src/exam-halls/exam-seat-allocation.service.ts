import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { ExamEntity } from './entities/exam.entity';
import { ExamHallEntity } from './entities/exam-hall.entity';
import { ExamSeatEntity } from './entities/exam-seat.entity';
import { ExamSeatAllocationEntity } from './entities/exam-seat-allocation.entity';
import { AdmitCardEntity } from './entities/admit-card.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { StudentSubjectEnrollmentEntity } from '../enrollments/entities/student-subject-enrollment.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { ExamService } from './exam.service';
import { AutoAllocateDto } from './dto/auto-allocate.dto';
import { OverrideSeatDto } from './dto/override-seat.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';

export interface AutoAllocateResult {
  allocatedCount: number;
  hallsUsed: number;
  specialNeedsPlaced: number;
}

export interface AllocationRow {
  allocation: ExamSeatAllocationEntity;
  studentName: string;
  hallName: string;
  seatLabel: string;
}

export interface AdmitCardView {
  admitCard: AdmitCardEntity;
  allocation: ExamSeatAllocationEntity;
  exam: ExamEntity;
  hallName: string;
  seatLabel: string;
}

/** P5-EH — FR-P5-EH-04/05/06/07/08/09. The core of this story: auto-allocation, manual override,
 * and admit-card retrieval. Section-Head grade-range checks are delegated to
 * `ExamService.assertSectionHeadCanActOnGrade` (shared, not duplicated) since it's keyed off the
 * exam's own `gradeId` the same way for every action here. */
@Injectable()
export class ExamSeatAllocationService {
  constructor(
    @InjectRepository(ExamEntity)
    private readonly examRepo: Repository<ExamEntity>,

    @InjectRepository(ExamHallEntity)
    private readonly hallRepo: Repository<ExamHallEntity>,

    @InjectRepository(ExamSeatEntity)
    private readonly seatRepo: Repository<ExamSeatEntity>,

    @InjectRepository(ExamSeatAllocationEntity)
    private readonly allocationRepo: Repository<ExamSeatAllocationEntity>,

    @InjectRepository(AdmitCardEntity)
    private readonly admitCardRepo: Repository<AdmitCardEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(StudentSubjectEnrollmentEntity)
    private readonly enrollmentRepo: Repository<StudentSubjectEnrollmentEntity>,

    private readonly examService: ExamService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {}

  async autoAllocate(
    examId: string,
    dto: AutoAllocateDto,
    actorStaffId: string,
    isFullyPrivileged: boolean,
    isSectionHead: boolean,
  ): Promise<AutoAllocateResult> {
    const exam = await this.getExamOrThrow(examId);
    if (!isFullyPrivileged) {
      await this.examService.assertSectionHeadCanActOnGrade(actorStaffId, isSectionHead, exam.gradeId);
    }

    const existingCount = await this.allocationRepo.count({ where: { examId } });
    if (existingCount > 0) {
      throw new ConflictException('This exam has already been allocated. Use manual override to change individual seats.');
    }

    const enrollments = await this.enrollmentRepo.find({ where: { subjectId: exam.subjectId } });
    const enrolledStudentIds = enrollments.map((e) => e.studentId);
    if (enrolledStudentIds.length === 0) {
      return { allocatedCount: 0, hallsUsed: 0, specialNeedsPlaced: 0 };
    }

    const candidates = await this.studentRepo.find({
      where: { id: In(enrolledStudentIds), gradeId: exam.gradeId, status: StudentStatus.ACTIVE },
      order: { classSectionId: 'ASC', lastName: 'ASC', firstName: 'ASC' },
    });
    if (candidates.length === 0) {
      return { allocatedCount: 0, hallsUsed: 0, specialNeedsPlaced: 0 };
    }

    const availableHalls = await this.findAvailableHalls(exam.date, examId);
    const totalCapacity = availableHalls.reduce((sum, h) => sum + h.capacity, 0);
    if (candidates.length > totalCapacity) {
      throw new UnprocessableEntityException(
        `Not enough available seats: ${candidates.length} candidate(s) but only ${totalCapacity} seat(s) available across eligible halls.`,
      );
    }

    const specialNeedsIds = new Set(dto.specialNeedsStudentIds ?? []);
    const specialNeedsStudents = candidates.filter((s) => specialNeedsIds.has(s.id));
    const regularStudents = candidates.filter((s) => !specialNeedsIds.has(s.id));
    const orderedRegular = dto.mixClasses ? this.interleaveByClass(regularStudents) : regularStudents;
    const orderedStudents = [...specialNeedsStudents, ...orderedRegular];

    const now = new Date();
    const newAllocations: ExamSeatAllocationEntity[] = [];
    let studentIndex = 0;
    let hallsUsed = 0;

    for (const hall of availableHalls) {
      if (studentIndex >= orderedStudents.length) break;
      const seats = await this.getSeatsInPriorityOrder(hall);
      let seatedInThisHall = 0;
      for (const seat of seats) {
        if (studentIndex >= orderedStudents.length) break;
        const student = orderedStudents[studentIndex];
        newAllocations.push(
          this.allocationRepo.create({
            examId,
            examHallId: hall.id,
            examSeatId: seat.id,
            studentId: student.id,
            specialNeeds: specialNeedsIds.has(student.id),
            allocatedAt: now,
          }),
        );
        studentIndex++;
        seatedInThisHall++;
      }
      if (seatedInThisHall > 0) hallsUsed++;
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const savedAllocations = await manager.save(ExamSeatAllocationEntity, newAllocations);
      const admitCards = savedAllocations.map((a) =>
        manager.create(AdmitCardEntity, { examSeatAllocationId: a.id, generatedAt: now }),
      );
      await manager.save(AdmitCardEntity, admitCards);
      return savedAllocations;
    });

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'allocate_seats',
      targetType: 'exam',
      targetId: examId,
    });

    await this.notifyAllocations(exam, saved);

    return {
      allocatedCount: saved.length,
      hallsUsed,
      specialNeedsPlaced: saved.filter((a) => a.specialNeeds).length,
    };
  }

  async listAllocations(examId: string): Promise<AllocationRow[]> {
    await this.getExamOrThrow(examId);
    const allocations = await this.allocationRepo.find({ where: { examId }, order: { allocatedAt: 'ASC' } });
    if (allocations.length === 0) return [];

    const [students, halls, seats] = await Promise.all([
      this.studentRepo.find({ where: { id: In(allocations.map((a) => a.studentId)) } }),
      this.hallRepo.find({ where: { id: In([...new Set(allocations.map((a) => a.examHallId))]) } }),
      this.seatRepo.find({ where: { id: In(allocations.map((a) => a.examSeatId)) } }),
    ]);
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const hallMap = new Map(halls.map((h) => [h.id, h]));
    const seatMap = new Map(seats.map((s) => [s.id, s]));

    return allocations.map((allocation) => {
      const student = studentMap.get(allocation.studentId);
      return {
        allocation,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        hallName: hallMap.get(allocation.examHallId)?.name ?? '-',
        seatLabel: seatMap.get(allocation.examSeatId)?.seatLabel ?? '-',
      };
    });
  }

  async overrideSeat(
    examId: string,
    allocationId: string,
    dto: OverrideSeatDto,
    actorStaffId: string,
    isFullyPrivileged: boolean,
    isSectionHead: boolean,
  ): Promise<ExamSeatAllocationEntity> {
    const exam = await this.getExamOrThrow(examId);
    if (!isFullyPrivileged) {
      await this.examService.assertSectionHeadCanActOnGrade(actorStaffId, isSectionHead, exam.gradeId);
    }

    const allocation = await this.allocationRepo.findOne({ where: { id: allocationId, examId } });
    if (!allocation) {
      throw new NotFoundException(`Allocation ${allocationId} not found for this exam.`);
    }
    const newSeat = await this.seatRepo.findOne({ where: { id: dto.examSeatId } });
    if (!newSeat) {
      throw new NotFoundException(`Exam seat ${dto.examSeatId} not found.`);
    }
    const conflict = await this.allocationRepo.findOne({ where: { examId, examSeatId: dto.examSeatId } });
    if (conflict && conflict.id !== allocationId) {
      throw new ConflictException('This seat is already taken for this exam.');
    }

    allocation.examSeatId = newSeat.id;
    allocation.examHallId = newSeat.examHallId;
    const saved = await this.allocationRepo.save(allocation);

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'manual_override',
      targetType: 'exam',
      targetId: examId,
    });

    await this.notifyAllocations(exam, [saved]);

    return saved;
  }

  async getMyAdmitCard(examId: string, studentId: string): Promise<AdmitCardView> {
    const exam = await this.getExamOrThrow(examId);
    const allocation = await this.allocationRepo.findOne({ where: { examId, studentId } });
    if (!allocation) {
      throw new NotFoundException('You have not been allocated a seat for this exam.');
    }
    return this.buildAdmitCardView(exam, allocation);
  }

  async getChildAdmitCard(examId: string, studentId: string, guardianId: string): Promise<AdmitCardView> {
    await this.assertGuardianLinkedToStudent(studentId, guardianId);
    return this.getMyAdmitCard(examId, studentId);
  }

  /** A student has no way to discover which exams they've been seated for otherwise (`GET
   * /exams` itself is staff-only) — this is the list of every exam this student currently has
   * an allocation for, newest first. */
  async getMyAdmitCards(studentId: string): Promise<AdmitCardView[]> {
    const allocations = await this.allocationRepo.find({ where: { studentId }, order: { allocatedAt: 'DESC' } });
    if (allocations.length === 0) return [];

    const exams = await this.examRepo.find({ where: { id: In([...new Set(allocations.map((a) => a.examId))]) } });
    const examMap = new Map(exams.map((e) => [e.id, e]));

    const views = await Promise.all(
      allocations.map((allocation) => {
        const exam = examMap.get(allocation.examId);
        return exam ? this.buildAdmitCardView(exam, allocation) : null;
      }),
    );
    return views.filter((v): v is AdmitCardView => v !== null);
  }

  async getChildAdmitCards(studentId: string, guardianId: string): Promise<AdmitCardView[]> {
    await this.assertGuardianLinkedToStudent(studentId, guardianId);
    return this.getMyAdmitCards(studentId);
  }

  private async assertGuardianLinkedToStudent(studentId: string, guardianId: string): Promise<void> {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: ['studentGuardians'],
    });
    const isLinked = student?.studentGuardians?.some((sg) => sg.guardianId === guardianId);
    if (!isLinked) {
      throw new NotFoundException('This student is not linked to your guardian account.');
    }
  }

  private async getExamOrThrow(examId: string): Promise<ExamEntity> {
    const exam = await this.examRepo.findOne({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException(`Exam ${examId} not found.`);
    }
    return exam;
  }

  private async buildAdmitCardView(exam: ExamEntity, allocation: ExamSeatAllocationEntity): Promise<AdmitCardView> {
    const admitCard = await this.admitCardRepo.findOne({ where: { examSeatAllocationId: allocation.id } });
    if (!admitCard) {
      throw new NotFoundException('Admit card not yet generated for this allocation.');
    }
    const [hall, seat] = await Promise.all([
      this.hallRepo.findOne({ where: { id: allocation.examHallId } }),
      this.seatRepo.findOne({ where: { id: allocation.examSeatId } }),
    ]);
    return {
      admitCard,
      allocation,
      exam,
      hallName: hall?.name ?? '-',
      seatLabel: seat?.seatLabel ?? '-',
    };
  }

  /** Only halls with no existing allocation for a *different* exam on the same date are
   * eligible — prevents double-booking a physical room on the same day, a real correctness gap
   * the literal AI prompt didn't call out. */
  private async findAvailableHalls(date: string, excludeExamId: string): Promise<ExamHallEntity[]> {
    const allHalls = await this.hallRepo.find({ order: { name: 'ASC' } });
    const sameDayExams = await this.examRepo.find({ where: { date, id: Not(excludeExamId) } });
    if (sameDayExams.length === 0) return allHalls;

    const busyAllocations = await this.allocationRepo.find({
      where: { examId: In(sameDayExams.map((e) => e.id)) },
    });
    const busyHallIds = new Set(busyAllocations.map((a) => a.examHallId));
    return allHalls.filter((h) => !busyHallIds.has(h.id));
  }

  /** Front row (rowNumber===1) and aisle seats (columnNumber 1 or columnCount) sort first —
   * naturally gives special-needs students (placed first in the overall student queue) front-
   * row/aisle seats, spilling to further rows' aisle seats before any student lands in a
   * "middle" seat, without needing separate special-case seat-picking logic. */
  private async getSeatsInPriorityOrder(hall: ExamHallEntity): Promise<ExamSeatEntity[]> {
    const seats = await this.seatRepo.find({ where: { examHallId: hall.id } });
    return seats.sort((a, b) => {
      const aPriority = a.rowNumber === 1 || a.columnNumber === 1 || a.columnNumber === hall.columnCount ? 0 : 1;
      const bPriority = b.rowNumber === 1 || b.columnNumber === 1 || b.columnNumber === hall.columnCount ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      if (a.rowNumber !== b.rowNumber) return a.rowNumber - b.rowNumber;
      return a.columnNumber - b.columnNumber;
    });
  }

  /** Round-robin across distinct classSectionIds so adjacent seats never come from the same
   * original class when alternatives exist. `students` is already sorted by (classSectionId,
   * lastName, firstName) from the caller's query. */
  private interleaveByClass(students: StudentEntity[]): StudentEntity[] {
    const groups = new Map<number, StudentEntity[]>();
    for (const student of students) {
      const list = groups.get(student.classSectionId) ?? [];
      list.push(student);
      groups.set(student.classSectionId, list);
    }
    const queues = [...groups.values()];
    const result: StudentEntity[] = [];
    let remaining = students.length;
    let i = 0;
    while (remaining > 0) {
      const queue = queues[i % queues.length];
      if (queue.length > 0) {
        result.push(queue.shift()!);
        remaining--;
      }
      i++;
    }
    return result;
  }

  private async notifyAllocations(exam: ExamEntity, allocations: ExamSeatAllocationEntity[]): Promise<void> {
    if (allocations.length === 0) return;

    const [students, halls, seats] = await Promise.all([
      this.studentRepo.find({
        where: { id: In(allocations.map((a) => a.studentId)) },
        relations: ['studentGuardians', 'studentGuardians.guardian'],
      }),
      this.hallRepo.find({ where: { id: In([...new Set(allocations.map((a) => a.examHallId))]) } }),
      this.seatRepo.find({ where: { id: In(allocations.map((a) => a.examSeatId)) } }),
    ]);
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const hallMap = new Map(halls.map((h) => [h.id, h]));
    const seatMap = new Map(seats.map((s) => [s.id, s]));

    const dispatches = allocations.flatMap((allocation) => {
      const student = studentMap.get(allocation.studentId);
      if (!student) return [];
      const hallName = hallMap.get(allocation.examHallId)?.name ?? 'TBA';
      const seatLabel = seatMap.get(allocation.examSeatId)?.seatLabel ?? 'TBA';
      const title = 'Exam Seat Assigned';
      const message = `${exam.name} on ${exam.date} at ${exam.startTime}. Hall: ${hallName}, Seat: ${seatLabel}.`;

      const guardians = student.studentGuardians?.map((sg) => sg.guardian).filter((g): g is GuardianEntity => !!g) ?? [];
      return [
        this.notificationService.createForStudent(student.id, title, message, 'exam_seat_assigned'),
        ...guardians.flatMap((guardian) => [
          this.notificationService.createForGuardian(guardian.id, title, message, 'exam_seat_assigned'),
          this.smsService.sendSms(guardian.phone, message),
          guardian.pushToken ? this.pushService.sendPush(guardian.pushToken, title, message) : Promise.resolve(),
        ]),
      ];
    });

    await Promise.allSettled(dispatches);
  }
}
