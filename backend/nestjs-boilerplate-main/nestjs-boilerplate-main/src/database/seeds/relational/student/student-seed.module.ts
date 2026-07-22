import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentSeedService } from './student-seed.service';
import { StudentEntity } from '../../../../students/entities/student.entity';
import { GuardianEntity } from '../../../../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../../../../students/entities/student-guardian.entity';
import { ClassSectionEntity } from '../../../../students/entities/class-section.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentEntity,
      GuardianEntity,
      StudentGuardianEntity,
      ClassSectionEntity,
    ]),
  ],
  providers: [StudentSeedService],
  exports: [StudentSeedService],
})
export class StudentSeedModule {}
