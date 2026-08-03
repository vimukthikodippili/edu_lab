import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParentFeedbackEntity } from './entities/parent-feedback.entity';
import { FeedbackResponseEntity } from './entities/feedback-response.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { ParentFeedbackService } from './parent-feedback.service';
import { ParentFeedbackController } from './parent-feedback.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParentFeedbackEntity,
      FeedbackResponseEntity,
      StudentGuardianEntity,
      GuardianEntity,
      UserEntity,
    ]),
    AuditModule,
    NotificationModule,
    UsersModule,
    StaffModule,
  ],
  providers: [ParentFeedbackService],
  controllers: [ParentFeedbackController],
})
export class ParentFeedbackModule {}
