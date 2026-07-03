import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbsenceMarkedEvent } from '../../attendance/events/absence-marked.event';
import { StudentEntity } from '../../students/entities/student.entity';
import { ClassSectionEntity } from '../../students/entities/class-section.entity';
import { GuardianNotificationEntity } from '../entities/guardian-notification.entity';
import { SmsService } from '../sms/sms.service';
import { PushService } from '../push/push.service';

@Injectable()
export class AbsenceNotificationListener {
  private readonly logger = new Logger(AbsenceNotificationListener.name);

  constructor(
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly sectionRepo: Repository<ClassSectionEntity>,

    @InjectRepository(GuardianNotificationEntity)
    private readonly guardianNotifRepo: Repository<GuardianNotificationEntity>,

    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {}

  @OnEvent('attendance.absent_marked', { async: true })
  async handle(event: AbsenceMarkedEvent): Promise<void> {
    try {
      const [student, section] = await Promise.all([
        this.studentRepo.findOne({
          where: { id: event.studentId },
          relations: ['studentGuardians', 'studentGuardians.guardian'],
        }),
        this.sectionRepo.findOne({
          where: { id: event.classSectionId },
          relations: ['grade'],
        }),
      ]);

      if (!student || !section) {
        this.logger.warn(
          `AbsenceNotificationListener: student or section not found for event ${JSON.stringify(event)}`,
        );
        return;
      }

      const studentName = `${student.firstName} ${student.lastName}`;
      const sectionLabel = `${section.grade.name} – ${section.name} (${section.academicYear})`;
      const formattedDate = new Date(event.date + 'T00:00:00Z').toLocaleDateString('en-LK', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const title = 'Absence Alert';
      const message = `${studentName} was marked absent on ${formattedDate} — ${sectionLabel}.`;

      const guardians = student.studentGuardians.map((sg) => sg.guardian);

      await Promise.all(
        guardians.map(async (guardian) => {
          const tasks: Promise<unknown>[] = [
            this.smsService.sendSms(guardian.phone, message),
            this.guardianNotifRepo.save(
              this.guardianNotifRepo.create({
                guardianId: guardian.id,
                title,
                message,
                type: 'absence_alert',
                metadata: {
                  studentId: event.studentId,
                  studentName,
                  date: event.date,
                  classSectionId: event.classSectionId,
                  sectionLabel,
                  attendanceId: event.attendanceId,
                },
              }),
            ),
          ];

          if (guardian.pushToken) {
            tasks.push(this.pushService.sendPush(guardian.pushToken, title, message));
          }

          const labels = guardian.pushToken ? ['SMS', 'IN-APP', 'PUSH'] : ['SMS', 'IN-APP'];
          const results = await Promise.allSettled(tasks);
          results.forEach((result, idx) => {
            if (result.status === 'rejected') {
              this.logger.error(
                `AbsenceNotificationListener: ${labels[idx]} failed for guardian ${guardian.id}: ${result.reason}`,
              );
            }
          });
        }),
      );
    } catch (err) {
      this.logger.error(
        `AbsenceNotificationListener: unexpected error processing event ${JSON.stringify(event)}: ${err}`,
      );
    }
  }
}
