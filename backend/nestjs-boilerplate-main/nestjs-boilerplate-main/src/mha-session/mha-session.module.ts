import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MhaSessionEntity } from './entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { DisorderRegistryEntity } from '../disorder-registry/entities/disorder-registry.entity';
import { DomainResultEntity } from '../domain-result/entities/domain-result.entity';
import { MhaSessionService } from './mha-session.service';
import { MhaSessionController } from './mha-session.controller';
import { MhaConsentModule } from '../mha-consent/mha-consent.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { RiskSummaryModule } from '../risk-summary/risk-summary.module';
import { SessionActionModule } from '../session-action/session-action.module';
import { TopFindingsModule } from '../top-findings/top-findings.module';
import { MhaCaseloadModule } from '../mha-caseload/mha-caseload.module';
import { MhaHistoryModule } from '../mha-history/mha-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MhaSessionEntity, StudentEntity, DisorderRegistryEntity, DomainResultEntity]),
    MhaConsentModule,
    AuditModule,
    UsersModule,
    StaffModule,
    RiskSummaryModule,
    SessionActionModule,
    TopFindingsModule,
    MhaCaseloadModule,
    MhaHistoryModule,
  ],
  providers: [MhaSessionService],
  controllers: [MhaSessionController],
  exports: [MhaSessionService],
})
export class MhaSessionModule {}
