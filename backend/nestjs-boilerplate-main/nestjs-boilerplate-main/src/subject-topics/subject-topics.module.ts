import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectTopicEntity } from './entities/subject-topic.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { SubjectTopicsService } from './subject-topics.service';
import { SubjectTopicsController } from './subject-topics.controller';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubjectTopicEntity, TeacherSubjectClassRequirementEntity]),
    UsersModule,
    StaffModule,
  ],
  providers: [SubjectTopicsService],
  controllers: [SubjectTopicsController],
  exports: [SubjectTopicsService],
})
export class SubjectTopicsModule {}
