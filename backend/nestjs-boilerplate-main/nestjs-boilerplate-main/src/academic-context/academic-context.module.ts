import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentEntity } from '../students/entities/student.entity';
import { AttendanceRecordEntity } from '../attendance/entities/attendance-record.entity';
import { StudentGradeTrendEntity } from '../grades/entities/student-grade-trend.entity';
import { AcademicPatternFlagEntity } from '../grades/entities/academic-pattern-flag.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { AcademicContextService } from './academic-context.service';
import { AcademicContextController } from './academic-context.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentEntity,
      AttendanceRecordEntity,
      StudentGradeTrendEntity,
      AcademicPatternFlagEntity,
      SubjectEntity,
    ]),
  ],
  providers: [AcademicContextService],
  controllers: [AcademicContextController],
  exports: [AcademicContextService],
})
export class AcademicContextModule {}
