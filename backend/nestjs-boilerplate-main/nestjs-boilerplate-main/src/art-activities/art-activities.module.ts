import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtActivityEntity } from './entities/art-activity.entity';
import { ArtActivityStudentCheckEntity } from './entities/art-activity-student-check.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { ArtActivitiesService } from './services/art-activities.service';
import { ArtActivitiesController } from './controllers/art-activities.controller';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ArtActivityEntity,
      ArtActivityStudentCheckEntity,
      StudentEntity,
      ClassSectionEntity,
      TeacherSubjectClassRequirementEntity,
    ]),
    UsersModule,
    StaffModule,
  ],
  providers: [ArtActivitiesService],
  controllers: [ArtActivitiesController],
  exports: [ArtActivitiesService],
})
export class ArtActivitiesModule {}
