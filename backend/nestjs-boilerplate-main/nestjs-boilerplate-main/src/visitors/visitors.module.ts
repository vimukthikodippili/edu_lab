import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorEntity } from './entities/visitor.entity';
import { VisitorLogEntity } from './entities/visitor-log.entity';
import { PreRegisteredVisitorEntity } from './entities/pre-registered-visitor.entity';
import { DailyVisitorSummaryEntity } from './entities/daily-visitor-summary.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { VisitorService } from './visitor.service';
import { PreRegisteredVisitorService } from './pre-registered-visitor.service';
import { VisitorController } from './visitor.controller';
import { PreRegisteredVisitorController } from './pre-registered-visitor.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitorEntity,
      VisitorLogEntity,
      PreRegisteredVisitorEntity,
      DailyVisitorSummaryEntity,
      UserEntity,
    ]),
    AuditModule,
    NotificationModule,
    UsersModule,
    StaffModule,
  ],
  providers: [VisitorService, PreRegisteredVisitorService],
  controllers: [VisitorController, PreRegisteredVisitorController],
})
export class VisitorsModule {}
