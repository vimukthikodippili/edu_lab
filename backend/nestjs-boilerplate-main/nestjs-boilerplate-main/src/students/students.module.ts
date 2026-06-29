import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { StudentEntity } from './entities/student.entity';
import { GuardianEntity } from './entities/guardian.entity';
import { StudentGuardianEntity } from './entities/student-guardian.entity';
import { GradeEntity } from './entities/grade.entity';
import { ClassSectionEntity } from './entities/class-section.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentEntity,
      GuardianEntity,
      StudentGuardianEntity,
      GradeEntity,
      ClassSectionEntity,
      FileEntity,
    ]),
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
