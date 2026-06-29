import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALStreamEntity } from './entities/al-stream.entity';
import { ALStreamSubjectEntity } from './entities/al-stream-subject.entity';
import { StudentSubjectEnrollmentEntity } from './entities/student-subject-enrollment.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ALStreamEntity,
      ALStreamSubjectEntity,
      StudentSubjectEnrollmentEntity,
      SubjectEntity,
      StudentEntity,
    ]),
  ],
  providers: [EnrollmentsService],
  controllers: [EnrollmentsController],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
