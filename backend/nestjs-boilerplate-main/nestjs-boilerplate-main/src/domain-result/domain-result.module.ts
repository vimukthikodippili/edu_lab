import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainResultEntity } from './entities/domain-result.entity';
import { MhaSessionEntity } from '../mha-session/entities/mha-session.entity';
import { DisorderRegistryEntity } from '../disorder-registry/entities/disorder-registry.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { DomainResultService } from './domain-result.service';
import { DomainResultController } from './domain-result.controller';
import { DomainResultNoteCryptoService } from './domain-result-note-crypto.service';
import { SafetyFlagEscalationService } from './safety-flag-escalation.service';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { CounselorModule } from '../counselor/counselor.module';
import { NotificationModule } from '../notification/notification.module';
import { SafetyNotificationModule } from '../safety-notification/safety-notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DomainResultEntity,
      MhaSessionEntity,
      DisorderRegistryEntity,
      UserEntity,
    ]),
    AuditModule,
    UsersModule,
    StaffModule,
    CounselorModule,
    NotificationModule,
    SafetyNotificationModule,
  ],
  providers: [DomainResultService, DomainResultNoteCryptoService, SafetyFlagEscalationService],
  controllers: [DomainResultController],
  exports: [DomainResultService],
})
export class DomainResultModule {}
