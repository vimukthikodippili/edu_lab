import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionActionEntity } from './entities/session-action.entity';
import { RecommendedActionService } from './recommended-action.service';
import { SessionActionController } from './session-action.controller';
import { ActionRuleModule } from '../action-rule/action-rule.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionActionEntity]),
    ActionRuleModule,
    AuditModule,
    UsersModule,
    StaffModule,
  ],
  providers: [RecommendedActionService],
  controllers: [SessionActionController],
  exports: [RecommendedActionService],
})
export class SessionActionModule {}
